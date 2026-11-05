"use server";

import { isLang } from "@/lib/i18n";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { parseDateInput, today } from "@/lib/dates";
import { int, optStr, str } from "@/lib/forms";
import { syncRentCharges } from "@/lib/ledger";
import { CHARGE_TYPES, PAYMENT_METHODS, chargeLabel } from "@/lib/format";
import type { FormState } from "@/components/action-form";

const OCCUPYING = { in: ["ACTIVE", "NOTICE"] };

async function ownedTenant(ownerId: string, id: string) {
  const t = await db.tenant.findFirst({ where: { id, ownerId } });
  if (!t) throw new Error("Tenant not found");
  return t;
}

/** Returns the bed if it belongs to the owner and is free. */
async function vacantBed(ownerId: string, bedId: string, exceptTenant?: string) {
  const bed = await db.bed.findFirst({
    where: { id: bedId, room: { property: { ownerId } } },
    include: { room: true },
  });
  if (!bed) return { error: "Choose a bed." } as const;
  const taken = await db.tenant.findFirst({
    where: { bedId, status: OCCUPYING, ...(exceptTenant ? { id: { not: exceptTenant } } : {}) },
  });
  if (taken) return { error: `That bed is already taken by ${taken.name}.` } as const;
  return { bed } as const;
}

function profile(fd: FormData) {
  return {
    name: str(fd, "name"),
    phone: str(fd, "phone"),
    email: optStr(fd, "email"),
    occupation: optStr(fd, "occupation"),
    idType: optStr(fd, "idType"),
    idNumber: optStr(fd, "idNumber"),
    emergencyName: optStr(fd, "emergencyName"),
    emergencyPhone: optStr(fd, "emergencyPhone"),
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
  const owner = await requireOwner();
  const p = profile(fd);
  const problem = checkProfile(p);
  if (problem) return { error: problem };
  const result = await vacantBed(owner.id, str(fd, "bedId"));
  if ("error" in result) return { error: result.error };
  const { bed } = result;

  const moveIn = parseDateInput(str(fd, "moveInDate"));
  if (!moveIn) return { error: "Enter the move-in date." };
  const rent = int(fd, "monthlyRent");
  if (rent === null || rent <= 0) return { error: "Enter the monthly rent." };
  const deposit = int(fd, "deposit") ?? 0;
  if (deposit < 0) return { error: "Deposit cannot be negative." };
  const dueDay = int(fd, "rentDueDay") ?? Math.min(moveIn.getUTCDate(), 28);
  if (dueDay < 1 || dueDay > 28) return { error: "Rent due day must be between 1 and 28." };

  const tenant = await db.tenant.create({
    data: {
      ...p,
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

  const paidNow = int(fd, "paidNow") ?? 0;
  if (paidNow > 0) {
    await db.payment.create({
      data: {
        tenantId: tenant.id,
        amount: paidNow,
        paidOn: moveIn > today() ? today() : moveIn,
        method: PAYMENT_METHODS.includes(str(fd, "method") as never) ? str(fd, "method") : "UPI",
        note: "Collected at move-in",
      },
    });
  }
  await syncRentCharges(owner.id, tenant.id);
  redirect(`/tenants/${tenant.id}`);
}

export async function updateTenant(id: string, _: FormState, fd: FormData): Promise<FormState> {
  const owner = await requireOwner();
  await ownedTenant(owner.id, id);
  const p = profile(fd);
  const problem = checkProfile(p);
  if (problem) return { error: problem };
  const rent = int(fd, "monthlyRent");
  if (rent === null || rent <= 0) return { error: "Enter the monthly rent." };
  const dueDay = int(fd, "rentDueDay");
  if (!dueDay || dueDay < 1 || dueDay > 28) return { error: "Rent due day must be between 1 and 28." };
  await db.tenant.update({ where: { id }, data: { ...p, monthlyRent: rent, rentDueDay: dueDay } });
  revalidatePath(`/tenants/${id}`);
  return { ok: "Saved. A new rent amount applies from the next bill.", at: Date.now() };
}

export async function changeBed(id: string, _: FormState, fd: FormData): Promise<FormState> {
  const owner = await requireOwner();
  const t = await ownedTenant(owner.id, id);
  if (t.status === "MOVED_OUT") return { error: "This tenant has moved out." };
  const result = await vacantBed(owner.id, str(fd, "bedId"), id);
  if ("error" in result) return { error: result.error };
  await db.tenant.update({
    where: { id },
    data: { bedId: result.bed.id, propertyId: result.bed.room.propertyId },
  });
  revalidatePath(`/tenants/${id}`);
  return { ok: `Moved to room ${result.bed.room.number}, bed ${result.bed.label}.`, at: Date.now() };
}

export async function giveNotice(id: string, _: FormState, fd: FormData): Promise<FormState> {
  const owner = await requireOwner();
  const t = await ownedTenant(owner.id, id);
  if (t.status !== "ACTIVE") return { error: "Tenant is not active." };
  const leaving = parseDateInput(str(fd, "moveOutDate"));
  if (!leaving) return { error: "Enter the expected move-out date." };
  if (leaving < t.moveInDate) return { error: "Move-out cannot be before move-in." };
  await db.tenant.update({
    where: { id },
    data: { status: "NOTICE", noticeDate: today(), moveOutDate: leaving },
  });
  revalidatePath(`/tenants/${id}`);
  return { ok: "Notice recorded.", at: Date.now() };
}

export async function cancelNotice(id: string, _: FormState): Promise<FormState> {
  const owner = await requireOwner();
  const t = await ownedTenant(owner.id, id);
  if (t.status !== "NOTICE") return { error: "Tenant is not on notice." };
  await db.tenant.update({
    where: { id },
    data: { status: "ACTIVE", noticeDate: null, moveOutDate: null },
  });
  revalidatePath(`/tenants/${id}`);
  return { ok: "Notice withdrawn.", at: Date.now() };
}

export async function moveOut(id: string, _: FormState, fd: FormData): Promise<FormState> {
  const owner = await requireOwner();
  const t = await ownedTenant(owner.id, id);
  if (t.status === "MOVED_OUT") return { error: "Already moved out." };
  const date = parseDateInput(str(fd, "moveOutDate"));
  if (!date) return { error: "Enter the move-out date." };
  if (date < t.moveInDate) return { error: "Move-out cannot be before move-in." };
  // Bill everything up to the move-out date, then free the bed.
  await db.tenant.update({ where: { id }, data: { moveOutDate: date } });
  await syncRentCharges(owner.id, id);
  await db.tenant.update({ where: { id }, data: { status: "MOVED_OUT" } });
  revalidatePath(`/tenants/${id}`);
  return { ok: "Moved out. The bed is now vacant.", at: Date.now() };
}

export async function addCharge(tenantId: string, _: FormState, fd: FormData): Promise<FormState> {
  const owner = await requireOwner();
  await ownedTenant(owner.id, tenantId);
  const type = str(fd, "type");
  if (!CHARGE_TYPES.includes(type as never)) return { error: "Pick a charge type." };
  const amount = int(fd, "amount");
  if (!amount || amount <= 0) return { error: "Enter an amount." };
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
  return { ok: "Charge added.", at: Date.now() };
}

export async function deleteCharge(chargeId: string, _: FormState): Promise<FormState> {
  const owner = await requireOwner();
  const c = await db.charge.findFirst({ where: { id: chargeId, tenant: { ownerId: owner.id } } });
  if (!c) return { error: "Charge not found." };
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
  return { ok: "Charge removed.", at: Date.now() };
}
