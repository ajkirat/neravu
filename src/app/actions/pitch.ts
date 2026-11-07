"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { INTEREST, PITCH_DEFAULTS, cleanPains, cleanPitchInputs, type PitchInputs } from "@/lib/pitch";
import { tooMany } from "@/lib/throttle";

const text = (fd: FormData, k: string, max: number) => String(fd.get(k) ?? "").trim().slice(0, max);

/** Owner: save a pitch (their numbers, problems, interest). Returns its id for the PDF. */
export async function savePitch(fd: FormData): Promise<{ id?: string; error?: string }> {
  const owner = await requireOwner();
  const { t } = await getT();
  if (await tooMany(`pitch:${owner.id}`, 60, 60 * 60 * 1000)) return { error: t("tryAgainLater") };
  const prospectName = text(fd, "prospectName", 80);
  if (prospectName.length < 2) return { error: t("errPitchName") };
  const raw: Partial<Record<keyof PitchInputs, unknown>> = {};
  for (const k of Object.keys(PITCH_DEFAULTS) as (keyof PitchInputs)[]) raw[k] = fd.get(`in_${k}`) ?? undefined;
  const pains = cleanPains(fd.getAll("pain").map(String));
  const interest = String(fd.get("interest") ?? "");
  const wouldPay = Number(String(fd.get("wouldPay") ?? "").replace(/\D/g, ""));
  const p = await db.pitch.create({
    data: {
      ownerId: owner.id,
      prospectName,
      prospectPhone: text(fd, "prospectPhone", 20) || null,
      pgName: text(fd, "pgName", 80) || null,
      city: text(fd, "city", 60) || null,
      inputs: cleanPitchInputs(raw),
      pains,
      otherPains: text(fd, "otherPains", 1000) || null,
      wouldPay: Number.isFinite(wouldPay) && wouldPay > 0 ? Math.min(wouldPay, 1_000_000) : null,
      interest: (INTEREST as readonly string[]).includes(interest) ? interest : null,
    },
  });
  revalidatePath("/settings/pitch");
  return { id: p.id };
}

export async function deletePitch(id: string): Promise<void> {
  const owner = await requireOwner();
  await db.pitch.deleteMany({ where: { id, ownerId: owner.id } });
  revalidatePath("/settings/pitch");
}
