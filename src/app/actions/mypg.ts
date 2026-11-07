"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { addDays, parseDateInput, today } from "@/lib/dates";
import { optStr, str } from "@/lib/forms";
import { tooMany } from "@/lib/throttle";
import { getT } from "@/lib/i18n/server";
import type { FormState } from "@/components/action-form";

async function tenantFor(token: string) {
  if (!/^[a-f0-9]{32}$/.test(token)) return null;
  return db.tenant.findUnique({
    where: { payToken: token },
    select: { id: true, ownerId: true, propertyId: true, status: true, moveInDate: true },
  });
}

async function shrinkPhoto(file: File): Promise<{ data: Uint8Array<ArrayBuffer>; mime: string } | null> {
  if (!file.type.startsWith("image/") || file.size === 0 || file.size > 8 * 1024 * 1024) return null;
  try {
    const sharp = (await import("sharp")).default;
    const out = await sharp(Buffer.from(await file.arrayBuffer())).rotate().resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 70 }).toBuffer();
    return { data: Uint8Array.from(out), mime: "image/jpeg" };
  } catch {
    return null;
  }
}

/** Public, from the tenant's My PG link: report a problem, optionally with a photo. */
// A recorded or chosen video, after the phone has made it small (see ComplaintMedia).
const VIDEO_LIMIT = 3_600_000;

/** MP4 / MOV ("ftyp" box) or WebM (EBML header), from the first bytes; null for anything else. */
function videoKind(b: Uint8Array): string | null {
  if (b.length > 12 && b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) {
    const brand = String.fromCharCode(b[8], b[9], b[10], b[11]);
    return brand === "qt  " ? "video/quicktime" : "video/mp4";
  }
  if (b.length > 4 && b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return "video/webm";
  return null;
}

export async function submitTenantComplaint(token: string, _: FormState, fd: FormData): Promise<FormState> {
  const { t } = await getT();
  if (await tooMany("tenant-complaint", 8, 60 * 60 * 1000)) return { error: t("tryAgainLater") };
  const tn = await tenantFor(token);
  if (!tn || tn.status === "MOVED_OUT") return { error: t("errBadLink") };
  const title = str(fd, "title").slice(0, 200);
  if (!title) return { error: t("mpComplaintNeedTitle") };
  const open = await db.complaint.count({ where: { tenantId: tn.id, status: { not: "RESOLVED" }, source: "TENANT" } });
  if (open >= 10) return { error: t("tryAgainLater") };
  const file = fd.get("photo");
  const photo = file instanceof File && file.size > 0 ? await shrinkPhoto(file) : null;
  if (file instanceof File && file.size > 0 && !photo) return { error: t("mpBadPhoto") };
  const vf = fd.get("video");
  let video: { data: Uint8Array<ArrayBuffer>; mime: string } | null = null;
  if (vf instanceof File && vf.size > 0) {
    if (vf.size > VIDEO_LIMIT) return { error: t("mpVideoTooBig") };
    const bytes = new Uint8Array(await vf.arrayBuffer());
    // The label a phone gives a recording is unreliable, so look at the file itself.
    const mime = videoKind(bytes);
    if (!mime) return { error: t("mpBadVideo") };
    video = { data: bytes, mime };
  }
  await db.complaint.create({
    data: {
      ownerId: tn.ownerId,
      tenantId: tn.id,
      propertyId: tn.propertyId,
      title,
      details: optStr(fd, "details")?.slice(0, 1000) ?? null,
      source: "TENANT",
      photo: photo?.data,
      photoMime: photo?.mime,
      video: video?.data,
      videoMime: video?.mime,
    },
  });
  revalidatePath("/", "layout");
  return { ok: t("mpComplaintSent"), at: Date.now() };
}

/** Public: the tenant says they want to leave. It becomes a request the owner accepts; nothing changes by itself. */
export async function requestLeave(token: string, _: FormState, fd: FormData): Promise<FormState> {
  const { t } = await getT();
  if (await tooMany("tenant-leave", 6, 60 * 60 * 1000)) return { error: t("tryAgainLater") };
  const tn = await tenantFor(token);
  if (!tn || tn.status !== "ACTIVE") return { error: t("errBadLink") };
  const date = parseDateInput(str(fd, "date"));
  if (!date || date < today() || date > addDays(today(), 365)) return { error: t("mpLeaveBadDate") };
  const pending = await db.tenantRequest.findFirst({ where: { tenantId: tn.id, kind: "NOTICE", status: "PENDING" } });
  const data = { date, note: optStr(fd, "note")?.slice(0, 300) ?? null };
  if (pending) await db.tenantRequest.update({ where: { id: pending.id }, data });
  else await db.tenantRequest.create({ data: { ...data, ownerId: tn.ownerId, tenantId: tn.id, kind: "NOTICE" } });
  revalidatePath("/", "layout");
  return { ok: t("mpLeaveSent"), at: Date.now() };
}
