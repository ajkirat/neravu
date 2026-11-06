import "server-only";
import { db } from "./db";
import { addDays } from "./dates";
import { SIMILAR_BITS, hamming, vendorKey } from "./image-hash";

export type DuplicateReason = "SAME_PHOTO" | "SIMILAR_PHOTO" | "SAME_DETAILS";
export type Duplicate = { expenseId: string; spentOn: Date; amount: number; vendor: string | null; reason: DuplicateReason };

/**
 * Has this bill already been added? Strict on purpose; the person can still save anyway.
 * 1. exact same stored photo  2. near-identical photo (re-sent / re-saved)  3. same shop + same amount within a day.
 */
export async function findDuplicate(
  ownerId: string,
  bill: { sha256?: string | null; phash?: string | null; amount?: number | null; vendor?: string | null; spentOn?: Date | null },
): Promise<Duplicate | null> {
  const pick = (e: { id: string; spentOn: Date; amount: number; vendor: string | null }, reason: DuplicateReason): Duplicate => ({
    expenseId: e.id,
    spentOn: e.spentOn,
    amount: e.amount,
    vendor: e.vendor,
    reason,
  });
  if (bill.sha256) {
    const r = await db.expenseReceipt.findFirst({ where: { sha256: bill.sha256, expense: { ownerId } }, include: { expense: true } });
    if (r) return pick(r.expense, "SAME_PHOTO");
  }
  if (bill.phash) {
    const recent = await db.expenseReceipt.findMany({
      where: { phash: { not: null }, expense: { ownerId }, createdAt: { gte: addDays(new Date(), -400) } },
      select: { phash: true, expense: { select: { id: true, spentOn: true, amount: true, vendor: true } } },
    });
    const near = recent
      .map((r) => ({ r, d: hamming(r.phash!, bill.phash!) }))
      .filter((x) => x.d <= SIMILAR_BITS)
      .sort((a, b) => a.d - b.d)[0];
    if (near) return pick(near.r.expense, "SIMILAR_PHOTO");
  }
  const vk = vendorKey(bill.vendor);
  if (bill.amount && bill.amount > 0 && vk && bill.spentOn) {
    const same = await db.expense.findMany({
      where: { ownerId, amount: bill.amount, spentOn: { gte: addDays(bill.spentOn, -1), lte: addDays(bill.spentOn, 1) } },
      select: { id: true, spentOn: true, amount: true, vendor: true },
    });
    const hit = same.find((e) => vendorKey(e.vendor) === vk);
    if (hit) return pick(hit, "SAME_DETAILS");
  }
  return null;
}
