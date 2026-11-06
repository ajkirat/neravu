"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { str } from "@/lib/forms";
import { handleBankEmailFor, recordBankCredit, type InboxResult } from "@/lib/bank-inbox";
import { isDemoOwner } from "@/lib/demo";
import { ensurePayCode } from "@/lib/paycode-db";
import { summarizeLedger } from "@/lib/billing";
import { today } from "@/lib/dates";
import { tooMany } from "@/lib/throttle";
import type { MsgKey } from "@/lib/i18n";
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

/** Test or fallback for Option C: the owner uploads a bank alert email (.eml) they downloaded from Gmail. */
export async function uploadBankEmail(_: FormState, fd: FormData): Promise<FormState> {
  const owner = await requireOwner();
  const { t } = await getT();
  if (await tooMany(`bank-upload:${owner.id}`, 30, 60 * 60 * 1000)) return { error: t("tryAgainLater") };
  const file = fd.get("eml");
  if (!(file instanceof File) || file.size === 0) return { error: t("bankUploadPick") };
  if (file.size > 2 * 1024 * 1024) return { error: t("bankUploadBig") };
  const row = await db.owner.findUnique({ where: { id: owner.id }, select: { id: true, payConfirm: true, bankLast4: true } });
  if (!row) return { error: t("bankUploadPick") };
  const raw = await file.text();
  let r: { result: InboxResult; paymentId?: number };
  try {
    r = await handleBankEmailFor(row, raw);
  } catch {
    return { error: t("bankUp_failed") };
  }
  revalidatePath("/", "layout");
  const key = `bankUp_${r.result.replace(/-/g, "_")}` as MsgKey;
  const good = r.result === "matched" || r.result === "unmatched" || r.result === "forwarding-saved";
  return good ? { ok: t(key), at: Date.now() } : { error: t(key) };
}

/**
 * Demo account only: pretend a tenant's exact amount arrived in the bank, to show owners what Option C
 * feels like. Skips the email entirely and is refused for every real account.
 */
export async function simulateBankAlert(): Promise<{ ok?: string; error?: string }> {
  const owner = await requireOwner();
  const { t } = await getT();
  if (!isDemoOwner(owner.email)) return { error: t("demoOnly") };
  const tenants = await db.tenant.findMany({
    where: { ownerId: owner.id, status: { in: ["ACTIVE", "NOTICE"] } },
    select: { id: true, name: true, charges: { select: { amount: true, dueDate: true } }, payments: { select: { amount: true } } },
  });
  const owing = tenants
    .map((x) => ({ ...x, due: summarizeLedger(x.charges, x.payments, today()).outstanding }))
    .filter((x) => x.due > 0)
    .sort((a, b) => b.due - a.due)[0];
  if (!owing) return { error: t("simNobody") };
  const code = (await ensurePayCode(owner.id, owing.id)) ?? 0;
  const credit = await db.bankCredit.create({
    data: {
      ownerId: owner.id,
      amountPaise: owing.due * 100 + code,
      utr: `DEMO${Date.now().toString().slice(-8)}`,
      payer: "demo@upi",
      bank: "demo",
      status: "UNMATCHED",
      msgHash: `demo-${Date.now()}-${Math.random()}`,
    },
  });
  await recordBankCredit(credit.id, owing.id, "demo bank alert");
  revalidatePath("/", "layout");
  return { ok: t("simDone", { name: owing.name.split(" ")[0], amt: `₹${owing.due.toLocaleString("en-IN")}` }) };
}
