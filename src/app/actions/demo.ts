"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { isDemoOwner } from "@/lib/demo";
import { clearOwnerData, fillDemo } from "@/lib/demo-seed";
import { tooMany } from "@/lib/throttle";
import { getT } from "@/lib/i18n/server";
import type { FormState } from "@/components/action-form";

/** Wipe the demo account and fill it with fresh sample data. Refused for any other account. */
export async function resetDemo(_: FormState): Promise<FormState> {
  const owner = await requireOwner();
  const { t } = await getT();
  if (!isDemoOwner(owner.email)) return { error: t("demoOnly") };
  if (await tooMany(`demo-reset:${owner.id}`, 10, 60 * 60 * 1000)) return { error: t("tryAgainLater") };
  await clearOwnerData(db, owner.id);
  await fillDemo(db, owner.id);
  revalidatePath("/", "layout");
  return { ok: t("demoDone"), at: Date.now() };
}
