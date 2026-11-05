import "server-only";
import { db } from "./db";

export type BedOption = {
  id: string;
  label: string;
  property: string;
  propertyId: string;
  rent: number;
};

/** Beds with no active tenant, grouped-friendly and sorted by property and room. */
export async function vacantBeds(ownerId: string): Promise<BedOption[]> {
  const beds = await db.bed.findMany({
    where: {
      room: { property: { ownerId } },
      tenants: { none: { status: { in: ["ACTIVE", "NOTICE"] } } },
    },
    include: { room: { include: { property: { select: { id: true, name: true } } } } },
  });
  return beds
    .map((b) => ({
      id: b.id,
      label: `Room ${b.room.number} · Bed ${b.label}`,
      property: b.room.property.name,
      propertyId: b.room.property.id,
      rent: b.room.rent,
      sort: `${b.room.property.name}|${b.room.number.padStart(6, "0")}|${b.label}`,
    }))
    .sort((a, b) => a.sort.localeCompare(b.sort))
    .map(({ sort: _sort, ...rest }) => rest);
}
