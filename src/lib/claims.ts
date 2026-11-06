import "server-only";
import { db } from "./db";

/** A payment was recorded for this tenant: any "I've paid" waiting for the owner is settled by it. */
export async function closePendingClaims(tenantId: string, paymentId: number | null, by: string) {
  await db.paymentClaim.updateMany({
    where: { tenantId, status: "PENDING" },
    data: { status: "CONFIRMED", paymentId, resolvedBy: by, resolvedAt: new Date() },
  });
  await db.tenant.update({ where: { id: tenantId }, data: { payClaimedAt: null } });
}

/** UTRs are 12 digits; accept what people type (spaces, dashes) and keep only a sane value. */
export function cleanUtr(raw: string): string | null {
  const d = raw.replace(/[\s-]/g, "");
  return /^[A-Za-z0-9]{6,30}$/.test(d) ? d : null;
}
