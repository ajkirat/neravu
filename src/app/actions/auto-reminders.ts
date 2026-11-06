"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { ownerSelect, runForOwner } from "@/lib/auto-reminders";
import { rupees } from "@/lib/format";
import { asLang } from "@/lib/i18n";
import { getT } from "@/lib/i18n/server";
import { tooMany } from "@/lib/throttle";
import { isQuietHours } from "@/lib/dates";
import { sendTemplate, templateNames, whatsappConfigured } from "@/lib/whatsapp";
import type { FormState } from "@/components/action-form";

const BEFORE = [0, 1, 2, 3, 5, 7];
const EVERY = [0, 2, 3, 5, 7];

export async function saveAutoReminders(_: FormState, fd: FormData): Promise<FormState> {
  const owner = await requireOwner();
  const { t } = await getT();
  const enabled = fd.get("enabled") === "on";
  const before = Number(fd.get("before"));
  const every = Number(fd.get("every"));
  if (!BEFORE.includes(before) || !EVERY.includes(every)) return { error: t("autoNotConnected") };
  if (enabled && !whatsappConfigured()) return { error: t("autoNeedWhatsapp") };
  await db.owner.update({ where: { id: owner.id }, data: { autoReminders: enabled, remindBefore: before, remindOverdueEvery: every, autoReceipts: fd.get("receipts") === "on" } });
  revalidatePath("/", "layout");
  return { ok: t("autoSaved"), at: Date.now() };
}

/** The owner runs today's reminders right now, instead of waiting for the daily job. */
export async function sendRemindersNow(): Promise<{ ok?: string; error?: string }> {
  const owner = await requireOwner();
  const { t } = await getT();
  if (!whatsappConfigured()) return { error: t("autoNeedWhatsapp") };
  if (isQuietHours()) return { error: t("quietHours") };
  if (await tooMany(`rem-now:${owner.id}`, 5, 60 * 60 * 1000)) return { error: t("tryAgainLater") };
  const row = await db.owner.findUnique({ where: { id: owner.id }, select: ownerSelect });
  if (!row) return { error: "?" };
  const r = await runForOwner(row);
  revalidatePath("/", "layout");
  return { ok: t("autoSentResult", { sent: r.sent, failed: r.failed }), ...(r.stopped ? { error: r.stopped } : {}) };
}

/** A sample message to the owner's own phone: proves WhatsApp and the templates work. */
export async function sendTestMessage(): Promise<{ ok?: string; error?: string }> {
  const owner = await requireOwner();
  const { t } = await getT();
  if (!whatsappConfigured()) return { error: t("autoNeedWhatsapp") };
  if (!owner.phone || owner.phone.replace(/\D/g, "").length < 10) return { error: t("autoTestNeedPhone") };
  if (await tooMany(`rem-test:${owner.id}`, 5, 60 * 60 * 1000)) return { error: t("tryAgainLater") };
  const res = await sendTemplate({
    phone: owner.phone,
    template: templateNames().overdue,
    language: asLang(owner.language),
    params: [owner.name.split(" ")[0], owner.businessName ?? owner.name, rupees(1000), owner.phone],
  });
  await db.reminderLog.create({
    data: { ownerId: owner.id, kind: "TEST", status: res.ok ? "SENT" : "FAILED", detail: res.ok ? null : res.detail.slice(0, 200) },
  });
  revalidatePath("/auto-reminders");
  return res.ok ? { ok: t("autoTestOk") } : { error: t("autoTestFail", { why: res.detail }) };
}
