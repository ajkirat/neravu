"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { str } from "@/lib/forms";
import { cleanJoin, phoneKey } from "@/lib/join";
import { tooMany } from "@/lib/throttle";
import { getT } from "@/lib/i18n/server";
import type { FormState } from "@/components/action-form";

/** Public: submitted from the Join page (property QR or WhatsApp link). No login. */
export async function submitJoin(propertyId: string, _: FormState, fd: FormData): Promise<FormState> {
  const { t } = await getT();
  // Honeypot: real people never fill the hidden "website" field.
  if (str(fd, "website")) return { ok: t("joinThanks"), at: Date.now() };
  if (await tooMany("join", 6, 15 * 60 * 1000)) return { error: t("tryAgainLater") };
  const c = cleanJoin({
    name: str(fd, "name"),
    phone: str(fd, "phone"),
    email: str(fd, "email"),
    occupation: str(fd, "occupation"),
    idType: str(fd, "idType"),
    idNumber: str(fd, "idNumber"),
    emergencyName: str(fd, "emergencyName"),
    emergencyPhone: str(fd, "emergencyPhone"),
    language: str(fd, "language"),
  });
  if ("error" in c) return { error: t(c.error) };
  if (str(fd, "confirm") !== "yes") return { error: t("errJoinConfirm") };
  const property = await db.property.findUnique({ where: { id: propertyId }, select: { id: true, ownerId: true } });
  if (!property) return { error: t("errBadLink") };

  const key = phoneKey(c.value.phone);
  const staying = await db.tenant.findMany({
    where: { ownerId: property.ownerId, status: { in: ["ACTIVE", "NOTICE"] } },
    select: { phone: true },
  });
  if (staying.some((s) => phoneKey(s.phone) === key)) return { error: t("errJoinAlready") };

  const pending = await db.joinRequest.findMany({
    where: { ownerId: property.ownerId, status: "PENDING" },
    select: { id: true, phone: true },
  });
  if (pending.length >= 200) return { error: t("errContactOwner") };
  const same = pending.find((p) => phoneKey(p.phone) === key);
  if (same) {
    // Same person filling it twice: keep the latest answers, don't make a second entry.
    await db.joinRequest.update({ where: { id: same.id }, data: { ...c.value, propertyId: property.id } });
  } else {
    await db.joinRequest.create({ data: { ...c.value, ownerId: property.ownerId, propertyId: property.id } });
  }
  revalidatePath("/", "layout");
  return { ok: t("joinThanks"), at: Date.now() };
}

export async function rejectJoin(id: string): Promise<void> {
  const owner = await requireOwner();
  await db.joinRequest.updateMany({ where: { id, ownerId: owner.id, status: "PENDING" }, data: { status: "REJECTED" } });
  revalidatePath("/", "layout");
}
