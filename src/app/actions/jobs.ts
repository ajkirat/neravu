"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireActor, requireOwner } from "@/lib/auth";
import { addDays, parseDateInput, today } from "@/lib/dates";
import { int, optStr, str } from "@/lib/forms";
import { nextAfterDone } from "@/lib/jobs";
import { getT } from "@/lib/i18n/server";
import type { FormState } from "@/components/action-form";

export async function addJob(_: FormState, fd: FormData): Promise<FormState> {
  const owner = await requireOwner();
  const { t } = await getT();
  const title = str(fd, "title").slice(0, 120);
  if (!title) return { error: t("jobErrTitle") };
  const every = int(fd, "every");
  if (!every || every < 1 || every > 730) return { error: t("jobErrEvery") };
  const propertyId = optStr(fd, "propertyId");
  if (propertyId && !(await db.property.findFirst({ where: { id: propertyId, ownerId: owner.id } }))) return { error: t("errPropertyNotFound") };
  const nextDue = parseDateInput(str(fd, "nextDue")) ?? today();
  await db.recurringJob.create({ data: { ownerId: owner.id, title, everyDays: every, nextDue, propertyId } });
  revalidatePath("/", "layout");
  return { ok: t("jobAdded"), at: Date.now() };
}

/** Done today (owner or caretaker): next due date moves on by the job's interval. */
export async function jobDone(id: string): Promise<{ ok?: string; error?: string }> {
  const { owner, staff } = await requireActor();
  const { t } = await getT();
  const j = await db.recurringJob.findFirst({ where: { id, ownerId: owner.id, active: true } });
  if (!j) return { error: t("claimGone") };
  const done = today();
  await db.$transaction([
    db.serviceLog.create({ data: { ownerId: owner.id, jobId: j.id, doneOn: done, byName: staff?.name ?? null } }),
    db.recurringJob.update({ where: { id }, data: { lastDone: done, lastDoneBy: staff?.name ?? null, nextDue: nextAfterDone(done, j.everyDays) } }),
  ]);
  revalidatePath("/", "layout");
  return { ok: t("jobDoneOk") };
}

/** Not today: remind again in 3 days. */
export async function jobLater(id: string): Promise<{ ok?: string; error?: string }> {
  const { owner } = await requireActor();
  await db.recurringJob.updateMany({ where: { id, ownerId: owner.id }, data: { nextDue: addDays(today(), 3) } });
  revalidatePath("/", "layout");
  return { ok: "ok" };
}

export async function deleteJob(id: string): Promise<{ ok?: string; error?: string }> {
  const owner = await requireOwner();
  await db.recurringJob.deleteMany({ where: { id, ownerId: owner.id } });
  revalidatePath("/", "layout");
  return { ok: "ok" };
}
