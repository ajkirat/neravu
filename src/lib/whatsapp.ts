import "server-only";
import { buildTemplatePayload, waNumber } from "./whatsapp-utils";

// WhatsApp Business Cloud API. One platform account (whoever runs Neravu) sends to every owner's
// tenants, using message templates that Meta has approved. See README for the template texts.
export const whatsappConfigured = () => !!process.env.WHATSAPP_TOKEN && !!process.env.WHATSAPP_PHONE_NUMBER_ID;

export const templateNames = () => ({
  dueSoon: process.env.WHATSAPP_TEMPLATE_DUE ?? "rent_due_soon",
  overdue: process.env.WHATSAPP_TEMPLATE_OVERDUE ?? "rent_overdue",
});

export type SendResult = { ok: true } | { ok: false; reason: "auth" | "rejected" | "number" | "network" | "off"; detail: string };

/** Send one approved template message. Never throws; the result says what happened. */
export async function sendTemplate(o: { phone: string; template: string; language: string; params: string[] }): Promise<SendResult> {
  if (!whatsappConfigured()) return { ok: false, reason: "off", detail: "WhatsApp is not connected" };
  const to = waNumber(o.phone);
  if (!to) return { ok: false, reason: "number", detail: "Phone number is not usable" };
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 15_000);
  try {
    const base = process.env.WHATSAPP_API_BASE ?? "https://graph.facebook.com/v20.0";
    const res = await fetch(`${base}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      signal: ctl.signal,
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(buildTemplatePayload({ to, template: o.template, language: o.language, params: o.params })),
    });
    if (res.ok) return { ok: true };
    if (res.status === 401 || res.status === 403) return { ok: false, reason: "auth", detail: `WhatsApp refused our access (${res.status})` };
    return { ok: false, reason: "rejected", detail: `WhatsApp rejected the message (${res.status})` };
  } catch {
    return { ok: false, reason: "network", detail: "Could not reach WhatsApp" };
  } finally {
    clearTimeout(timer);
  }
}
