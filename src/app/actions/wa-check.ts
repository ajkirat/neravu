"use server";

import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { checkProvider, scanEnabled } from "@/lib/receipt-ai";
import { phoneKey } from "@/lib/join";
import { tooMany } from "@/lib/throttle";
import { checkConnection, checkInboundLink, linkInbound, sendText, whatsappConfigured } from "@/lib/whatsapp";
import { waNumber } from "@/lib/whatsapp-utils";

export type CheckLine = { label: string; ok: boolean; detail?: string; fix?: "link" };

/** Owner-only self-test of the WhatsApp set-up. Shows what is wrong on screen; never shows secret values. */
export async function checkWhatsApp(sendTest: boolean): Promise<CheckLine[]> {
  const owner = await requireOwner();
  if (await tooMany(`wa-check:${owner.id}`, 20, 60 * 60 * 1000)) return [{ label: "Too many checks, try again in a while", ok: false }];
  const set = (k: string) => !!process.env[k];
  const lines: CheckLine[] = [
    { label: "Token and phone number id are set", ok: whatsappConfigured() },
    { label: "App secret is set (needed to accept incoming messages)", ok: set("WHATSAPP_APP_SECRET") },
    { label: "Verify token is set", ok: set("WHATSAPP_VERIFY_TOKEN") },
    { label: "Anthropic key is set (needed to read bills)", ok: scanEnabled() },
  ];
  const ai = await checkProvider();
  lines.push({ label: "Anthropic accepts our key, credit and model (needed to read bills)", ok: ai.ok, detail: ai.detail });
  const conn = await checkConnection();
  lines.push({ label: "Meta accepts our token and phone number id", ok: conn.ok, detail: conn.detail });
  if (conn.ok) {
    const link = await checkInboundLink();
    lines.push({ label: "WhatsApp account is linked to the app (needed to receive messages)", ok: link.ok, detail: link.detail, fix: link.canFix ? "link" : undefined });
  }

  try {
    const since = new Date(Date.now() - 24 * 3600 * 1000);
    const [calls, recentCalls] = await Promise.all([
      db.waHook.count({ where: { createdAt: { gte: since } } }),
      db.waHook.findMany({ orderBy: { createdAt: "desc" }, take: 5, select: { createdAt: true, result: true } }),
    ]);
    lines.push({
      label: "Calls from Meta to Neravu in the last 24 hours (any kind)",
      ok: calls > 0,
      detail: calls ? String(calls) : "None. Meta is not sending anything to Neravu: the app is not Live, or the account is not linked (see above).",
    });
    for (const c of recentCalls) {
      lines.push({ label: `Meta called at ${c.createdAt.toISOString().replace("T", " ").slice(5, 16)} UTC`, ok: c.result.startsWith("accepted"), detail: c.result });
    }
  } catch {
    lines.push({ label: "Database has the WhatsApp tables", ok: false, detail: "The latest database update was not applied. Redeploy on Vercel." });
  }

  try {
    const since = new Date(Date.now() - 24 * 3600 * 1000);
    const [n, last] = await Promise.all([db.waInbound.count({ where: { createdAt: { gte: since } } }), db.waInbound.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } })]);
    lines.push({ label: "Messages received from WhatsApp in the last 24 hours", ok: n > 0, detail: `${n}${last ? `, latest at ${last.createdAt.toISOString().replace("T", " ").slice(0, 16)} UTC` : ""}` });
  } catch {
    lines.push({ label: "Database has the WhatsApp tables", ok: false, detail: "The latest database update was not applied. Redeploy on Vercel." });
  }

  try {
    const recent = await db.waInbound.findMany({ orderBy: { createdAt: "desc" }, take: 4, select: { createdAt: true, trace: true } });
    for (const r of recent) {
      lines.push({ label: `Message at ${r.createdAt.toISOString().replace("T", " ").slice(5, 16)} UTC`, ok: !!r.trace && !/FAILED|unknown|ambiguous/.test(r.trace), detail: r.trace ?? "(nothing recorded: older version)" });
    }
  } catch {
    /* table check above already reports this */
  }
  const mine = owner.phone ? phoneKey(owner.phone) : "";
  lines.push({ label: "Your mobile number is saved in Settings", ok: mine.length === 10, detail: mine ? `ends ...${mine.slice(-4)}` : "not saved" });
  const staff = await db.staff.count({ where: { ownerId: owner.id, active: true } });
  lines.push({ label: "Caretakers added who can send bills", ok: staff > 0, detail: String(staff) });

  if (sendTest && waNumber(owner.phone ?? "")) {
    const res = await sendText(waNumber(owner.phone!)!, "✅ Neravu test: WhatsApp can message you.");
    lines.push({ label: "Test message sent to your phone", ok: res.ok, detail: res.ok ? "Check WhatsApp (works if you messaged the number in the last 24 hours)" : res.detail });
  }
  return lines;
}

/** Owner-only: link the WhatsApp Business Account to the app, so Meta delivers incoming messages. */
export async function linkWhatsApp(): Promise<CheckLine> {
  const owner = await requireOwner();
  if (await tooMany(`wa-link:${owner.id}`, 5, 60 * 60 * 1000)) return { label: "Too many tries, try again in a while", ok: false };
  const r = await linkInbound();
  return { label: r.ok ? "Linked. Now send a photo to the WhatsApp number and check again." : "Could not link", ok: r.ok, detail: r.detail };
}
