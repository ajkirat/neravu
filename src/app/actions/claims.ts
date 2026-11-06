"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { today } from "@/lib/dates";
import { rupees } from "@/lib/format";
import { closePendingClaims } from "@/lib/claims";
import { sendPaymentReceipt } from "@/lib/payment-receipt";
import { getT } from "@/lib/i18n/server";

/** The owner saw the money in their UPI app and taps OK: this records the payment and sends the receipt. */
export async function confirmClaim(id: string): Promise<{ ok?: string; error?: string }> {
  const owner = await requireOwner();
  const { t } = await getT();
  const c = await db.paymentClaim.findFirst({ where: { id, ownerId: owner.id, status: "PENDING" }, include: { tenant: { select: { name: true } } } });
  if (!c) return { error: t("claimGone") };
  const payment = await db.payment.create({
    data: {
      tenantId: c.tenantId,
      amount: c.amount,
      paidOn: today(c.createdAt),
      method: "UPI",
      reference: c.utr,
      note: "Tenant paid by UPI, checked by owner",
    },
  });
  await closePendingClaims(c.tenantId, payment.id, "owner");
  after(() => sendPaymentReceipt(payment.id));
  revalidatePath("/", "layout");
  return { ok: t("claimConfirmed", { amt: rupees(c.amount), name: c.tenant.name.split(" ")[0] }) };
}

/** The owner did not find the money: the tenant's page goes back to "please pay". */
export async function rejectClaim(id: string): Promise<{ ok?: string; error?: string }> {
  const owner = await requireOwner();
  const { t } = await getT();
  const c = await db.paymentClaim.findFirst({ where: { id, ownerId: owner.id, status: "PENDING" } });
  if (!c) return { error: t("claimGone") };
  await db.paymentClaim.update({ where: { id }, data: { status: "REJECTED", resolvedBy: "owner", resolvedAt: new Date() } });
  await db.tenant.update({ where: { id: c.tenantId }, data: { payClaimedAt: null } });
  revalidatePath("/", "layout");
  return { ok: t("claimRejected") };
}
