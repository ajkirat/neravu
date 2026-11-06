import "server-only";
import { db } from "./db";
import { pickPayCode } from "./paycode";

/** The tenant's paise tag, giving them one if they have none yet. Codes are unique among people staying. */
export async function ensurePayCode(ownerId: string, tenantId: string): Promise<number | null> {
  const me = await db.tenant.findUnique({ where: { id: tenantId }, select: { payCode: true } });
  if (me?.payCode) return me.payCode;
  const others = await db.tenant.findMany({
    where: { ownerId, status: { in: ["ACTIVE", "NOTICE"] }, id: { not: tenantId } },
    select: { payCode: true },
  });
  const code = pickPayCode(others.map((o) => o.payCode));
  if (code) await db.tenant.update({ where: { id: tenantId }, data: { payCode: code } });
  return code;
}
