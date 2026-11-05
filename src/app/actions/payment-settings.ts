"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { optStr, str } from "@/lib/forms";
import { getT } from "@/lib/i18n/server";
import { PAY_MODES } from "@/lib/pay-mode";
import { testCredentials } from "@/lib/razorpay";
import { decryptSecret, encryptSecret } from "@/lib/secrets";
import { isValidUpiId } from "@/lib/upi";
import type { FormState } from "@/components/action-form";

export async function savePaymentSettings(_: FormState, fd: FormData): Promise<FormState> {
  const owner = await requireOwner();
  const { t } = await getT();
  const mode = str(fd, "mode");
  if (!PAY_MODES.includes(mode as never)) return { error: t("payHowTitle") };

  const upiId = optStr(fd, "upiId");
  if (upiId && !isValidUpiId(upiId)) return { error: t("upiInvalid") };
  if (mode === "UPI" && !upiId) return { error: t("upiNeeded") };

  const data: Record<string, unknown> = { paymentMode: mode, upiId };

  if (mode === "RAZORPAY") {
    const saved = await db.owner.findUnique({
      where: { id: owner.id },
      select: { razorpayKeyId: true, razorpayKeySecretEnc: true, razorpayWebhookSecretEnc: true },
    });
    const keyId = optStr(fd, "razorpayKeyId") ?? saved?.razorpayKeyId ?? "";
    if (!/^rzp_(test|live)_[A-Za-z0-9]{6,}$/.test(keyId)) return { error: t("rzpBadKeyId") };
    const keySecret = optStr(fd, "razorpayKeySecret") ?? decryptSecret(saved?.razorpayKeySecretEnc) ?? "";
    if (keySecret.length < 8) return { error: t("rzpNeedSecret") };
    const webhookSecret = optStr(fd, "razorpayWebhookSecret") ?? decryptSecret(saved?.razorpayWebhookSecretEnc) ?? "";
    if (webhookSecret.length < 8) return { error: t("rzpNeedWebhook") };
    // Prove the keys work before turning anything on.
    if ((await testCredentials({ keyId, keySecret })) !== "ok") return { error: t("rzpConnFail") };
    Object.assign(data, {
      razorpayKeyId: keyId,
      razorpayKeySecretEnc: encryptSecret(keySecret),
      razorpayWebhookSecretEnc: encryptSecret(webhookSecret),
      razorpayEnabled: true,
    });
  }
  await db.owner.update({ where: { id: owner.id }, data });
  revalidatePath("/", "layout");
  return { ok: t("paySettingsSaved"), at: Date.now() };
}

/** Forget the Razorpay keys entirely and fall back to direct UPI. */
export async function removeRazorpay(_: FormState): Promise<FormState> {
  const owner = await requireOwner();
  const { t } = await getT();
  await db.owner.update({
    where: { id: owner.id },
    data: { razorpayKeyId: null, razorpayKeySecretEnc: null, razorpayWebhookSecretEnc: null, razorpayEnabled: false, paymentMode: "UPI" },
  });
  revalidatePath("/", "layout");
  return { ok: t("rzpRemoved"), at: Date.now() };
}
