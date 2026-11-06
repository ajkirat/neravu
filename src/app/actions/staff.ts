"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { str } from "@/lib/forms";
import { getT } from "@/lib/i18n/server";
import { normPhone } from "@/lib/phone";
import { phoneTaken } from "@/lib/phone-taken";
import type { FormState } from "@/components/action-form";

const MIN_PW = 6;

export async function addStaff(_: FormState, fd: FormData): Promise<FormState> {
  const owner = await requireOwner();
  const { t } = await getT();
  const name = str(fd, "name").slice(0, 80);
  const phone = normPhone(str(fd, "phone"));
  const password = String(fd.get("password") ?? "");
  if (name.length < 2) return { error: t("errStaffName") };
  if (!phone) return { error: t("errStaffPhone") };
  if (password.length < MIN_PW) return { error: t("errStaffPassword") };
  if (await phoneTaken(phone, {}, "staff")) return { error: t("errStaffPhoneTaken") };
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
