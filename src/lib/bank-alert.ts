// Reading bank credit alerts (Option C). Pure: no database, no network. The email's authenticity (DKIM)
// is checked separately; this only reads the words.

/** Root domains whose signed emails we accept as bank alerts. Extend with BANK_EMAIL_DOMAINS. */
export const BANK_DOMAINS = [
  "sbi.co.in", "hdfcbank.net", "hdfcbank.com", "icicibank.com", "axisbank.com", "kotak.com", "canarabank.com",
  "canarabank.in", "unionbankofindia.co.in", "unionbankofindia.bank.in", "bankofbaroda.co.in", "bankofbaroda.com", "pnb.co.in", "pnb.bank.in",
  "idfcfirstbank.com", "indusind.com", "yesbank.in", "federalbank.co.in", "aubank.in", "kvb.co.in", "bankofindia.co.in",
  "indianbank.co.in", "iob.in", "centralbankofindia.co.in", "ucobank.com", "rblbank.com", "karnatakabank.com", "idbibank.com",
  "csb.co.in", "dcbbank.com", "southindianbank.com", "equitasbank.com", "ujjivansfb.in", "paytmbank.com", "airtel.in", "jio.com",
  "sbi.bank.in", "hdfc.bank.in", "icici.bank.in", "axis.bank.in", "kotak.bank.in",
];

export function isBankDomain(domain: string, extra: string[] = []): boolean {
  const d = domain.trim().toLowerCase().replace(/\.$/, "");
  return [...BANK_DOMAINS, ...extra].some((root) => d === root || d.endsWith(`.${root}`));
}

export type CreditAlert = { amountPaise: number; utr: string | null; payer: string | null; last4: string | null };

const AMOUNT = /(?:₹|rs\.?|inr)\s*([0-9][0-9,]*(?:\.\d{1,2})?)/gi;

/**
 * Find a UPI / IMPS / NEFT credit in an alert. Returns null for debits, OTPs, statements and anything
 * that does not clearly say money came in.
 */
export function readCreditAlert(text: string): CreditAlert | null {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return null;
  const lower = t.toLowerCase();
  const credited = /\b(credited|received|deposited|credit of|has been credited|is credited)\b/.test(lower);
  const debited = /\b(debited|withdrawn|spent|debit of|deducted|sent to)\b/.test(lower);
  if (!credited || (debited && lower.indexOf("debit") < lower.indexOf("credit"))) return null;
  if (/\b(otp|one time password)\b/.test(lower)) return null;

  // The amount closest to the word "credited" is the one that came in (alerts also print balances).
  const at = lower.search(/credited|received|deposited|credit of/);
  let best: { v: number; dist: number } | null = null;
  for (const m of t.matchAll(AMOUNT)) {
    const v = Number(m[1].replace(/,/g, ""));
    if (!Number.isFinite(v) || v <= 0 || v > 10_000_000) continue;
    // Skip "Avl Bal", "balance" amounts.
    const before = lower.slice(Math.max(0, (m.index ?? 0) - 25), m.index ?? 0);
    if (/(bal(ance)?|avl|available)\.?\s*(is|:|-|of)?\s*$/.test(before)) continue;
    const dist = Math.abs((m.index ?? 0) - at);
    if (!best || dist < best.dist) best = { v, dist };
  }
  if (!best) return null;
  const amountPaise = Math.round(best.v * 100);

  const utr =
    /\b(?:upi\s*(?:ref|reference|txn|transaction)?\.?\s*(?:no\.?|number|id)?|utr\s*(?:no\.?|number)?|rrn|ref\.?\s*(?:no\.?|number)?|imps\s*ref\s*no\.?)\s*[:#-]?\s*([0-9]{10,16})\b/i.exec(t)?.[1] ??
    /\b([0-9]{12})\b/.exec(t)?.[1] ??
    null;
  const payer = /\b(?:from|by|vpa)\s*[:-]?\s*([a-z0-9._-]{2,64}@[a-z][a-z0-9]{1,30})\b/i.exec(t)?.[1] ?? null;
  const last4 = /\b(?:a\/c|ac|acct|account)(?:\s*no\.?)?\s*(?:number\s*)?[:\s]*(?:[x*]+|ending\s*(?:with)?\s*)?\s*([0-9]{4})\b/i.exec(t)?.[1] ?? null;
  return { amountPaise, utr, payer, last4 };
}

/** Gmail's "confirm you want to forward" email: return its confirmation link or code for the owner. */
export function readGmailForwarding(subject: string, text: string): string | null {
  if (!/forwarding confirmation/i.test(subject) && !/forwarding confirmation/i.test(text)) return null;
  const link = /https:\/\/mail(?:-settings)?\.google\.com\/mail\/[^\s"<>]+/i.exec(text)?.[0];
  const code = /confirmation code:\s*([0-9]{6,12})/i.exec(text)?.[1];
  return link ?? (code ? `Code: ${code}` : null);
}

/** Which tenant does a credit belong to? Only an unambiguous paise tag counts. */
export function matchCredit<T extends { id: string; payCode: number | null }>(amountPaise: number, tenants: T[]): T | null {
  const paise = amountPaise % 100;
  if (paise === 0) return null;
  const hits = tenants.filter((t) => t.payCode === paise);
  return hits.length === 1 ? hits[0] : null;
}
