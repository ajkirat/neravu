"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOwner, startSession } from "@/lib/auth";
import { str } from "@/lib/forms";
import { LANG_COOKIE, asLang } from "@/lib/i18n";
import { getT } from "@/lib/i18n/server";
import { normPhone } from "@/lib/phone";
import { tooMany } from "@/lib/throttle";
import type { FormState } from "@/components/action-form";

const MIN_PW = 6;

/** Public: a caretaker signs in with their mobile number and the password the owner set. */
export async function staffLogin(_: FormState, fd: FormData): Promise<FormState> {
  const { t } = await getT();
  if (await tooMany("staff-login", 10, 15 * 60 * 1000)) return { error: t("errTooManyLogin") };
  const phone = normPhone(str(fd, "phone"));
  const password = String(fd.get("password") ?? "");
  const staff = phone ? await db.staff.findUnique({ where: { phone }, include: { owner: { select: { language: true } } } }) : null;
  // Compare even when nobody matched, so the answer takes the same time either way.
  const hash = staff?.passwordHash ?? "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinva";
  const good = await bcrypt.compare(password, hash);
  if (!staff || !good || !staff.active) return { error: t("staffBadLogin") };
  await db.staff.update({ where: { id: staff.id }, data: { lastLoginAt: new Date() } });
  (await cookies()).set(LANG_COOKIE, asLang(staff.owner.language), { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  await startSession(staff.ownerId, staff.id);
  redirect("/dashboard");
}

export async function addStaff(_: FormState, fd: FormData): Promise<FormState> {
  const owner = await requireOwner();
  const { t } = await getT();
  const name = str(fd, "name").slice(0, 80);
  const phone = normPhone(str(fd, "phone"));
  const password = String(fd.get("password") ?? "");
  if (name.length < 2) return { error: t("errStaffName") };
  if (!phone) return { error: t("errStaffPhone") };
  if (password.length < MIN_PW) return { error: t("errStaffPassword") };
  if (await db.staff.findUnique({ where: { phone } })) return { error: t("errStaffPhoneTaken") };
  await db.staff.create({ data: { ownerId: owner.id, name, phone, passwordHash: await bcrypt.hash(password, 10) } });
  revalidatePath("/staff");
  return { ok: t("staffAdded"), at: Date.now() };
}

async function ownedStaff(ownerId: string, id: string) {
  return db.staff.findFirst({ where: { id, ownerId }, select: { id: true } });
}

export async function setStaffActive(id: string, active: boolean): Promise<void> {
  const owner = await requireOwner();
  if (!(await ownedStaff(owner.id, id))) return;
  await db.staff.update({ where: { id }, data: { active } });
  revalidatePath("/staff");
}

export async function resetStaffPassword(id: string, password: string): Promise<{ ok?: string; error?: string }> {
  const owner = await requireOwner();
  const { t } = await getT();
  if (!(await ownedStaff(owner.id, id))) return { error: t("errStaffName") };
  if (password.length < MIN_PW) return { error: t("errStaffPassword") };
  await db.staff.update({ where: { id }, data: { passwordHash: await bcrypt.hash(password, 10), passwordChangedAt: new Date() } });
  revalidatePath("/staff");
  return { ok: t("staffPwChanged") };
}

export async function deleteStaff(id: string): Promise<void> {
  const owner = await requireOwner();
  if (!(await ownedStaff(owner.id, id))) return;
  await db.staff.delete({ where: { id } });
  revalidatePath("/staff");
}

/**
 * The owner confirms they got a caretaker's cash. Only payments recorded up to the moment the
 * owner saw the amount are marked, so cash collected after that stays pending.
 */
export async function confirmCashHandover(staffId: string, upTo: string): Promise<void> {
  const owner = await requireOwner();
  const until = new Date(upTo);
  if (Number.isNaN(until.getTime())) return;
  await db.payment.updateMany({
    where: {
      recordedByStaffId: staffId,
      method: "CASH",
      handedOverAt: null,
      createdAt: { lte: until },
      tenant: { ownerId: owner.id },
    },
    data: { handedOverAt: new Date() },
  });
  revalidatePath("/", "layout");
}
