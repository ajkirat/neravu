"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { optStr, str } from "@/lib/forms";
import { getT } from "@/lib/i18n/server";
import type { FormState } from "@/components/action-form";

export async function saveSettings(_: FormState, fd: FormData): Promise<FormState> {
  const owner = await requireOwner();
  const { t } = await getT();
  const name = str(fd, "name");
  if (!name) return { error: t("errName") };
  await db.owner.update({
    where: { id: owner.id },
    data: { name, phone: optStr(fd, "phone"), businessName: optStr(fd, "businessName"), houseRules: optStr(fd, "houseRules")?.slice(0, 800) ?? null },
  });
  revalidatePath("/", "layout");
  return { ok: t("settingsSaved"), at: Date.now() };
}
