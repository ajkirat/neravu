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
// Expense categories: few, and each one a cost you would look at on its own (diesel is not electricity,
// groceries are not daily fresh food). The stored value is the English name. To retire a category, add
// it to CATEGORY_MERGED (and move old rows with a migration) instead of just deleting it.
export const EXPENSE_GROUPS = [
  { key: "bills", cats: ["Electricity", "Diesel (generator)", "Cooking gas", "Water", "Internet & TV"] },
  { key: "food", cats: ["Groceries", "Daily fresh", "Food from outside"] },
  { key: "building", cats: ["Staff salary", "Rent / lease", "Repairs & maintenance", "Furniture & bedding", "Cleaning & housekeeping"] },
  { key: "other", cats: ["Other"] },
] as const;
export const EXPENSE_CATEGORIES = EXPENSE_GROUPS.flatMap((g) => g.cats);

/** Categories that were merged into another one. Old expenses, bills waiting for Yes/No, etc. are read through this. */
export const CATEGORY_MERGED: Record<string, string> = {
  "Water tanker": "Water",
  "Drinking water cans": "Water",
  "Vegetables & fruits": "Daily fresh",
  "Milk & dairy": "Daily fresh",
  "Meat, fish & eggs": "Daily fresh",
  Internet: "Internet & TV",
  "TV / DTH": "Internet & TV",
  Maintenance: "Repairs & maintenance",
  Plumbing: "Repairs & maintenance",
  "Electrical repairs": "Repairs & maintenance",
  "Appliance repair": "Repairs & maintenance",
  "Painting & civil work": "Repairs & maintenance",
  "Furniture & fittings": "Furniture & bedding",
  "Bedding & linen": "Furniture & bedding",
  Cleaning: "Cleaning & housekeeping",
  "Cleaning supplies": "Cleaning & housekeeping",
  Laundry: "Cleaning & housekeeping",
  "Pest control": "Cleaning & housekeeping",
  "Garbage collection": "Cleaning & housekeeping",
  "Security guard": "Staff salary",
  "Property tax & licences": "Other",
  "Bank charges": "Other",
  Advertising: "Other",
  Transport: "Other",
  "Stationery & printing": "Other",
  "Medical / first aid": "Other",
};

/** Today's category for any stored or read value; anything unknown becomes "Other". */
export function canonicalCategory(c: string | null | undefined): string {
  if (!c) return "Other";
  if ((EXPENSE_CATEGORIES as readonly string[]).includes(c)) return c;
  return CATEGORY_MERGED[c] ?? "Other";
}

/**
 * Extra words people type when searching for a category: everyday English, and Kannada / Telugu words
 * written in English letters. The category's own name in the chosen language is always searched too.
 * Words of merged categories are kept, so "tanker" still finds Water and "plumber" finds Repairs.
 */
export const CATEGORY_KEYWORDS: Record<string, string> = {
  Electricity: "current power bescom eb bill vidyut karent",
  "Diesel (generator)": "dg genset generator fuel petrol bunk",
  "Cooking gas": "lpg cylinder gas bharat indane hp",
  Water: "bwssb water bill neeru neellu tanker borewell lorry can cans bisleri 20 litre drinking",
  "Internet & TV": "wifi broadband jio airtel act net tv dish tata play cable dth recharge",
  Groceries: "kirana dinasi provisions rice oil dal atta sugar akki enne bele biyyam nune pappu",
  "Daily fresh": "vegetables veg tarakari kooragayalu fruits hannu pandlu onion tomato milk curd haalu mosaru paalu perugu nandini dairy paneer chicken mutton fish egg eggs motte gudlu meat",
  "Food from outside": "hotel restaurant cafe darshini tiffin meals parcel swiggy zomato tea coffee snacks oota bhojanam",
  "Staff salary": "salary sambala jeetham wages cook helper watchman guard security",
  "Rent / lease": "rent lease badige adde owner",
  "Repairs & maintenance": "repair maintenance plumber plumbing tap pipe leak nalli kulai electrician wiring fan light switch mcb fridge geyser washing machine ac ro purifier service paint painting mason cement tiles civil",
  "Furniture & bedding": "furniture cot bed mattress table chair cupboard almirah bedsheet pillow blanket cover",
  "Cleaning & housekeeping": "cleaning housekeeping sweeping mopping phenyl harpic soap broom mop detergent laundry dhobi washing ironing pest cockroach rat termite mosquito garbage waste kasa chetta",
  Other: "other misc medicine medical tablet auto cab taxi ola uber travel xerox print stationery ads",
};

/** Does this category match what was typed? Every word typed must appear in its name, English name or keywords. */
export function categoryMatches(query: string, value: string, label: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = `${label} ${value} ${CATEGORY_KEYWORDS[value] ?? ""}`.toLowerCase();
  return words.every((w) => hay.includes(w));
}
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

export const categoryText = (t: TFn, c: string): string => {
  const k = canonicalCategory(c);
  return `cat_${k}` in messages ? t(`cat_${k}` as MsgKey) : k;
};
/** Examples shown in the Notes box for a category that covers several kinds of cost; null if it has none. */
export const categoryNoteHint = (t: TFn, c: string): string | null =>
  `catnote_${c}` in messages ? t(`catnote_${c}` as MsgKey) : null;

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

/**
 * Who put this expense in. Only the owner or one of their caretakers can add one, so an expense with no
 * caretaker on it was added by the owner. This covers old expenses too, which never stored the owner's name.
 */
export const addedByText = (t: TFn, e: { addedByStaffId: string | null; addedByName: string | null }, ownerName: string): string =>
  e.addedByStaffId ? t("addedByStaff", { name: e.addedByName ?? "?" }) : t("addedByOwner", { name: ownerName });
