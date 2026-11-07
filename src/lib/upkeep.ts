import { addDays, diffDays } from "./dates";

/** Kinds of servicing, so a long list stays easy to scan. */
export const SERVICE_CATEGORIES = ["WATER", "PEST", "HOUSEKEEPING", "KITCHEN", "APPLIANCE", "ELECTRICAL", "SAFETY", "BUILDING", "OTHER"] as const;
export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];
export const asServiceCategory = (c: unknown): ServiceCategory =>
  (SERVICE_CATEGORIES as readonly string[]).includes(String(c)) ? (c as ServiceCategory) : "OTHER";

/** Ready-made services: title key (job_*), group and how often (days). */
export const SERVICE_PRESETS: { key: string; category: ServiceCategory; every: number }[] = [
  { key: "job_TANK", category: "WATER", every: 90 },
  { key: "job_SUMP", category: "WATER", every: 180 },
  { key: "job_RO", category: "WATER", every: 90 },
  { key: "job_WATERTEST", category: "WATER", every: 180 },
  { key: "job_PEST", category: "PEST", every: 30 },
  { key: "job_TERMITE", category: "PEST", every: 365 },
  { key: "job_DEEPCLEAN", category: "HOUSEKEEPING", every: 30 },
  { key: "job_BEDSHEET", category: "HOUSEKEEPING", every: 7 },
  { key: "job_CURTAINS", category: "HOUSEKEEPING", every: 60 },
  { key: "job_MATTRESS", category: "HOUSEKEEPING", every: 90 },
  { key: "job_GAS", category: "KITCHEN", every: 20 },
  { key: "job_EXHAUST", category: "KITCHEN", every: 90 },
  { key: "job_AC", category: "APPLIANCE", every: 90 },
  { key: "job_GEYSER", category: "APPLIANCE", every: 180 },
  { key: "job_WASHER", category: "APPLIANCE", every: 90 },
  { key: "job_GENSET", category: "ELECTRICAL", every: 90 },
  { key: "job_WIRING", category: "ELECTRICAL", every: 180 },
  { key: "job_FIRE", category: "SAFETY", every: 365 },
  { key: "job_CCTV", category: "SAFETY", every: 90 },
  { key: "job_FIRSTAID", category: "SAFETY", every: 90 },
  { key: "job_LIFT", category: "BUILDING", every: 30 },
  { key: "job_TERRACE", category: "BUILDING", every: 180 },
];

/** The expense category a service's cost goes to (see EXPENSE_GROUPS). */
export function expenseCategoryFor(category: string, title = ""): string {
  if (category === "KITCHEN" && /gas|cylinder|lpg/i.test(title)) return "Cooking gas";
  if (category === "PEST" || category === "HOUSEKEEPING") return "Cleaning & housekeeping";
  if (category === "OTHER") return "Other";
  return "Repairs & maintenance";
}

export type DueState = "late" | "due" | "soon" | "later";

/** Where a service stands today: overdue, due today, inside its heads-up window, or later. */
export function dueState(nextDue: Date, remindDays: number, asOf: Date): { state: DueState; days: number } {
  const days = diffDays(nextDue, asOf);
  if (days < 0) return { state: "late", days };
  if (days === 0) return { state: "due", days };
  if (days <= Math.max(0, remindDays)) return { state: "soon", days };
  return { state: "later", days };
}

export const REMIND_CHOICES = [0, 1, 3, 7];

/** Ready-made checklists: title key, how often, item keys. */
export const CHECKLIST_PRESETS: { key: string; frequency: "DAILY" | "WEEKLY"; items: string[] }[] = [
  { key: "ck_DAILY", frequency: "DAILY", items: ["cki_bathrooms", "cki_common", "cki_garbage", "cki_kitchen", "cki_water", "cki_lights", "cki_gate"] },
  { key: "ck_KITCHEN", frequency: "DAILY", items: ["cki_veg", "cki_utensils", "cki_gasoff", "cki_fridge", "cki_kfloor"] },
  { key: "ck_WEEKLY", frequency: "WEEKLY", items: ["cki_tank", "cki_ro", "cki_extinguisher", "cki_leaks", "cki_fans", "cki_washer", "cki_drains"] },
];

/** The day a checklist's tick-box belongs to: today for daily lists, the Monday of this week for weekly ones. */
export function periodFor(frequency: string, day: Date): Date {
  if (frequency !== "WEEKLY") return day;
  const dow = day.getUTCDay(); // 0 = Sunday
  return addDays(day, -((dow + 6) % 7));
}

/** Done, part done or missed, for the small history dots. */
export function runState(doneItems: string[] | undefined, items: string[]): "done" | "part" | "missed" {
  const n = (doneItems ?? []).filter((d) => items.includes(d)).length;
  return n === 0 ? "missed" : n >= items.length ? "done" : "part";
}

export const ASSET_KINDS = ["RO", "GEYSER", "AC", "FRIDGE", "WASHER", "PUMP", "INVERTER", "GENSET", "EXTINGUISHER", "CCTV", "LIFT", "OTHER"] as const;
export const asAssetKind = (k: unknown) => ((ASSET_KINDS as readonly string[]).includes(String(k)) ? String(k) : "OTHER");

/** Warranty or AMC ending within `within` days (and not ended more than a week ago): worth a reminder. */
export function assetAlerts(a: { warrantyUntil: Date | null; amcUntil: Date | null }, asOf: Date, within = 30): { kind: "warranty" | "amc"; days: number }[] {
  const out: { kind: "warranty" | "amc"; days: number }[] = [];
  for (const [kind, d] of [["warranty", a.warrantyUntil], ["amc", a.amcUntil]] as const) {
    if (!d) continue;
    const days = diffDays(d, asOf);
    if (days <= within && days >= -7) out.push({ kind, days });
  }
  return out;
}

/** A ready WhatsApp message to the service person. */
export const vendorMessage = (o: { vendor: string | null; service: string; pg: string; date: string }) =>
  `Hi${o.vendor ? ` ${o.vendor}` : ""}, ${o.service} at ${o.pg} is due on ${o.date}. Please tell me a time that suits you. Thank you!`;
