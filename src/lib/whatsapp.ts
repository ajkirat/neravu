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

const apiBase = () => process.env.WHATSAPP_API_BASE ?? "https://graph.facebook.com/v20.0";

/** POST one message object to the Cloud API. Never throws. */
async function postMessage(body: Record<string, unknown>): Promise<SendResult> {
  if (!whatsappConfigured()) return { ok: false, reason: "off", detail: "WhatsApp is not connected" };
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 15_000);
  try {
    const res = await fetch(`${apiBase()}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      signal: ctl.signal,
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", ...body }),
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

/** Free-form text. Only allowed within 24 hours of the person messaging us. */
export function sendText(to: string, text: string): Promise<SendResult> {
  return postMessage({ to, type: "text", text: { body: text.slice(0, 4000), preview_url: false } });
}

/** A message with up to 3 reply buttons (titles max 20 characters). Same 24-hour rule as text. */
export function sendButtons(to: string, text: string, buttons: { id: string; title: string }[]): Promise<SendResult> {
  return postMessage({
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: text.slice(0, 1024) },
      action: { buttons: buttons.slice(0, 3).map((b) => ({ type: "reply", reply: { id: b.id.slice(0, 256), title: b.title.slice(0, 20) } })) },
    },
  });
}

export const MAX_MEDIA_BYTES = 8 * 1024 * 1024;

/** Download a photo someone sent us. null if it is missing, too big or not reachable. */
export async function fetchMedia(mediaId: string): Promise<{ bytes: Buffer; mime: string } | null> {
  if (!whatsappConfigured() || !/^[A-Za-z0-9_-]{1,128}$/.test(mediaId)) return null;
  const auth = { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` };
  try {
    const meta = await fetch(`${apiBase()}/${mediaId}`, { headers: auth, signal: AbortSignal.timeout(15_000) });
    if (!meta.ok) return null;
    const info = (await meta.json()) as { url?: string; mime_type?: string; file_size?: number };
    if (!info.url || (info.file_size ?? 0) > MAX_MEDIA_BYTES) return null;
    const file = await fetch(info.url, { headers: auth, signal: AbortSignal.timeout(30_000) });
    if (!file.ok) return null;
    const bytes = Buffer.from(await file.arrayBuffer());
    if (bytes.length > MAX_MEDIA_BYTES) return null;
    return { bytes, mime: info.mime_type ?? file.headers.get("content-type") ?? "application/octet-stream" };
  } catch {
    return null;
  }
}

/** The number people send bill photos to, for display (e.g. "+91 63634 62003"). Needs WhatsApp connected. */
export function waBillNumber(): string | null {
  const raw = (process.env.WHATSAPP_DISPLAY_NUMBER ?? "").replace(/\D/g, "");
  if (!whatsappConfigured() || raw.length < 10) return null;
  const d = raw.slice(-10);
  return `+91 ${d.slice(0, 5)} ${d.slice(5)}`;
}
