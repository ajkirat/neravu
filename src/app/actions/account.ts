"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { currentOwner } from "@/lib/auth";
import { consumeToken, createToken } from "@/lib/auth-tokens";
import { emailEnabled, sendEmail } from "@/lib/email";
import { str } from "@/lib/forms";
import { asLang, makeT, type Lang } from "@/lib/i18n";
import { getT } from "@/lib/i18n/server";
import { tooMany } from "@/lib/throttle";
import { appOrigin } from "@/lib/url";
import type { FormState } from "@/components/action-form";

async function sendVerification(owner: { id: string; name: string; email: string; language: string }) {
  const t = makeT(asLang(owner.language) as Lang);
  const raw = await createToken(owner.id, "VERIFY");
  const url = `${await appOrigin()}/verify-email/${raw}`;
  return sendEmail({
    to: owner.email,
    subject: t("emailVerifySubject"),
    text: t("emailVerifyBody", { name: owner.name.split(" ")[0], url }),
  });
}

/** Used by signup: fire and forget, never blocks account creation. */
export async function sendVerificationEmail(owner: { id: string; name: string; email: string; language: string }) {
  if (!emailEnabled()) return;
  await sendVerification(owner).catch(() => false);
}

/** Always answers the same way, so nobody can use this form to find out which emails have accounts. */
export async function requestPasswordReset(_: FormState, fd: FormData): Promise<FormState> {
  const { t } = await getT();
  if (await tooMany("forgot", 5, 15 * 60 * 1000)) return { error: t("tryAgainLater") };
  if (!emailEnabled()) return { error: t("forgotNoEmail") };
  const email = str(fd, "email").toLowerCase();
  const owner = email ? await db.owner.findUnique({ where: { email } }) : null;
  if (owner) {
    // At most one fresh link per minute per account.
    const recent = await db.authToken.findFirst({
      where: { ownerId: owner.id, kind: "RESET", createdAt: { gt: new Date(Date.now() - 60_000) } },
    });
    if (!recent) {
      const ot = makeT(asLang(owner.language));
      const raw = await createToken(owner.id, "RESET");
      const url = `${await appOrigin()}/reset-password/${raw}`;
      await sendEmail({
        to: owner.email,
        subject: ot("emailResetSubject"),
        text: ot("emailResetBody", { name: owner.name.split(" ")[0], url }),
      });
    }
  }
  return { ok: t("forgotDone"), at: Date.now() };
}

export async function resetPassword(token: string, _: FormState, fd: FormData): Promise<FormState> {
  const { t } = await getT();
  const password = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirm") ?? "");
  if (password.length < 8) return { error: t("errPassword") };
  if (password !== confirm) return { error: t("resetMismatch") };
  const ownerId = await consumeToken(token, "RESET");
  if (!ownerId) return { error: t("resetBadLink") };
  const now = new Date();
  await db.owner.update({
    where: { id: ownerId },
    data: {
      passwordHash: await bcrypt.hash(password, 10),
      passwordChangedAt: now,
      emailVerifiedAt: now, // they just proved they own the inbox
    },
  });
  // Any other reset links for this account are no longer needed.
  await db.authToken.updateMany({ where: { ownerId, kind: "RESET", usedAt: null }, data: { usedAt: now } });
  redirect("/login?reset=1");
}

export async function resendVerification(_: FormState): Promise<FormState> {
  const { t } = await getT();
  const owner = await currentOwner();
  if (!owner || owner.emailVerifiedAt) return undefined;
  if (await tooMany("verify", 3, 60 * 60 * 1000)) return { error: t("tryAgainLater") };
  if (!emailEnabled()) return { error: t("forgotNoEmail") };
  await sendVerification(owner);
  return { ok: t("verifySent"), at: Date.now() };
}

/** Consumes a verification link; returns whether it worked. */
export async function verifyEmailToken(token: string): Promise<boolean> {
  const ownerId = await consumeToken(token, "VERIFY");
  if (!ownerId) return false;
  await db.owner.update({ where: { id: ownerId }, data: { emailVerifiedAt: new Date() } });
  return true;
}
