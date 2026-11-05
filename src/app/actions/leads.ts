"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { parseDateInput } from "@/lib/dates";
import { optStr, str } from "@/lib/forms";
import { LEAD_STATUSES, cleanEnquiry } from "@/lib/leads";
import { tooMany } from "@/lib/throttle";
import { getT } from "@/lib/i18n/server";
import type { FormState } from "@/components/action-form";

export async function createLead(_: FormState, fd: FormData): Promise<FormState> {
  const { t: tr } = await getT();
  const owner = await requireOwner();
  const c = cleanEnquiry({ name: str(fd, "name"), phone: str(fd, "phone"), note: str(fd, "note") });
  if ("error" in c) return { error: c.error };
  const propertyId = optStr(fd, "propertyId");
  if (propertyId && !(await db.property.findFirst({ where: { id: propertyId, ownerId: owner.id } }))) {
    return { error: tr("errPropertyNotFound") };
  }
  await db.lead.create({
    data: {
      ownerId: owner.id,
      propertyId,
      name: c.value.name,
      phone: c.value.phone,
      note: c.value.note || null,
      source: "MANUAL",
      followUpOn: parseDateInput(str(fd, "followUpOn")),
    },
  });
  revalidatePath("/", "layout");
  return { ok: tr("leadAdded"), at: Date.now() };
}

export async function setLeadStatus(id: string, status: string): Promise<void> {
  const owner = await requireOwner();
  if (!LEAD_STATUSES.includes(status as never)) return;
  await db.lead.updateMany({ where: { id, ownerId: owner.id }, data: { status } });
  revalidatePath("/", "layout");
}

export async function setLeadFollowUp(id: string, date: string): Promise<void> {
  const owner = await requireOwner();
  await db.lead.updateMany({ where: { id, ownerId: owner.id }, data: { followUpOn: parseDateInput(date) } });
  revalidatePath("/", "layout");
}

export async function deleteLead(id: string): Promise<void> {
  const owner = await requireOwner();
  await db.lead.deleteMany({ where: { id, ownerId: owner.id } });
  revalidatePath("/", "layout");
}

/** Public: submitted from the QR-code enquiry page. No login. */
export async function submitEnquiry(propertyId: string, _: FormState, fd: FormData): Promise<FormState> {
  const { t: tr } = await getT();
  const { t } = await getT();
  // Honeypot: real people never fill the hidden "website" field.
  if (str(fd, "website")) return { ok: t("enquireThanks"), at: Date.now() };
  if (await tooMany("enquiry", 8, 15 * 60 * 1000)) return { error: tr("tryAgainLater") };
  const c = cleanEnquiry({ name: str(fd, "name"), phone: str(fd, "phone"), note: str(fd, "note") });
  if ("error" in c) return { error: c.error };
  const property = await db.property.findUnique({ where: { id: propertyId }, select: { id: true, ownerId: true } });
  if (!property) return { error: tr("errBadLink") };
  if ((await db.lead.count({ where: { ownerId: property.ownerId } })) >= 5000) {
    return { error: tr("errContactOwner") };
  }
  await db.lead.create({
    data: {
      ownerId: property.ownerId,
      propertyId: property.id,
      name: c.value.name,
      phone: c.value.phone,
      note: c.value.note || null,
      source: "QR",
    },
  });
  revalidatePath("/", "layout");
  return { ok: t("enquireThanks"), at: Date.now() };
}
