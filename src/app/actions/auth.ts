"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { cookies } from "next/headers";
import { getT } from "@/lib/i18n/server";
import { tooMany } from "@/lib/throttle";
import { sendVerificationEmail } from "./account";
import { LANG_COOKIE, asLang } from "@/lib/i18n";
import { db } from "@/lib/db";
import { str } from "@/lib/forms";
import { nameMatches, normName } from "@/lib/login";
import { normPhone } from "@/lib/phone";
import { phoneTaken } from "@/lib/phone-taken";
import { endSession, startSession } from "@/lib/auth";
import type { FormState } from "@/components/action-form";

const signupSchema = (t: Awaited<ReturnType<typeof getT>>["t"]) =>
  z.object({
    name: z.string().trim().min(2, t("errName")).max(80),
    phone: z.string().trim(),
    email: z.union([z.literal(""), z.email(t("errEmail")).trim().toLowerCase()]).optional(),
    password: z.string().min(8, t("errPassword")),
  });

export async function signup(_: FormState, fd: FormData): Promise<FormState> {
  const { t, lang } = await getT();
  const parsed = signupSchema(t).safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, password } = parsed.data;
  const phoneKey = normPhone(parsed.data.phone);
  if (!phoneKey) return { error: t("errMobile") };
  if (await phoneTaken(phoneKey)) return { error: t("errMobileTaken") };
  const email = parsed.data.email || null;
  if (email && (await db.owner.findUnique({ where: { email } }))) return { error: t("errExists") };
  const owner = await db.owner.create({
    data: { name, email, phone: parsed.data.phone, phoneKey, passwordHash: await bcrypt.hash(password, 10), language: lang },
  });
  if (email) await sendVerificationEmail({ id: owner.id, name: owner.name, email, language: lang });
  await startSession(owner.id);
  redirect("/dashboard");
}

// Compared when nobody matched, so a wrong number takes as long to answer as a wrong password.
const NO_HASH = "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinva";

/**
 * Public: one sign-in for owners and caretakers. Mobile, name and password are all required and all
 * must match. The name may be the full name or the first name, in any case.
 */
export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const { t } = await getT();
  if (await tooMany("login", 10, 15 * 60 * 1000)) return { error: t("errTooManyLogin") };
  const phone = normPhone(str(fd, "phone"));
  const name = str(fd, "name");
  const password = String(fd.get("password") ?? "");
  if (!phone) return { error: t("errMobile") };
  if (normName(name).length < 2) return { error: t("errLoginName") };
  if (!password) return { error: t("errLoginPassword") };

  const [owner, staff] = await Promise.all([
    db.owner.findUnique({ where: { phoneKey: phone }, select: { id: true, name: true, passwordHash: true, language: true } }),
    db.staff.findUnique({ where: { phone }, include: { owner: { select: { language: true } } } }),
  ]);
  const setLang = async (l: string) =>
    (await cookies()).set(LANG_COOKIE, asLang(l), { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });

  if (owner && nameMatches(name, owner.name) && (await bcrypt.compare(password, owner.passwordHash))) {
    // Open in the language the owner last chose, on any device.
    await setLang(owner.language);
    await startSession(owner.id);
    redirect("/dashboard");
  }
  if (staff && staff.active && nameMatches(name, staff.name) && (await bcrypt.compare(password, staff.passwordHash))) {
    await db.staff.update({ where: { id: staff.id }, data: { lastLoginAt: new Date() } });
    await setLang(staff.owner.language);
    await startSession(staff.ownerId, staff.id);
    redirect("/dashboard");
  }
  if (!owner && !staff) await bcrypt.compare(password, NO_HASH);
  return { error: t("errLogin") };
}

export async function logout() {
  await endSession();
  redirect("/login");
}
