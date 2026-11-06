"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { str } from "@/lib/forms";
import { recordBankCredit } from "@/lib/bank-inbox";
import { getT } from "@/lib/i18n/server";
import type { FormState } from "@/components/action-form";

/** Owner picks how tenants' UPI payments get confirmed: A (owner checks) or C (bank emails). */
export async function savePayConfirm(_: FormState, fd: FormData): Promise<FormState> {
  const owner = await requireOwner();
  const { t } = await getT();
  const mode = str(fd, "payConfirm") === "BANK" ? "BANK" : "OWNER";
  const last4 = str(fd, "bankLast4").replace(/\D/g, "");
  if (mode === "BANK" && last4.length !== 4) return { error: t("errLast4") };
  const row = await db.owner.findUnique({ where: { id: owner.id }, select: { bankInbox: true } });
  await db.owner.update({
    where: { id: owner.id },
    data: {
      payConfirm: mode,
      bankLast4: last4.length === 4 ? last4 : null,
      // Unguessable, so nobody else can send emails into this owner's inbox.
      bankInbox: row?.bankInbox ?? (mode === "BANK" ? randomBytes(12).toString("hex") : null),
    },
  });
  revalidatePath("/", "layout");
  return { ok: t("settingsSaved"), at: Date.now() };
}

/** A bank credit Neravu could not match: the owner says whose it is. */
export async function assignCredit(creditId: string, tenantId: string): Promise<{ ok?: string; error?: string }> {
  const owner = await requireOwner();
  const { t } = await getT();
  const [c, tn] = await Promise.all([
    db.bankCredit.findFirst({ where: { id: creditId, ownerId: owner.id, status: "UNMATCHED" } }),
    db.tenant.findFirst({ where: { id: tenantId, ownerId: owner.id } }),
  ]);
  if (!c || !tn) return { error: t("claimGone") };
  const id = await recordBankCredit(c.id, tn.id, "owner");
  revalidatePath("/", "layout");
  return id ? { ok: t("creditAssigned", { name: tn.name.split(" ")[0] }) } : { error: t("claimGone") };
}

/** Not rent (a refund, a friend, a mistake): hide it from the Today list. */
export async function ignoreCredit(creditId: string): Promise<{ ok?: string; error?: string }> {
  const owner = await requireOwner();
  await db.bankCredit.updateMany({ where: { id: creditId, ownerId: owner.id, status: "UNMATCHED" }, data: { status: "IGNORED" } });
  revalidatePath("/", "layout");
  return { ok: "ok" };
}
