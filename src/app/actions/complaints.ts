"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { optStr, str } from "@/lib/forms";
import { getT } from "@/lib/i18n/server";
import type { FormState } from "@/components/action-form";

const STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED"];

export async function createComplaint(_: FormState, fd: FormData): Promise<FormState> {
  const owner = await requireOwner();
  const { t } = await getT();
  const title = str(fd, "title").slice(0, 200);
  if (!title) return { error: t("complaintTitleLabel") };
  const tenantId = optStr(fd, "tenantId");
  let propertyId: string | null = null;
  if (tenantId) {
    const tenant = await db.tenant.findFirst({ where: { id: tenantId, ownerId: owner.id }, select: { propertyId: true } });
    if (!tenant) return { error: t("whichTenant") };
    propertyId = tenant.propertyId;
  }
  await db.complaint.create({
    data: { ownerId: owner.id, tenantId, propertyId, title, details: optStr(fd, "details")?.slice(0, 1000) ?? null },
  });
  revalidatePath("/", "layout");
  return { ok: t("complaintAdded"), at: Date.now() };
}

export async function setComplaintStatus(id: string, status: string): Promise<void> {
  const owner = await requireOwner();
  if (!STATUSES.includes(status)) return;
  await db.complaint.updateMany({ where: { id, ownerId: owner.id }, data: { status } });
  revalidatePath("/", "layout");
}

export async function deleteComplaint(id: string): Promise<void> {
  const owner = await requireOwner();
  await db.complaint.deleteMany({ where: { id, ownerId: owner.id } });
  revalidatePath("/", "layout");
}
