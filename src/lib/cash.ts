import "server-only";
import { db } from "./db";

export type CashHeld = { staffId: string; name: string; amount: number; count: number };

/** Cash payments caretakers recorded that the owner has not yet confirmed receiving. */
export async function cashWithStaff(ownerId: string, staffId?: string): Promise<CashHeld[]> {
  const rows = await db.payment.groupBy({
    by: ["recordedByStaffId"],
    where: {
      method: "CASH",
      amount: { gt: 0 },
      handedOverAt: null,
      recordedByStaffId: staffId ?? { not: null },
      tenant: { ownerId },
    },
    _sum: { amount: true },
    _count: { _all: true },
  });
  if (!rows.length) return [];
  const staff = await db.staff.findMany({
    where: { ownerId, id: { in: rows.map((r) => r.recordedByStaffId!) } },
    select: { id: true, name: true },
  });
  const names = new Map(staff.map((s) => [s.id, s.name]));
  return rows
    .filter((r) => r.recordedByStaffId && names.has(r.recordedByStaffId) && (r._sum.amount ?? 0) > 0)
    .map((r) => ({ staffId: r.recordedByStaffId!, name: names.get(r.recordedByStaffId!)!, amount: r._sum.amount ?? 0, count: r._count._all }))
    .sort((a, b) => b.amount - a.amount);
}
