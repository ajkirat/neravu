import "server-only";
import { db } from "./db";

export type BoardBed = { id: string; label: string; filled: boolean; tenant: { id: string; name: string; status: string; moveOutDate: Date | null } | null };
export type BoardRoom = { id: string; number: string; floor: string | null; sharing: number; rent: number; propertyId: string; propertyName: string; beds: BoardBed[] };

/** Every room with its beds and who sleeps in each, ordered by property then room number. */
export async function roomBoard(ownerId: string, propertyId?: string): Promise<BoardRoom[]> {
  const rooms = await db.room.findMany({
    where: { property: { ownerId, ...(propertyId ? { id: propertyId } : {}) } },
    include: {
      property: { select: { id: true, name: true } },
      beds: {
        orderBy: { label: "asc" },
        include: { tenants: { where: { status: { in: ["ACTIVE", "NOTICE"] } }, select: { id: true, name: true, status: true, moveOutDate: true }, take: 1 } },
      },
    },
  });
  return rooms
    .map((r) => ({
      id: r.id,
      number: r.number,
      floor: r.floor,
      sharing: r.sharing,
      rent: r.rent,
      propertyId: r.property.id,
      propertyName: r.property.name,
      beds: r.beds.map((b) => ({ id: b.id, label: b.label, filled: b.tenants.length > 0, tenant: b.tenants[0] ?? null })),
    }))
    .sort((a, b) => a.propertyName.localeCompare(b.propertyName) || a.number.localeCompare(b.number, undefined, { numeric: true }));
}

/** Rooms that still have a free bed, for the tap-a-bed picker (with who is in the filled beds). */
export async function pickRooms(ownerId: string) {
  const rooms = await roomBoard(ownerId);
  return rooms
    .filter((r) => r.beds.some((b) => !b.filled))
    .map((r) => ({
      id: r.id,
      number: r.number,
      sharing: r.sharing,
      rent: r.rent,
      propertyId: r.propertyId,
      propertyName: r.propertyName,
      beds: r.beds.map((b) => ({ id: b.id, label: b.label, filled: b.filled, who: b.tenant?.name.split(" ")[0] ?? null })),
    }));
}
