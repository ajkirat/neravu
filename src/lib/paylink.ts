import "server-only";
import { randomBytes } from "node:crypto";
import { db } from "./db";

const newToken = () => randomBytes(16).toString("hex");

/** Make sure each tenant has a pay token; returns tenantId -> token. Owner-scoped. */
export async function payTokens(ownerId: string, tenantIds: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!tenantIds.length) return out;
  const rows = await db.tenant.findMany({
    where: { ownerId, id: { in: tenantIds } },
    select: { id: true, payToken: true },
  });
  for (const r of rows) {
    if (r.payToken) {
      out.set(r.id, r.payToken);
      continue;
    }
    const token = newToken();
    await db.tenant.updateMany({ where: { id: r.id, ownerId, payToken: null }, data: { payToken: token } });
    const fresh = await db.tenant.findUnique({ where: { id: r.id }, select: { payToken: true } });
    if (fresh?.payToken) out.set(r.id, fresh.payToken);
  }
  return out;
}
