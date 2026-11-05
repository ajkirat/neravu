"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { bedLabels } from "@/lib/format";
import { int, optStr, str } from "@/lib/forms";
import { z } from "zod";
import { getT } from "@/lib/i18n/server";
import { MAX_BULK, validateDrafts } from "@/lib/room-gen";
import type { FormState } from "@/components/action-form";

const OCCUPYING = { in: ["ACTIVE", "NOTICE"] };

async function ownedProperty(ownerId: string, id: string) {
  const p = await db.property.findFirst({ where: { id, ownerId } });
  if (!p) throw new Error("Property not found");
  return p;
}

async function ownedRoom(ownerId: string, id: string) {
  const r = await db.room.findFirst({ where: { id, property: { ownerId } }, include: { beds: true } });
  if (!r) throw new Error("Room not found");
  return r;
}

export async function createProperty(_: FormState, fd: FormData): Promise<FormState> {
  const owner = await requireOwner();
  const name = str(fd, "name");
  if (name.length < 2) return { error: "Give the property a name." };
  const p = await db.property.create({
    data: { ownerId: owner.id, name, address: optStr(fd, "address"), city: optStr(fd, "city") },
  });
  redirect(`/properties/${p.id}`);
}

export async function updateProperty(id: string, _: FormState, fd: FormData): Promise<FormState> {
  const owner = await requireOwner();
  await ownedProperty(owner.id, id);
  const name = str(fd, "name");
  if (name.length < 2) return { error: "Give the property a name." };
  await db.property.update({
    where: { id },
    data: { name, address: optStr(fd, "address"), city: optStr(fd, "city") },
  });
  revalidatePath(`/properties/${id}`);
  return { ok: "Property updated.", at: Date.now() };
}

export async function deleteProperty(id: string, _: FormState): Promise<FormState> {
  const owner = await requireOwner();
  await ownedProperty(owner.id, id);
  const occupied = await db.tenant.count({ where: { propertyId: id, status: OCCUPYING } });
  if (occupied) return { error: "Move out all tenants before deleting this property." };
  await db.property.delete({ where: { id } });
  redirect("/properties");
}

function roomInput(fd: FormData) {
  const number = str(fd, "number");
  const sharing = int(fd, "sharing");
  const rent = int(fd, "rent");
  if (!number) return { error: "Enter a room number or name." } as const;
  if (!sharing || sharing < 1 || sharing > 12) return { error: "Beds must be between 1 and 12." } as const;
  if (rent === null || rent < 0) return { error: "Enter the monthly rent per bed." } as const;
  return { number, sharing, rent, floor: optStr(fd, "floor") } as const;
}

export async function createRoom(propertyId: string, _: FormState, fd: FormData): Promise<FormState> {
  const owner = await requireOwner();
  await ownedProperty(owner.id, propertyId);
  const input = roomInput(fd);
  if ("error" in input) return { error: input.error };
  const clash = await db.room.findUnique({
    where: { propertyId_number: { propertyId, number: input.number } },
  });
  if (clash) return { error: `Room ${input.number} already exists in this property.` };
  await db.room.create({
    data: {
      propertyId,
      number: input.number,
      floor: input.floor,
      sharing: input.sharing,
      rent: input.rent,
      beds: { create: bedLabels(input.sharing).map((label) => ({ label })) },
    },
  });
  revalidatePath(`/properties/${propertyId}`);
  return { ok: `Room ${input.number} added with ${input.sharing} bed(s).`, at: Date.now() };
}

export async function updateRoom(roomId: string, _: FormState, fd: FormData): Promise<FormState> {
  const owner = await requireOwner();
  const room = await ownedRoom(owner.id, roomId);
  const input = roomInput(fd);
  if ("error" in input) return { error: input.error };
  if (input.number !== room.number) {
    const clash = await db.room.findUnique({
      where: { propertyId_number: { propertyId: room.propertyId, number: input.number } },
    });
    if (clash) return { error: `Room ${input.number} already exists in this property.` };
  }

  const current = room.beds.length;
  if (input.sharing < current) {
    // Remove beds from the end, but only if they are vacant.
    const sorted = [...room.beds].sort((a, b) => a.label.localeCompare(b.label));
    const toRemove = sorted.slice(input.sharing);
    const busy = await db.tenant.count({
      where: { bedId: { in: toRemove.map((b) => b.id) }, status: OCCUPYING },
    });
    if (busy) return { error: "Some of the beds you are removing are occupied. Move those tenants first." };
    await db.bed.deleteMany({ where: { id: { in: toRemove.map((b) => b.id) } } });
  } else if (input.sharing > current) {
    const existing = new Set(room.beds.map((b) => b.label));
    const add = bedLabels(26).filter((l) => !existing.has(l)).slice(0, input.sharing - current);
    await db.bed.createMany({ data: add.map((label) => ({ roomId, label })) });
  }
  await db.room.update({
    where: { id: roomId },
    data: { number: input.number, floor: input.floor, sharing: input.sharing, rent: input.rent },
  });
  revalidatePath(`/properties/${room.propertyId}`);
  return { ok: "Room updated.", at: Date.now() };
}

export async function deleteRoom(roomId: string, _: FormState): Promise<FormState> {
  const owner = await requireOwner();
  const room = await ownedRoom(owner.id, roomId);
  const busy = await db.tenant.count({
    where: { bedId: { in: room.beds.map((b) => b.id) }, status: OCCUPYING },
  });
  if (busy) return { error: "This room has tenants. Move them out before deleting it." };
  await db.room.delete({ where: { id: roomId } });
  revalidatePath(`/properties/${room.propertyId}`);
  return { ok: "Room deleted.", at: Date.now() };
}

const bulkSchema = z
  .array(
    z.object({
      number: z.string(),
      floor: z.string().max(10).nullable(),
      sharing: z.number().int(),
      rent: z.number().int(),
    }),
  )
  .max(MAX_BULK);

/** Add many rooms (with their beds) in one go. Everything is checked again here, and either all rooms are created or none. */
export async function createRoomsBulk(propertyId: string, _: FormState, fd: FormData): Promise<FormState> {
  const owner = await requireOwner();
  const { t } = await getT();
  await ownedProperty(owner.id, propertyId);
  let raw: unknown;
  try {
    raw = JSON.parse(str(fd, "rows"));
  } catch {
    return { error: t("bulkFix") };
  }
  const parsed = bulkSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.data === undefined && Array.isArray(raw) && raw.length > MAX_BULK ? t("bulkTooMany") : t("bulkFix") };
  const existing = await db.room.findMany({ where: { propertyId }, select: { number: true } });
  const { rows, ok } = validateDrafts(parsed.data, existing.map((r) => r.number));
  if (!ok) return { error: t("bulkFix") };
  await db.$transaction(
    rows.map((r) =>
      db.room.create({
        data: {
          propertyId,
          number: r.number,
          floor: r.floor?.trim() || null,
          sharing: r.sharing,
          rent: r.rent,
          beds: { create: bedLabels(r.sharing).map((label) => ({ label })) },
        },
      }),
    ),
  );
  revalidatePath(`/properties/${propertyId}`);
  return { ok: t("bulkAdded", { rooms: rows.length, beds: rows.reduce((s, r) => s + r.sharing, 0) }), at: Date.now() };
}
