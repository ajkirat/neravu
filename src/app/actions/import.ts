"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { nextDueDate } from "@/lib/billing";
import { addDays, parseDateInput, today } from "@/lib/dates";
import { phoneKey } from "@/lib/join";
import { syncRentCharges } from "@/lib/ledger";
import { MAX_IMPORT_ROWS, sanitizeRow } from "@/lib/tenant-import";
import { getT } from "@/lib/i18n/server";

export type ImportResult = { ok?: string; error?: string; rowErrors?: Record<number, string>; created?: number };

const rowsSchema = z.array(z.record(z.string(), z.unknown())).min(1).max(MAX_IMPORT_ROWS);

/** Save reviewed import rows. All rows must be valid; otherwise nothing is saved and each bad row says why. */
export async function importTenants(propertyId: string, rowsJson: string): Promise<ImportResult> {
  const owner = await requireOwner();
  const { t } = await getT();
  let parsed: unknown;
  try {
    parsed = JSON.parse(rowsJson);
  } catch {
    return { error: t("impNoRows") };
  }
  const ok = rowsSchema.safeParse(parsed);
  if (!ok.success) return { error: t("impNoRows") };
  const rows = ok.data.map((r) => sanitizeRow(r));

  const property = await db.property.findFirst({
    where: { id: propertyId, ownerId: owner.id },
    include: {
      rooms: { include: { beds: { include: { tenants: { where: { status: { in: ["ACTIVE", "NOTICE"] } }, select: { id: true } } } } } },
    },
  });
  if (!property) return { error: t("errPropertyNotFound") };
  if (!property.rooms.length) return { error: t("impNoRooms") };

  const staying = await db.tenant.findMany({ where: { ownerId: owner.id, status: { in: ["ACTIVE", "NOTICE"] } }, select: { phone: true } });
  const takenPhones = new Set(staying.map((s) => phoneKey(s.phone)));
  const rooms = new Map(property.rooms.map((r) => [r.number.trim().toLowerCase(), r]));
  const usedBeds = new Set<string>();
  const seenPhones = new Map<string, number>();
  const asOf = today();
  const errors: Record<number, string> = {};
  const plan: {
    name: string;
    phone: string;
    bedId: string;
    rent: number;
    dueDay: number;
    moveIn: Date;
    billFrom: Date;
    deposit: number;
    pending: number;
  }[] = [];

  rows.forEach((r, i) => {
    if (r.name.length < 2) return void (errors[i] = t("impErrName"));
    const key = phoneKey(r.phone);
    if (key.length < 10) return void (errors[i] = t("impErrPhone"));
    if (takenPhones.has(key)) return void (errors[i] = t("impErrDup"));
    if (seenPhones.has(key)) return void (errors[i] = t("impErrDupRow"));
    seenPhones.set(key, i);
    const room = rooms.get(r.room.trim().toLowerCase());
    if (!room) return void (errors[i] = t("impErrRoom", { room: r.room || "?" }));
    const free = room.beds.filter((b) => b.tenants.length === 0 && !usedBeds.has(b.id));
    const bed = r.bed ? free.find((b) => b.label.toUpperCase() === r.bed) : free.sort((a, b) => a.label.localeCompare(b.label))[0];
    if (!bed) return void (errors[i] = r.bed ? t("impErrBedTaken", { bed: r.bed, room: room.number }) : t("impErrBed", { room: room.number }));
    const rent = r.rent ? Number(r.rent) : room.rent;
    if (!rent || rent <= 0) return void (errors[i] = t("impErrRent"));
    const moveIn = (r.moveIn && parseDateInput(r.moveIn)) || asOf;
    if (moveIn > addDays(asOf, 60)) return void (errors[i] = t("impErrDate"));
    const dueDay = r.dueDay ? Number(r.dueDay) : Math.min(moveIn.getUTCDate(), 28);
    usedBeds.add(bed.id);
    plan.push({
      name: r.name,
      phone: r.phone.trim(),
      bedId: bed.id,
      rent,
      dueDay,
      moveIn,
      // Everything up to today is in "pending"; Neravu bills from the next due date on.
      billFrom: nextDueDate({ moveIn, dueDay, asOf }),
      deposit: Number(r.deposit || 0),
      pending: Number(r.pending || 0),
    });
  });
  if (Object.keys(errors).length) return { error: t("impErrRows"), rowErrors: errors };

  await db.$transaction(
    async (tx) => {
      for (const p of plan) {
        await tx.tenant.create({
          data: {
            ownerId: owner.id,
            propertyId: property.id,
            bedId: p.bedId,
            name: p.name,
            phone: p.phone,
            monthlyRent: p.rent,
            deposit: p.deposit,
            rentDueDay: p.dueDay,
            moveInDate: p.moveIn,
            billFrom: p.billFrom,
            notes: "Imported",
            charges: p.pending
              ? { create: { type: "OTHER", period: null, description: t("impOpening"), amount: p.pending, dueDate: asOf } }
              : undefined,
          },
        });
      }
    },
    { timeout: 30_000 },
  );
  await syncRentCharges(owner.id);
  revalidatePath("/", "layout");
  return { ok: t("impSave", { n: plan.length }), created: plan.length };
}
