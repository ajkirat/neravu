import "server-only";
import { db } from "./db";

export type RegisterFilter = { all: boolean; propertyId?: string };

/** Tenants for the police register, oldest move-in first. */
export async function registerRows(ownerId: string, f: RegisterFilter) {
  return db.tenant.findMany({
    where: {
      ownerId,
      ...(f.all ? {} : { status: { in: ["ACTIVE", "NOTICE"] } }),
      ...(f.propertyId ? { propertyId: f.propertyId } : {}),
    },
    select: {
      id: true,
      name: true,
      phone: true,
      idType: true,
      idNumber: true,
      permanentAddress: true,
      occupation: true,
      emergencyName: true,
      emergencyPhone: true,
      moveInDate: true,
      moveOutDate: true,
      status: true,
      property: { select: { name: true } },
      bed: { select: { label: true, room: { select: { number: true } } } },
    },
    orderBy: [{ moveInDate: "asc" }, { name: "asc" }],
  });
}
