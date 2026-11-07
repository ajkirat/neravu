"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { str } from "@/lib/forms";
import { cleanJoin, phoneKey } from "@/lib/join";
import { tooMany } from "@/lib/throttle";
import { idFromForm, readIdForForm, type IdReadResult } from "@/lib/id-proof";
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
    emergencyName: str(fd, "emergencyName"),
    emergencyPhone: str(fd, "emergencyPhone"),
    permanentAddress: str(fd, "permanentAddress"),
    language: str(fd, "language"),
  });
  if ("error" in c) return { error: t(c.error) };
  if (str(fd, "confirm") !== "yes") return { error: t("errJoinConfirm") };
  const property = await db.property.findUnique({ where: { id: propertyId }, select: { id: true, ownerId: true } });
  if (!property) return { error: t("errBadLink") };
  // ID proof: a photo is required; its type and number are read from it, never typed.
  const id = await idFromForm(fd);
  if (!id) return { error: t("errIdPhoto") };
  if ("error" in id) return { error: t("idBadPhoto") };
  if (id.status === "unreadable") return { error: t("idUnreadable") };
  const idData = { idType: id.type, idNumber: id.number, idPhoto: id.photo, idPhotoMime: id.mime };

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
    await db.joinRequest.update({ where: { id: same.id }, data: { ...c.value, ...idData, propertyId: property.id } });
  } else {
    await db.joinRequest.create({ data: { ...c.value, ...idData, ownerId: property.ownerId, propertyId: property.id } });
  }
  revalidatePath("/", "layout");
  return { ok: t("joinThanks"), at: Date.now() };
}

/** Public: read the ID photo on the Join page, so the person sees what was read before sending. */
export async function readIdForJoin(propertyId: string, fd: FormData): Promise<IdReadResult | { error: string }> {
  const { t } = await getT();
  if (await tooMany("id-read", 12, 60 * 60 * 1000)) return { error: t("tryAgainLater") };
  if (!(await db.property.findUnique({ where: { id: propertyId }, select: { id: true } }))) return { error: t("errBadLink") };
  const file = fd.get("idPhoto");
  if (!(file instanceof File)) return { error: t("errIdPhoto") };
  const r = await readIdForForm(file);
  return "error" in r ? { error: t("idBadPhoto") } : r;
}

export async function rejectJoin(id: string): Promise<void> {
  const owner = await requireOwner();
  await db.joinRequest.updateMany({ where: { id, ownerId: owner.id, status: "PENDING" }, data: { status: "REJECTED" } });
  revalidatePath("/", "layout");
}
