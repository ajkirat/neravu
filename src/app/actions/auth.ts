"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { cookies } from "next/headers";
import { getT } from "@/lib/i18n/server";
import { LANG_COOKIE, asLang } from "@/lib/i18n";
import { db } from "@/lib/db";
import { endSession, startSession } from "@/lib/auth";
import type { FormState } from "@/components/action-form";

const signupSchema = (t: Awaited<ReturnType<typeof getT>>["t"]) =>
  z.object({
    name: z.string().trim().min(2, t("errName")),
    email: z.email(t("errEmail")).trim().toLowerCase(),
    phone: z.string().trim().optional(),
    password: z.string().min(8, t("errPassword")),
  });

export async function signup(_: FormState, fd: FormData): Promise<FormState> {
  const { t, lang } = await getT();
  const parsed = signupSchema(t).safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, email, phone, password } = parsed.data;
  if (await db.owner.findUnique({ where: { email } })) {
    return { error: t("errExists") };
  }
  const owner = await db.owner.create({
    data: { name, email, phone: phone || null, passwordHash: await bcrypt.hash(password, 10), language: lang },
  });
  await startSession(owner.id);
  redirect("/dashboard");
}

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const owner = await db.owner.findUnique({ where: { email } });
  if (!owner || !(await bcrypt.compare(password, owner.passwordHash))) {
    return { error: (await getT()).t("errLogin") };
  }
  // Open in the language the owner last chose, on any device.
  (await cookies()).set(LANG_COOKIE, asLang(owner.language), { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  await startSession(owner.id);
  redirect("/dashboard");
}

export async function logout() {
  await endSession();
  redirect("/login");
}
