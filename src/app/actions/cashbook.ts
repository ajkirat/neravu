"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { parseDateInput } from "@/lib/dates";
import { int, optStr, str } from "@/lib/forms";
import { getT } from "@/lib/i18n/server";
import type { FormState } from "@/components/action-form";

/** Close a day in the cash book, optionally with the cash counted in hand. */
export async function closeDay(_: FormState, fd: FormData): Promise<FormState> {
  const owner = await requireOwner();
  const { t } = await getT();
  const day = parseDateInput(str(fd, "day"));
  if (!day) return { error: t("errDate") };
  const counted = str(fd, "cashCounted") ? int(fd, "cashCounted") : null;
  if (counted !== null && (counted < 0 || counted > 100_000_000)) return { error: t("errAmount") };
  const note = optStr(fd, "note")?.slice(0, 300) ?? null;
  await db.dayClose.upsert({
    where: { ownerId_day: { ownerId: owner.id, day } },
    create: { ownerId: owner.id, day, cashCounted: counted, note },
    update: { cashCounted: counted, note, closedAt: new Date() },
  });
  revalidatePath("/cashbook");
  return { ok: t("cbClosedOk"), at: Date.now() };
}

export async function reopenDay(day: string): Promise<void> {
  const owner = await requireOwner();
  const d = parseDateInput(day);
  if (d) await db.dayClose.deleteMany({ where: { ownerId: owner.id, day: d } });
  revalidatePath("/cashbook");
}
