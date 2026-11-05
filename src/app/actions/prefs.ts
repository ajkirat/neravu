"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { currentOwner } from "@/lib/auth";
import { LANG_COOKIE, isLang } from "@/lib/i18n";

const YEAR = 60 * 60 * 24 * 365;
const TEXT_COOKIE = "neravu_text";

/** Switch the app language for this browser, and remember it on the owner's account. */
export async function setLanguage(lang: string): Promise<void> {
  if (!isLang(lang)) return;
  (await cookies()).set(LANG_COOKIE, lang, { path: "/", maxAge: YEAR, sameSite: "lax" });
  const owner = await currentOwner();
  if (owner) await db.owner.update({ where: { id: owner.id }, data: { language: lang } });
  revalidatePath("/", "layout");
}

export async function setTextSize(size: "normal" | "lg"): Promise<void> {
  (await cookies()).set(TEXT_COOKIE, size === "lg" ? "lg" : "normal", { path: "/", maxAge: YEAR, sameSite: "lax" });
  revalidatePath("/", "layout");
}
