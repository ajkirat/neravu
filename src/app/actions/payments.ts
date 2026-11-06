"use server";

import { revalidatePath } from "next/cache";
import { sendPaymentReceipt } from "@/lib/payment-receipt";
import { closePendingClaims } from "@/lib/claims";
import { db } from "@/lib/db";
import { requireActor, requireOwner } from "@/lib/auth";
import { parseDateInput, today } from "@/lib/dates";
import { int, optStr, str } from "@/lib/forms";
import { PAYMENT_METHODS, rupees } from "@/lib/format";
import { summarizeLedger } from "@/lib/billing";
import { syncRentCharges } from "@/lib/ledger";
import { getT } from "@/lib/i18n/server";
import type { FormState } from "@/components/action-form";

export async function recordPayment(_: FormState, fd: FormData): Promise<FormState> {
  const { t: tr } = await getT();
  const { owner, staff } = await requireActor();
  const tenantId = str(fd, "tenantId");
  const tenant = await db.tenant.findFirst({ where: { id: tenantId, ownerId: owner.id } });
  if (!tenant) return { error: tr("errChooseTenant") };
  const amount = int(fd, "amount");
  if (!amount || amount <= 0) return { error: tr("errAmountReceived") };
  const method = str(fd, "method");
  if (!PAYMENT_METHODS.includes(method as never)) return { error: tr("errPickMethod") };
  const paidOn = parseDateInput(str(fd, "paidOn")) ?? today();
  if (paidOn > today()) return { error: tr("errFutureDate") };
  const created = await db.payment.create({
    data: {
      tenantId,
      amount,
      paidOn,
      method,
      reference: optStr(fd, "reference"),
      note: optStr(fd, "note"),
      recordedByStaffId: staff?.id ?? null,
      recordedByName: staff?.name ?? null,
    },
  });
  // A recorded payment resolves any "I've paid" claim from the tenant.
  await closePendingClaims(tenantId, created.id, staff ? `caretaker ${staff.name}` : "owner");
  await sendPaymentReceipt(created.id);
  revalidatePath("/", "layout");
  return { ok: tr("paidRecorded", { amt: rupees(amount), name: tenant.name }), at: Date.now() };
}

export async function deletePayment(id: number, _: FormState): Promise<FormState> {
  const { t: tr } = await getT();
  const owner = await requireOwner();
  const p = await db.payment.findFirst({ where: { id, tenant: { ownerId: owner.id } } });
  if (!p) return { error: tr("errPaymentNotFound") };
  await db.payment.delete({ where: { id } });
  revalidatePath("/", "layout");
  return { ok: tr("paymentDeleted"), at: Date.now() };
}

/** Record money returned to the tenant (e.g. deposit refund at move-out). */
export async function recordRefund(tenantId: string, _: FormState, fd: FormData): Promise<FormState> {
  const { t: tr } = await getT();
  const owner = await requireOwner();
  const tenant = await db.tenant.findFirst({ where: { id: tenantId, ownerId: owner.id } });
  if (!tenant) return { error: tr("errTenantNotFound") };
  const amount = int(fd, "amount");
  if (!amount || amount <= 0) return { error: tr("errAmountRefunded") };
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
  return { ok: tr("refundRecorded", { amt: rupees(amount) }), at: Date.now() };
}

/** One tap: record the tenant's whole pending amount as received today (cash or UPI). */
export async function collectFull(tenantId: string, method: string): Promise<{ error?: string; ok?: string }> {
  const { t: tr } = await getT();
  const { owner, staff } = await requireActor();
  const { t, lang } = await getT();
  if (method !== "CASH" && method !== "UPI") return { error: tr("errInvalidMethod") };
  const tenant = await db.tenant.findFirst({
    where: { id: tenantId, ownerId: owner.id },
    include: { charges: { select: { amount: true, dueDate: true } }, payments: { select: { amount: true } } },
  });
  if (!tenant) return { error: tr("errTenantNotFound") };
  await syncRentCharges(owner.id, tenantId);
  const fresh = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { charges: { select: { amount: true, dueDate: true } }, payments: { select: { amount: true } } },
  });
  const s = summarizeLedger(fresh?.charges ?? [], fresh?.payments ?? [], today());
  if (s.outstanding <= 0) return { error: tr("errNothingPending") };
  const created = await db.payment.create({
    data: { tenantId, amount: s.outstanding, paidOn: today(), method, recordedByStaffId: staff?.id ?? null, recordedByName: staff?.name ?? null },
  });
  await sendPaymentReceipt(created.id);
  await closePendingClaims(tenantId, created.id, staff ? `caretaker ${staff.name}` : "owner");
  revalidatePath("/", "layout");
  void lang;
  return { ok: t("paidRecorded", { amt: rupees(s.outstanding), name: tenant.name }) };
}

/** Try the WhatsApp receipt again (owner or caretaker), e.g. after the template was approved in Meta. */
export async function resendReceipt(paymentId: number): Promise<{ ok?: string; error?: string }> {
  const { owner } = await requireActor();
  const { t } = await getT();
  const p = await db.payment.findFirst({ where: { id: paymentId, tenant: { ownerId: owner.id }, amount: { gt: 0 } }, select: { id: true, receiptAt: true } });
  if (!p) return { error: t("receiptResendFail", { why: "-" }) };
  // One try a minute is plenty and keeps a stuck button from hammering Meta.
  if (p.receiptAt && Date.now() - p.receiptAt.getTime() < 60_000) return { error: t("tryAgainLater") };
  const r = await sendPaymentReceipt(p.id);
  revalidatePath(`/payments/${p.id}/receipt`);
  revalidatePath("/tenants", "layout");
  if (!r) return { error: t("receiptResendOff") };
  return r.ok ? { ok: t("receiptSentOk") } : { error: t("receiptResendFail", { why: r.status }) };
}
