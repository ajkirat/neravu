"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { syncRentCharges } from "@/lib/ledger";
import { summarizeLedger } from "@/lib/billing";
import { today } from "@/lib/dates";
import { tooMany } from "@/lib/throttle";
import { getT } from "@/lib/i18n/server";
import { appOrigin } from "@/lib/url";
import { createPaymentLink } from "@/lib/razorpay";
import { cleanUtr } from "@/lib/claims";
import { decryptSecret } from "@/lib/secrets";
import type { FormState } from "@/components/action-form";

/**
 * Public: a tenant taps "I've paid" on their My PG page (Option A). This is only a note for the owner:
 * it never changes what they owe. The owner checks their own UPI app and taps OK, which records it.
 */
export async function claimPayment(token: string, _: FormState, fd: FormData): Promise<FormState> {
  const { t: tr } = await getT();
  if (!/^[a-f0-9]{32}$/.test(token)) return { error: tr("errBadLink") };
  if (await tooMany("claim", 10, 60 * 60 * 1000)) return { error: tr("tryAgainLater") };
  const t = await db.tenant.findUnique({
    where: { payToken: token },
    select: { id: true, ownerId: true, payCode: true, owner: { select: { payConfirm: true, paymentMode: true } } },
  });
  if (!t) return { error: tr("errBadLink") };
  // With bank-email confirmation (Option C) payments show up by themselves: there is nothing to claim.
  if (t.owner.payConfirm === "BANK" || t.owner.paymentMode === "NONE") return { error: tr("errBadLink") };
  await syncRentCharges(t.ownerId, t.id);
  const full = await db.tenant.findUnique({
    where: { id: t.id },
    select: { charges: { select: { amount: true, dueDate: true } }, payments: { select: { amount: true } } },
  });
  const s = summarizeLedger(full?.charges ?? [], full?.payments ?? [], today());
  if (s.outstanding <= 0) return { ok: tr("payNothingPendingOk"), at: Date.now() };
  const utr = cleanUtr(String(fd.get("utr") ?? ""));
  const pending = await db.paymentClaim.findFirst({ where: { tenantId: t.id, status: "PENDING" } });
  if (pending) {
    await db.paymentClaim.update({ where: { id: pending.id }, data: { utr: utr ?? pending.utr, amount: s.outstanding } });
  } else {
    await db.paymentClaim.create({ data: { ownerId: t.ownerId, tenantId: t.id, amount: s.outstanding, paise: t.payCode ?? 0, utr } });
  }
  await db.tenant.update({ where: { id: t.id }, data: { payClaimedAt: new Date() } });
  revalidatePath("/", "layout");
  return { ok: tr("payClaimedOk"), at: Date.now() };
}

/** Public: a tenant taps "Pay online". Creates a Razorpay payment link on the OWNER's Razorpay account. */
export async function startRazorpayPayment(token: string): Promise<{ url?: string; error?: string }> {
  const { t } = await getT();
  if (!/^[a-f0-9]{32}$/.test(token)) return { error: t("payRzpError") };
  if (await tooMany("rzp-pay", 10, 15 * 60 * 1000)) return { error: t("tryAgainLater") };
  const tenant = await db.tenant.findUnique({
    where: { payToken: token },
    select: {
      id: true,
      ownerId: true,
      name: true,
      phone: true,
      owner: { select: { paymentMode: true, razorpayEnabled: true, razorpayKeyId: true, razorpayKeySecretEnc: true, businessName: true } },
    },
  });
  const o = tenant?.owner;
  if (!tenant || !o || o.paymentMode !== "RAZORPAY" || !o.razorpayEnabled || !o.razorpayKeyId) return { error: t("payRzpError") };
  const keySecret = decryptSecret(o.razorpayKeySecretEnc);
  if (!keySecret) return { error: t("payRzpError") };

  await syncRentCharges(tenant.ownerId, tenant.id);
  const full = await db.tenant.findUnique({
    where: { id: tenant.id },
    select: { charges: { select: { amount: true, dueDate: true } }, payments: { select: { amount: true } } },
  });
  const s = summarizeLedger(full?.charges ?? [], full?.payments ?? [], today());
  if (s.outstanding <= 0) return { error: t("payNothingPending", { pg: o.businessName ?? "" }) };
  try {
    const { url } = await createPaymentLink(
      { keyId: o.razorpayKeyId, keySecret },
      {
        amountRupees: s.outstanding,
        tenantId: tenant.id,
        name: tenant.name,
        phone: tenant.phone,
        description: `Rent – ${tenant.name}`,
        callbackUrl: `${await appOrigin()}/pay/${token}`,
      },
    );
    return { url };
  } catch {
    return { error: t("payRzpError") };
  }
}
