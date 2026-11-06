"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { today } from "@/lib/dates";
import { getT } from "@/lib/i18n/server";

/** Owner accepts a tenant's request to leave: the tenant goes on notice with that date. */
export async function acceptLeave(id: string): Promise<{ ok?: string; error?: string }> {
  const owner = await requireOwner();
  const { t } = await getT();
  const r = await db.tenantRequest.findFirst({ where: { id, ownerId: owner.id, status: "PENDING", kind: "NOTICE" }, include: { tenant: true } });
  if (!r || !r.date) return { error: t("claimGone") };
  if (r.tenant.status === "ACTIVE") {
    await db.tenant.update({ where: { id: r.tenantId }, data: { status: "NOTICE", noticeDate: today(), moveOutDate: r.date } });
  }
  await db.tenantRequest.update({ where: { id }, data: { status: "DONE" } });
  revalidatePath("/", "layout");
  return { ok: t("noticeRecorded") };
}

export async function dismissRequest(id: string): Promise<{ ok?: string; error?: string }> {
  const owner = await requireOwner();
  await db.tenantRequest.updateMany({ where: { id, ownerId: owner.id, status: "PENDING" }, data: { status: "DISMISSED" } });
  revalidatePath("/", "layout");
  return { ok: "ok" };
}

/** Pause all reminders for one tenant (illness, agreed delay…), or resume them. */
export async function pauseReminders(tenantId: string, days: number): Promise<void> {
  const owner = await requireOwner();
  const until = days > 0 ? new Date(Date.now() + Math.min(days, 90) * 86400_000) : null;
  await db.tenant.updateMany({ where: { id: tenantId, ownerId: owner.id }, data: { remindersPausedUntil: until } });
  revalidatePath("/", "layout");
}
