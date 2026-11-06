"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { optStr, str } from "@/lib/forms";
import { getT } from "@/lib/i18n/server";
import { normPhone } from "@/lib/phone";
import { phoneTaken } from "@/lib/phone-taken";
import type { FormState } from "@/components/action-form";

export async function saveSettings(_: FormState, fd: FormData): Promise<FormState> {
  const owner = await requireOwner();
  const { t } = await getT();
  const name = str(fd, "name");
  if (name.length < 2) return { error: t("errName") };
  // The mobile is the sign-in, so it can't be blank or belong to someone else.
  const phone = str(fd, "phone");
  const phoneKey = normPhone(phone);
  if (!phoneKey) return { error: t("errMobile") };
  if (await phoneTaken(phoneKey, { ownerId: owner.id })) return { error: t("errMobileTaken") };
  await db.owner.update({
    where: { id: owner.id },
    data: { name: name.slice(0, 80), phone, phoneKey, businessName: optStr(fd, "businessName"), houseRules: optStr(fd, "houseRules")?.slice(0, 800) ?? null },
  });
  revalidatePath("/", "layout");
  return { ok: t("settingsSaved"), at: Date.now() };
}
