"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { TESTING_PHASE } from "@/lib/testing";
import { TEST_STAFF_NAME, TEST_STAFF_PASSWORD, addTestData, removeTestData } from "@/lib/test-data";
import { tooMany } from "@/lib/throttle";
import type { FormState } from "@/components/action-form";

/** Owner-only, testing phase only: add one sample PG with a bit of everything (replaces an earlier one). */
export async function addTestDataAction(_: FormState): Promise<FormState> {
  const owner = await requireOwner();
  const { t } = await getT();
  if (!TESTING_PHASE) return { error: t("testDataOff") };
  if (await tooMany(`test-data:${owner.id}`, 10, 60 * 60 * 1000)) return { error: t("tryAgainLater") };
  const { staffPhone } = await addTestData(owner.id);
  revalidatePath("/", "layout");
  return { ok: t("testDataAdded", { phone: staffPhone, name: TEST_STAFF_NAME, pw: TEST_STAFF_PASSWORD }), at: Date.now() };
}

/** Owner-only: delete exactly what "Add test data" created. */
export async function removeTestDataAction(_: FormState): Promise<FormState> {
  const owner = await requireOwner();
  const { t } = await getT();
  await removeTestData(owner.id);
  revalidatePath("/", "layout");
  return { ok: t("testDataRemoved"), at: Date.now() };
}
