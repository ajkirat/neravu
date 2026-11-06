import { z } from "zod";
import { canonicalCategory } from "./format";

export type ReceiptItem = { name: string; quantity: number; amount: number };
export type ReceiptData = {
  isReceipt: boolean;
  vendor: string | null;
  date: string | null; // YYYY-MM-DD
  category: string;
  items: ReceiptItem[];
  total: number | null;
};

export const MAX_ITEMS = 60;

const rawSchema = z.object({
  is_receipt: z.boolean().optional(),
  vendor: z.string().nullish(),
  date: z.string().nullish(),
  category: z.string().nullish(),
  total: z.number().nullish(),
  items: z
    .array(z.object({ name: z.unknown(), quantity: z.unknown().optional(), amount: z.unknown() }))
    .nullish(),
});

const clean = (s: unknown, max: number) => (typeof s === "string" ? s.replace(/\s+/g, " ").trim().slice(0, max) : "");
const rupee = (n: unknown): number | null =>
  typeof n === "number" && Number.isFinite(n) && Math.abs(n) <= 10_000_000 ? Math.round(n) : null;

/** Accept a date only if it is real and plausible for a bill (not future, not older than ~14 months). */
export function sanitizeDate(raw: string | null | undefined, now: Date): string | null {
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const d = new Date(`${raw}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== raw) return null;
  const day = 24 * 3600 * 1000;
  if (d.getTime() > now.getTime() + day) return null;
  if (d.getTime() < now.getTime() - 430 * day) return null;
  return raw;
}

/**
 * Turn whatever the model returned into safe, bounded values. The model's output is untrusted:
 * names are length limited, amounts must be finite whole rupees, the category must be one we know.
 */
export function parseReceipt(input: unknown, now: Date = new Date()): ReceiptData {
  const parsed = rawSchema.safeParse(input);
  if (!parsed.success) return { isReceipt: false, vendor: null, date: null, category: "Other", items: [], total: null };
  const r = parsed.data;
  const items: ReceiptItem[] = [];
  for (const it of r.items ?? []) {
    const name = clean(it.name, 120);
    const amount = rupee(it.amount);
    if (!name || amount === null) continue;
    const q = typeof it.quantity === "number" && Number.isFinite(it.quantity) && it.quantity > 0 ? it.quantity : 1;
    items.push({ name, quantity: Math.round(Math.min(q, 100000) * 1000) / 1000, amount });
    if (items.length >= MAX_ITEMS) break;
  }
  const category = canonicalCategory(r.category);
  const total = rupee(r.total);
  return {
    isReceipt: r.is_receipt !== false && (items.length > 0 || total !== null),
    vendor: clean(r.vendor, 120) || null,
    date: sanitizeDate(r.date, now),
    category,
    items,
    total: total !== null && total > 0 ? total : null,
  };
}

export const sumItems = (items: { amount: number }[]) => items.reduce((s, i) => s + i.amount, 0);

/** The printed total disagrees with the items by more than a rupee: ask the owner to check. */
export const totalsMismatch = (items: { amount: number }[], billTotal: number | null) =>
  billTotal !== null && items.length > 0 && Math.abs(sumItems(items) - billTotal) > 1;
