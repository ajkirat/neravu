import { createHash } from "node:crypto";
import { authenticate } from "mailauth";
import { simpleParser } from "mailparser";
import { isBankDomain } from "./bank-alert";

export type CheckedEmail = {
  /** Domain whose DKIM signature passed, if any. */
  signedBy: string | null;
  fromAddress: string;
  subject: string;
  text: string;
  hash: string;
};

type Resolver = (name: string, rr: string) => Promise<string[][] | string[]>;

/** Parse a raw email and check its DKIM signatures. The resolver is only replaced in tests. */
export async function checkEmail(raw: string, resolver?: Resolver): Promise<CheckedEmail> {
  const auth = await authenticate(raw, { trustReceived: false, ...(resolver ? { resolver } : {}) } as Parameters<typeof authenticate>[1]);
  const passed = (auth.dkim?.results ?? []).filter((r) => r.status?.result === "pass").map((r) => (r.signingDomain ?? "").toLowerCase());
  const parsed = await simpleParser(raw);
  const fromAddress = (parsed.from?.value?.[0]?.address ?? "").toLowerCase();
  const fromDomain = fromAddress.split("@")[1] ?? "";
  // Prefer a signature from the same organisation as the From address.
  const aligned = passed.find((d) => fromDomain === d || fromDomain.endsWith(`.${d}`) || d.endsWith(`.${fromDomain}`));
  const text = (parsed.text || (typeof parsed.html === "string" ? parsed.html.replace(/<[^>]+>/g, " ") : "")).slice(0, 20_000);
  const hash = createHash("sha256").update(parsed.messageId || raw).digest("hex");
  return { signedBy: aligned ?? null, fromAddress, subject: parsed.subject ?? "", text, hash };
}

/** A real bank alert: signed by a bank domain that matches the sender. */
export function isGenuineBankEmail(e: CheckedEmail, extraDomains: string[] = []): boolean {
  return !!e.signedBy && isBankDomain(e.signedBy, extraDomains) && isBankDomain(e.fromAddress.split("@")[1] ?? "", extraDomains);
}

/** Gmail's forwarding confirmation, genuinely from Google. */
export function isGoogleEmail(e: CheckedEmail): boolean {
  return !!e.signedBy && (e.signedBy === "google.com" || e.signedBy.endsWith(".google.com")) && e.fromAddress.endsWith("@google.com");
}
