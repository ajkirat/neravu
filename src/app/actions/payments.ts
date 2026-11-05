"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { parseDateInput, today } from "@/lib/dates";
import { int, optStr, str } from "@/lib/forms";
import { PAYMENT_METHODS, rupees } from "@/lib/format";
import type { FormState } from "@/components/action-form";

export async function recordPayment(_: FormState, fd: FormData): Promise<FormState> {
  const owner = await requireOwner();
  const tenantId = str(fd, "tenantId");
  const tenant = await db.tenant.findFirst({ where: { id: tenantId, ownerId: owner.id } });
  if (!tenant) return { error: "Choose a tenant." };
  const amount = int(fd, "amount");
  if (!amount || amount <= 0) return { error: "Enter the amount received." };
  const method = str(fd, "method");
  if (!PAYMENT_METHODS.includes(method as never)) return { error: "Pick a payment method." };
  const paidOn = parseDateInput(str(fd, "paidOn")) ?? today();
  if (paidOn > today()) return { error: "Payment date cannot be in the future." };
  await db.payment.create({
    data: {
      tenantId,
      amount,
      paidOn,
      method,
      reference: optStr(fd, "reference"),
      note: optStr(fd, "note"),
    },
  });
  // A recorded payment resolves any "I've paid" claim from the tenant.
  await db.tenant.update({ where: { id: tenantId }, data: { payClaimedAt: null } });
  revalidatePath("/", "layout");
  return { ok: `Recorded ${rupees(amount)} from ${tenant.name}.`, at: Date.now() };
}

export async function deletePayment(id: number, _: FormState): Promise<FormState> {
  const owner = await requireOwner();
  const p = await db.payment.findFirst({ where: { id, tenant: { ownerId: owner.id } } });
  if (!p) return { error: "Payment not found." };
  await db.payment.delete({ where: { id } });
  revalidatePath("/", "layout");
  return { ok: "Payment deleted.", at: Date.now() };
}

/** Record money returned to the tenant (e.g. deposit refund at move-out). */
export async function recordRefund(tenantId: string, _: FormState, fd: FormData): Promise<FormState> {
  const owner = await requireOwner();
  const tenant = await db.tenant.findFirst({ where: { id: tenantId, ownerId: owner.id } });
  if (!tenant) return { error: "Tenant not found." };
  const amount = int(fd, "amount");
  if (!amount || amount <= 0) return { error: "Enter the amount refunded." };
  const paidOn = parseDateInput(str(fd, "paidOn")) ?? today();
  await db.payment.create({
    data: {
      tenantId,
      amount: -amount,
      paidOn,
      method: "REFUND",
      note: optStr(fd, "note") ?? "Deposit refund",
    },
  });
  revalidatePath("/", "layout");
  return { ok: `Recorded refund of ${rupees(amount)}.`, at: Date.now() };
}
