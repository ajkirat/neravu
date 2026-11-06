import "server-only";
import { db } from "./db";
import { duePeriods, summarizeLedger, type LedgerSummary } from "./billing";
import { fmtPeriod } from "./format";
import { today } from "./dates";

/**
 * Make sure every rent month that has fallen due has a RENT charge. Called on
 * page loads, so dues stay current without a background job.
 */
export async function syncRentCharges(ownerId: string, tenantId?: string) {
  const asOf = today();
  const tenants = await db.tenant.findMany({
    where: tenantId
      ? { ownerId, id: tenantId }
      : { ownerId, status: { in: ["ACTIVE", "NOTICE"] } },
    select: {
      id: true,
      moveInDate: true,
      billFrom: true,
      moveOutDate: true,
      rentDueDay: true,
      monthlyRent: true,
      charges: { where: { type: "RENT" }, select: { period: true } },
    },
  });
  const rows: {
    tenantId: string;
    type: string;
    period: string;
    description: string;
    amount: number;
    dueDate: Date;
  }[] = [];
  for (const t of tenants) {
    const have = new Set(t.charges.map((c) => c.period));
    for (const p of duePeriods({
      // Imported tenants: months before billFrom came in as one opening balance.
      moveIn: t.billFrom ?? t.moveInDate,
      moveOut: t.moveOutDate,
      dueDay: t.rentDueDay,
      asOf,
    })) {
      if (have.has(p.period)) continue;
      rows.push({
        tenantId: t.id,
        type: "RENT",
        period: p.period,
        description: `Rent for ${fmtPeriod(p.period)}`,
        amount: t.monthlyRent,
        dueDate: p.dueDate,
      });
    }
  }
  if (rows.length) await db.charge.createMany({ data: rows });
}

export type TenantBalance = LedgerSummary & { tenantId: string };

/** Balance summary for each of the owner's tenants (optionally filtered). */
export async function tenantBalances(
  ownerId: string,
  where: { status?: { in: string[] }; id?: string; propertyId?: string } = {},
): Promise<Map<string, TenantBalance>> {
  const asOf = today();
  const tenants = await db.tenant.findMany({
    where: { ownerId, ...where },
    select: {
      id: true,
      charges: { select: { amount: true, dueDate: true } },
      payments: { select: { amount: true } },
    },
  });
  return new Map(
    tenants.map((t) => [
      t.id,
      { tenantId: t.id, ...summarizeLedger(t.charges, t.payments, asOf) },
    ]),
  );
}
