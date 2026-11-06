import { localeFor, makeT, type Lang, type TFn, type MsgKey } from "./i18n";
import { messages } from "./i18n/messages";

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function rupees(n: number): string {
  return inr.format(n);
}

const dateFmts = new Map<Lang, Intl.DateTimeFormat>();
const monthFmts = new Map<Lang, Intl.DateTimeFormat>();
const fmtFor = (cache: Map<Lang, Intl.DateTimeFormat>, lang: Lang, opts: Intl.DateTimeFormatOptions) => {
  let f = cache.get(lang);
  if (!f) cache.set(lang, (f = new Intl.DateTimeFormat(localeFor(lang), { ...opts, timeZone: "UTC" })));
  return f;
};

export function fmtDate(d: Date | null | undefined, lang: Lang = "en"): string {
  return d ? fmtFor(dateFmts, lang, { day: "numeric", month: "short", year: "numeric" }).format(d) : "—";
}

export function fmtPeriod(period: string, lang: Lang = "en"): string {
  const [y, m] = period.split("-").map(Number);
  return fmtFor(monthFmts, lang, { month: "long", year: "numeric" }).format(new Date(Date.UTC(y, m - 1, 1)));
}

export const PAYMENT_METHODS = ["UPI", "CASH", "BANK", "CARD", "OTHER"] as const;
export const CHARGE_TYPES = ["ELECTRICITY", "MAINTENANCE", "OTHER"] as const;
export const EXPENSE_CATEGORIES = [
  "Electricity",
  "Water",
  "Groceries",
  "Staff salary",
  "Maintenance",
  "Internet",
  "Rent / lease",
  "Cleaning",
  "Other",
] as const;
export const ID_TYPES = ["Aadhaar", "PAN", "Passport", "Driving licence", "Voter ID", "Other"];

export const chargeLabel: Record<string, string> = {
  RENT: "Rent",
  DEPOSIT: "Security deposit",
  ELECTRICITY: "Electricity",
  MAINTENANCE: "Maintenance",
  OTHER: "Other",
};

export const methodLabel: Record<string, string> = {
  UPI: "UPI",
  CASH: "Cash",
  BANK: "Bank transfer",
  CARD: "Card",
  OTHER: "Other",
  REFUND: "Refund",
};

/** Digits-only Indian mobile number for wa.me links (adds 91 for 10-digit numbers). */
export function whatsappNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 10 ? `91${digits}` : digits;
}

export function bedLabels(count: number): string[] {
  return Array.from({ length: count }, (_, i) => String.fromCharCode(65 + i));
}

export const categoryText = (t: TFn, c: string): string => (`cat_${c}` in messages ? t(`cat_${c}` as MsgKey) : c);

export const chargeText = (t: TFn, type: string): string =>
  `charge_${type}` in messages ? t(`charge_${type}` as MsgKey) : type;
export const methodText = (t: TFn, m: string): string => (`method_${m}` in messages ? t(`method_${m}` as MsgKey) : m);

/** WhatsApp click-to-chat link with a polite, pre-filled rent reminder in the tenant's language. */
export function reminderLink(opts: {
  phone: string;
  tenantName: string;
  amount: number;
  propertyName: string;
  since?: Date | null;
  payUrl?: string;
  lang?: Lang;
}): string {
  const t = makeT(opts.lang ?? "en");
  const first = opts.tenantName.split(" ")[0];
  const since = opts.since ? t("rmSince", { date: fmtDate(opts.since, opts.lang) }) : "";
  const text =
    t("rmHello", { name: first, pg: opts.propertyName, amt: rupees(opts.amount), since }) +
    (opts.payUrl ? t("rmPayOnline", { url: opts.payUrl }) : "") +
    t("rmThanks");
  return `https://wa.me/${whatsappNumber(opts.phone)}?text=${encodeURIComponent(text)}`;
}

/** WhatsApp welcome message for a newly added tenant: how to pay, who to call, house rules. */
export function welcomeLink(opts: {
  phone: string;
  tenantName: string;
  propertyName: string;
  ownerPhone?: string | null;
  rules?: string | null;
  payUrl?: string;
  lang?: Lang;
}): string {
  const t = makeT(opts.lang ?? "en");
  const text =
    t("welHello", { name: opts.tenantName.split(" ")[0], pg: opts.propertyName }) +
    (opts.payUrl ? t("welPay", { url: opts.payUrl }) : "") +
    (opts.ownerPhone ? t("welCall", { phone: opts.ownerPhone }) : "") +
    (opts.rules ? t("welRules", { rules: opts.rules }) : "");
  return `https://wa.me/${whatsappNumber(opts.phone)}?text=${encodeURIComponent(text)}`;
}

/** WhatsApp click-to-chat receipt, for when automatic receipts are not connected. */
export function receiptLink(opts: { phone: string; tenantName: string; amount: number; propertyName: string; paidOn: Date; method: string; no: number; outstanding: number; lang?: Lang }): string {
  const t = makeT(opts.lang ?? "en");
  const text = t("rcptWaText", {
    pg: opts.propertyName,
    amt: rupees(opts.amount),
    name: opts.tenantName,
    when: `${fmtDate(opts.paidOn, opts.lang)} (${methodText(t, opts.method)}, #${opts.no})`,
    balance: opts.outstanding > 0 ? t("rcptStillDue", { amt: rupees(opts.outstanding) }) : t("rcptAllClear"),
  });
  return `https://wa.me/${whatsappNumber(opts.phone)}?text=${encodeURIComponent(text)}`;
}
