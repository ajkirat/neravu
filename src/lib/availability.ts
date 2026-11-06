import "server-only";
import { db } from "./db";

export type Availability = { sharing: number; free: number; fromRent: number };

/** Free beds per sharing type for one property, cheapest rent first. For the public enquiry page. */
export async function availability(propertyId: string): Promise<Availability[]> {
  const rooms = await db.room.findMany({
    where: { propertyId },
    select: {
      sharing: true,
      rent: true,
      beds: { select: { tenants: { where: { status: { in: ["ACTIVE", "NOTICE"] } }, select: { id: true } } } },
    },
  });
  const by = new Map<number, Availability>();
  for (const r of rooms) {
    const free = r.beds.filter((b) => b.tenants.length === 0).length;
    if (free === 0) continue;
    const cur = by.get(r.sharing);
    if (cur) {
      cur.free += free;
      cur.fromRent = Math.min(cur.fromRent, r.rent);
    } else by.set(r.sharing, { sharing: r.sharing, free, fromRent: r.rent });
  }
  return [...by.values()].sort((a, b) => a.sharing - b.sharing);
}
