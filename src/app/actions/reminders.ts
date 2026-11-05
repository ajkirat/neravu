"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireActor, requireOwner } from "@/lib/auth";

/** Record that the owner just sent a reminder to this tenant. */
export async function markReminded(tenantId: string): Promise<void> {
  const { owner } = await requireActor();
  await db.tenant.updateMany({ where: { id: tenantId, ownerId: owner.id }, data: { lastRemindedAt: new Date() } });
  revalidatePath("/reminders");
}
