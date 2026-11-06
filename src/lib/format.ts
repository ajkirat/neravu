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
// Expense categories, grouped so the list is easy to scan. The stored value is the English name, so an
// existing name must never be renamed (old expenses use it); add new ones freely. Keep them distinct:
// diesel for the generator is not electricity, cooking gas is not diesel.
export const EXPENSE_GROUPS = [
  { key: "power", cats: ["Electricity", "Diesel (generator)", "Cooking gas", "Water", "Water tanker", "Internet", "TV / DTH"] },
  { key: "food", cats: ["Groceries", "Vegetables & fruits", "Milk & dairy", "Meat, fish & eggs", "Drinking water cans", "Food from outside"] },
  { key: "people", cats: ["Staff salary", "Security guard"] },
  { key: "repairs", cats: ["Maintenance", "Plumbing", "Electrical repairs", "Appliance repair", "Painting & civil work", "Furniture & fittings"] },
  { key: "upkeep", cats: ["Cleaning", "Cleaning supplies", "Laundry", "Bedding & linen", "Pest control", "Garbage collection"] },
  { key: "property", cats: ["Rent / lease", "Property tax & licences", "Bank charges"] },
  { key: "other", cats: ["Advertising", "Transport", "Stationery & printing", "Medical / first aid", "Other"] },
] as const;
export const EXPENSE_CATEGORIES = EXPENSE_GROUPS.flatMap((g) => g.cats);

/**
 * Extra words people type when searching for a category: everyday English, and Kannada / Telugu words
 * written in English letters. The category's own name in the chosen language is always searched too.
 */
export const CATEGORY_KEYWORDS: Record<string, string> = {
  Electricity: "current power bescom eb bill vidyut karent",
  "Diesel (generator)": "dg genset generator fuel petrol bunk",
  "Cooking gas": "lpg cylinder gas bharat indane hp",
  Water: "bwssb water bill neeru neellu",
  "Water tanker": "tanker borewell lorry",
  Internet: "wifi broadband jio airtel act net",
  "TV / DTH": "tv dish tata play cable recharge",
  Groceries: "kirana dinasi kirana-saman provisions rice oil dal atta sugar",
  "Vegetables & fruits": "vegetables veg tarakari kooragayalu fruits hannu pandlu onion tomato",
  "Milk & dairy": "milk curd haalu mosaru paalu perugu nandini dairy paneer",
  "Meat, fish & eggs": "chicken mutton fish egg motte gudlu meat",
  "Drinking water cans": "can bisleri 20 litre drinking",
  "Food from outside": "hotel restaurant cafe darshini tiffin meals parcel swiggy zomato tea coffee snacks oota bhojanam",
  "Staff salary": "salary sambala jeetham wages cook helper",
  "Security guard": "watchman guard security",
  Maintenance: "repair general maintenance",
  Plumbing: "plumber tap pipe leak nalli kulai",
  "Electrical repairs": "electrician wiring fan light switch mcb",
  "Appliance repair": "fridge geyser washing machine ac ro purifier service",
  "Painting & civil work": "paint mason cement tiles civil",
  "Furniture & fittings": "cot bed mattress table chair cupboard almirah",
  Cleaning: "housekeeping sweeping mopping cleaning lady",
  "Cleaning supplies": "phenyl harpic soap broom mop detergent",
  Laundry: "dhobi washing ironing",
  "Bedding & linen": "bedsheet pillow blanket mattress cover",
  "Pest control": "cockroach rat termite mosquito",
  "Garbage collection": "garbage waste kasa chetta",
  "Rent / lease": "rent lease badige adde owner",
  "Property tax & licences": "tax bbmp ghmc licence trade license",
  "Bank charges": "bank charges fee gst interest",
  Advertising: "ads olx nobroker banner pamphlet",
  Transport: "auto cab taxi ola uber bus petrol travel",
  "Stationery & printing": "pen paper xerox print register",
  "Medical / first aid": "medicine medical tablet first aid doctor",
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

/**
 * Who put this expense in. Only the owner or one of their caretakers can add one, so an expense with no
 * caretaker on it was added by the owner. This covers old expenses too, which never stored the owner's name.
 */
export const addedByText = (t: TFn, e: { addedByStaffId: string | null; addedByName: string | null }, ownerName: string): string =>
  e.addedByStaffId ? t("addedByStaff", { name: e.addedByName ?? "?" }) : t("addedByOwner", { name: ownerName });
