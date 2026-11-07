"use server";

import { isLang } from "@/lib/i18n";
import { revalidatePath } from "next/cache";
import { sendPaymentReceipt } from "@/lib/payment-receipt";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n/server";
import type { TFn } from "@/lib/i18n";
import { requireOwner } from "@/lib/auth";
import { parseDateInput, today } from "@/lib/dates";
import { int, optStr, str } from "@/lib/forms";
import { syncRentCharges } from "@/lib/ledger";
import { CHARGE_TYPES, PAYMENT_METHODS, chargeLabel } from "@/lib/format";
import type { FormState } from "@/components/action-form";
import { tooMany } from "@/lib/throttle";
import { idFromForm, readIdForForm, type IdReadResult } from "@/lib/id-proof";

const OCCUPYING = { in: ["ACTIVE", "NOTICE"] };

async function ownedTenant(ownerId: string, id: string) {
  const t = await db.tenant.findFirst({ where: { id, ownerId } });
  if (!t) throw new Error("Tenant not found");
  return t;
}

/** Returns the bed if it belongs to the owner and is free. */
async function vacantBed(ownerId: string, bedId: string, tr: TFn, exceptTenant?: string) {
  const bed = await db.bed.findFirst({
    where: { id: bedId, room: { property: { ownerId } } },
    include: { room: true },
  });
  if (!bed) return { error: tr("errChooseBed") } as const;
  const taken = await db.tenant.findFirst({
    where: { bedId, status: OCCUPYING, ...(exceptTenant ? { id: { not: exceptTenant } } : {}) },
  });
  if (taken) return { error: tr("errBedTaken", { name: taken.name }) } as const;
  return { bed } as const;
}

function profile(fd: FormData) {
  return {
    name: str(fd, "name"),
    phone: str(fd, "phone"),
    email: optStr(fd, "email"),
    occupation: optStr(fd, "occupation"),
    emergencyName: optStr(fd, "emergencyName"),
    emergencyPhone: optStr(fd, "emergencyPhone"),
    permanentAddress: optStr(fd, "permanentAddress")?.slice(0, 300) ?? null,
    notes: optStr(fd, "notes"),
    language: isLang(str(fd, "language")) ? str(fd, "language") : null,
  };
}

function checkProfile(p: ReturnType<typeof profile>) {
  if (p.name.length < 2) return "Enter the tenant's name.";
  if (p.phone.replace(/\D/g, "").length < 10) return "Enter a valid mobile number.";
  return null;
}

export async function createTenant(_: FormState, fd: FormData): Promise<FormState> {
  const { t: tr } = await getT();
  const owner = await requireOwner();
  const p = profile(fd);
  const problem = checkProfile(p);
  if (problem) return { error: problem };
  const result = await vacantBed(owner.id, str(fd, "bedId"), tr);
  if ("error" in result) return { error: result.error };
  const { bed } = result;

  const moveIn = parseDateInput(str(fd, "moveInDate"));
  if (!moveIn) return { error: tr("errMoveIn") };
  const rent = int(fd, "monthlyRent");
  if (rent === null || rent <= 0) return { error: tr("errMonthlyRent") };
  const deposit = int(fd, "deposit") ?? 0;
  if (deposit < 0) return { error: tr("errDeposit") };
  const dueDay = int(fd, "rentDueDay") ?? Math.min(moveIn.getUTCDate(), 28);
  if (dueDay < 1 || dueDay > 28) return { error: tr("errDueDay") };

  // ID proof: a new photo (number read from it), or the one the person sent with their Join form.
  const id = await idFromForm(fd);
  if (id && "error" in id) return { error: tr("idBadPhoto") };
  const joinId0 = str(fd, "joinId");
  const fromJoin = !id && joinId0 ? await db.joinRequest.findFirst({ where: { id: joinId0, ownerId: owner.id }, select: { idType: true, idNumber: true, idPhoto: true, idPhotoMime: true } }) : null;
  const idData = id
    ? { idType: id.type, idNumber: id.number, idPhoto: id.photo, idPhotoMime: id.mime }
    : fromJoin
      ? { idType: fromJoin.idType, idNumber: fromJoin.idNumber, idPhoto: fromJoin.idPhoto, idPhotoMime: fromJoin.idPhotoMime }
      : {};

  const tenant = await db.tenant.create({
    data: {
      ...p,
      ...idData,
      ownerId: owner.id,
      propertyId: bed.room.propertyId,
      bedId: bed.id,
      monthlyRent: rent,
      deposit,
      rentDueDay: dueDay,
      moveInDate: moveIn,
      charges: deposit
        ? {
            create: {
              type: "DEPOSIT",
              period: null,
              description: "Security deposit",
              amount: deposit,
              dueDate: moveIn,
            },
          }
        : undefined,
    },
  });

  // Came from a Join request or a lead: close it so it leaves the waiting lists.
  const joinId = str(fd, "joinId");
  if (joinId) {
    await db.joinRequest.updateMany({
      where: { id: joinId, ownerId: owner.id, status: "PENDING" },
      data: { status: "APPROVED", tenantId: tenant.id },
    });
  }
  const leadId = str(fd, "leadId");
  if (leadId) await db.lead.updateMany({ where: { id: leadId, ownerId: owner.id }, data: { status: "WON" } });

  const paidNow = int(fd, "paidNow") ?? 0;
  if (paidNow > 0) {
    const created = await db.payment.create({
      data: {
        tenantId: tenant.id,
        amount: paidNow,
        paidOn: moveIn > today() ? today() : moveIn,
        method: PAYMENT_METHODS.includes(str(fd, "method") as never) ? str(fd, "method") : "UPI",
        note: "Collected at move-in",
      },
    });
    await sendPaymentReceipt(created.id);
  }
  await syncRentCharges(owner.id, tenant.id);
  redirect(`/tenants/${tenant.id}?welcome=1`);
}

export async function updateTenant(id: string, _: FormState, fd: FormData): Promise<FormState> {
  const { t: tr } = await getT();
  const owner = await requireOwner();
  await ownedTenant(owner.id, id);
  const p = profile(fd);
  const problem = checkProfile(p);
  if (problem) return { error: problem };
  const rent = int(fd, "monthlyRent");
  if (rent === null || rent <= 0) return { error: tr("errMonthlyRent") };
  const dueDay = int(fd, "rentDueDay");
  if (!dueDay || dueDay < 1 || dueDay > 28) return { error: tr("errDueDay") };
  // A new ID photo replaces the old one (and its number); no photo leaves the ID as it was.
  const idUp = await idFromForm(fd);
  if (idUp && "error" in idUp) return { error: tr("idBadPhoto") };
  const idData = idUp ? { idType: idUp.type, idNumber: idUp.number, idPhoto: idUp.photo, idPhotoMime: idUp.mime } : {};
  await db.tenant.update({ where: { id }, data: { ...p, ...idData, monthlyRent: rent, rentDueDay: dueDay } });
  revalidatePath(`/tenants/${id}`);
  return { ok: tr("tenantSavedRent"), at: Date.now() };
}

export async function changeBed(id: string, _: FormState, fd: FormData): Promise<FormState> {
  const { t: tr } = await getT();
  const owner = await requireOwner();
  const t = await ownedTenant(owner.id, id);
  if (t.status === "MOVED_OUT") return { error: tr("errMovedOut") };
  const result = await vacantBed(owner.id, str(fd, "bedId"), tr, id);
  if ("error" in result) return { error: result.error };
  await db.tenant.update({
    where: { id },
    data: { bedId: result.bed.id, propertyId: result.bed.room.propertyId },
  });
  revalidatePath(`/tenants/${id}`);
  return { ok: tr("bedMoved", { r: result.bed.room.number, b: result.bed.label }), at: Date.now() };
}

export async function giveNotice(id: string, _: FormState, fd: FormData): Promise<FormState> {
  const { t: tr } = await getT();
  const owner = await requireOwner();
  const t = await ownedTenant(owner.id, id);
  if (t.status !== "ACTIVE") return { error: tr("errNotActive") };
  const leaving = parseDateInput(str(fd, "moveOutDate"));
  if (!leaving) return { error: tr("errExpectedMoveOut") };
  if (leaving < t.moveInDate) return { error: tr("errMoveOutBefore") };
  await db.tenant.update({
    where: { id },
    data: { status: "NOTICE", noticeDate: today(), moveOutDate: leaving },
  });
  revalidatePath(`/tenants/${id}`);
  return { ok: tr("noticeRecorded"), at: Date.now() };
}

export async function cancelNotice(id: string, _: FormState): Promise<FormState> {
  const { t: tr } = await getT();
  const owner = await requireOwner();
  const t = await ownedTenant(owner.id, id);
  if (t.status !== "NOTICE") return { error: tr("errNotOnNotice") };
  await db.tenant.update({
    where: { id },
    data: { status: "ACTIVE", noticeDate: null, moveOutDate: null },
  });
  revalidatePath(`/tenants/${id}`);
  return { ok: tr("noticeWithdrawn"), at: Date.now() };
}

export async function moveOut(id: string, _: FormState, fd: FormData): Promise<FormState> {
  const { t: tr } = await getT();
  const owner = await requireOwner();
  const t = await ownedTenant(owner.id, id);
  if (t.status === "MOVED_OUT") return { error: tr("errAlreadyMovedOut") };
  const date = parseDateInput(str(fd, "moveOutDate"));
  if (!date) return { error: tr("errMoveOutDate") };
  if (date < t.moveInDate) return { error: tr("errMoveOutBefore") };
  // Bill everything up to the move-out date, then free the bed.
  await db.tenant.update({ where: { id }, data: { moveOutDate: date } });
  await syncRentCharges(owner.id, id);
  await db.tenant.update({ where: { id }, data: { status: "MOVED_OUT" } });
  revalidatePath(`/tenants/${id}`);
  return { ok: tr("movedOutOk"), at: Date.now() };
}

export async function addCharge(tenantId: string, _: FormState, fd: FormData): Promise<FormState> {
  const { t: tr } = await getT();
  const owner = await requireOwner();
  await ownedTenant(owner.id, tenantId);
  const type = str(fd, "type");
  if (!CHARGE_TYPES.includes(type as never)) return { error: tr("errChargeType") };
  const amount = int(fd, "amount");
  if (!amount || amount <= 0) return { error: tr("errEnterAmount") };
  const dueDate = parseDateInput(str(fd, "dueDate")) ?? today();
  await db.charge.create({
    data: {
      tenantId,
      type,
      period: null,
      description: str(fd, "description") || chargeLabel[type],
      amount,
      dueDate,
    },
  });
  revalidatePath(`/tenants/${tenantId}`);
  return { ok: tr("chargeAdded"), at: Date.now() };
}

export async function deleteCharge(chargeId: string, _: FormState): Promise<FormState> {
  const { t: tr } = await getT();
  const owner = await requireOwner();
  const c = await db.charge.findFirst({ where: { id: chargeId, tenant: { ownerId: owner.id } } });
  if (!c) return { error: tr("errChargeNotFound") };
  if (c.type === "RENT") {
    // Keep the month marked as billed by zeroing it, so it is not re-created.
    await db.charge.update({
      where: { id: chargeId },
      data: { amount: 0, description: `${c.description} (waived)` },
    });
  } else {
    await db.charge.delete({ where: { id: chargeId } });
  }
  revalidatePath(`/tenants/${c.tenantId}`);
  return { ok: tr("chargeRemoved"), at: Date.now() };
}

/** Owner: read an ID photo in the tenant form, so the owner sees the number before saving. */
export async function readIdForOwner(fd: FormData): Promise<IdReadResult | { error: string }> {
  const owner = await requireOwner();
  const { t: tr } = await getT();
  if (await tooMany(`id-read:${owner.id}`, 60, 60 * 60 * 1000)) return { error: tr("tryAgainLater") };
  const file = fd.get("idPhoto");
  if (!(file instanceof File)) return { error: tr("errIdPhoto") };
  const r = await readIdForForm(file);
  return "error" in r ? { error: tr("idBadPhoto") } : r;
}
