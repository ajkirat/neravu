import "server-only";
import { buildTemplatePayload, formatWaNumber, waNumber } from "./whatsapp-utils";

// WhatsApp Business Cloud API. One platform account (whoever runs Neravu) sends to every owner's
// tenants, using message templates that Meta has approved. See README for the template texts.
export const whatsappConfigured = () => !!process.env.WHATSAPP_TOKEN && !!process.env.WHATSAPP_PHONE_NUMBER_ID;

export const templateNames = () => ({
  dueSoon: process.env.WHATSAPP_TEMPLATE_DUE ?? "rent_due_soon",
  overdue: process.env.WHATSAPP_TEMPLATE_OVERDUE ?? "rent_overdue",
});

export type SendResult = { ok: true } | { ok: false; reason: "auth" | "rejected" | "number" | "network" | "off"; detail: string };

/** Send one approved template message. Never throws; the result says what happened. */
export async function sendTemplate(o: { phone: string; template: string; language: string; params: string[]; headerImageId?: string }): Promise<SendResult> {
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
      body: JSON.stringify(buildTemplatePayload({ to, template: o.template, language: o.language, params: o.params, headerImageId: o.headerImageId })),
    });
    if (res.ok) return { ok: true };
    const why = await metaError(res);
    if (res.status === 401 || res.status === 403) return { ok: false, reason: "auth", detail: `WhatsApp refused our access (${res.status}): ${why}` };
    return { ok: false, reason: "rejected", detail: why };
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
    const why = await metaError(res);
    console.error(`WhatsApp send failed (${res.status}): ${why}`);
    if (res.status === 401 || res.status === 403) return { ok: false, reason: "auth", detail: `WhatsApp refused our access (${res.status}): ${why}` };
    return { ok: false, reason: "rejected", detail: `WhatsApp rejected the message (${res.status}): ${why}` };
  } catch {
    console.error("WhatsApp send failed: could not reach WhatsApp");
    return { ok: false, reason: "network", detail: "Could not reach WhatsApp" };
  } finally {
    clearTimeout(timer);
  }
}

/** What Meta says went wrong, e.g. "(#131030) Recipient phone number not in allowed list". No secrets in it. */
async function metaError(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: { message?: string; code?: number } };
    return `${j.error?.code ? `#${j.error.code} ` : ""}${(j.error?.message ?? "no details").slice(0, 300)}`;
  } catch {
    return "no details";
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

/** The number people send bill photos to, for display (e.g. "+91 63634 62003" or "+1 555 147 2730"). Needs WhatsApp connected. */
export function waBillNumber(): string | null {
  const raw = (process.env.WHATSAPP_DISPLAY_NUMBER ?? "").replace(/\D/g, "");
  if (!whatsappConfigured() || raw.length < 10) return null;
  return formatWaNumber(raw);
}

/** Ask Meta about our phone number id with our token: proves both are right, and shows the number's status. */
export async function checkConnection(): Promise<{ ok: true; detail: string } | { ok: false; detail: string }> {
  if (!whatsappConfigured()) return { ok: false, detail: "WHATSAPP_TOKEN or WHATSAPP_PHONE_NUMBER_ID is not set" };
  try {
    const res = await fetch(`${apiBase()}/${process.env.WHATSAPP_PHONE_NUMBER_ID}?fields=display_phone_number,verified_name,quality_rating`, {
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return { ok: false, detail: `Meta says (${res.status}): ${await metaError(res)}` };
    const j = (await res.json()) as { display_phone_number?: string; verified_name?: string };
    return { ok: true, detail: `${j.display_phone_number ?? "?"} (${j.verified_name ?? "no name"})` };
  } catch {
    return { ok: false, detail: "Could not reach Meta" };
  }
}

type MetaGet = { ok: true; json: Record<string, unknown> } | { ok: false; detail: string };

async function metaCall(path: string, method: "GET" | "POST" = "GET"): Promise<MetaGet> {
  try {
    const res = await fetch(`${apiBase()}/${path}`, {
      method,
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return { ok: false, detail: `Meta says (${res.status}): ${await metaError(res)}` };
    return { ok: true, json: (await res.json()) as Record<string, unknown> };
  } catch {
    return { ok: false, detail: "Could not reach Meta" };
  }
}

type TokenInfo = { appId: string | null; appName: string | null; wabaIds: string[] };

/** Which Meta app the token belongs to and which WhatsApp Business Accounts it can manage. */
async function tokenInfo(): Promise<{ ok: true; info: TokenInfo } | { ok: false; detail: string }> {
  const token = process.env.WHATSAPP_TOKEN ?? "";
  const r = await metaCall(`debug_token?input_token=${encodeURIComponent(token)}`);
  if (!r.ok) return r;
  const d = (r.json.data ?? {}) as { app_id?: string; application?: string; granular_scopes?: { scope: string; target_ids?: string[] }[] };
  const ids = new Set<string>();
  if (process.env.WHATSAPP_WABA_ID) ids.add(process.env.WHATSAPP_WABA_ID);
  for (const s of d.granular_scopes ?? []) if (s.scope.startsWith("whatsapp_business") && s.target_ids) s.target_ids.forEach((x) => ids.add(x));
  return { ok: true, info: { appId: d.app_id ?? null, appName: d.application ?? null, wabaIds: [...ids] } };
}

export type LinkState = { ok: boolean; detail: string; canFix: boolean };

/**
 * Incoming messages only reach Neravu if the WhatsApp Business Account is linked ("subscribed") to the
 * Meta app the webhook is set on. Meta's dashboard "Test" button works without this link, real messages don't.
 */
export async function checkInboundLink(): Promise<LinkState> {
  if (!whatsappConfigured()) return { ok: false, detail: "WhatsApp is not connected", canFix: false };
  const t = await tokenInfo();
  if (!t.ok) return { ok: false, detail: t.detail, canFix: false };
  const { appId, appName, wabaIds } = t.info;
  if (!wabaIds.length) return { ok: false, detail: "Meta did not say which WhatsApp account this token is for. In Vercel add WHATSAPP_WABA_ID = your WhatsApp Business Account ID (Meta: WhatsApp > API Setup), then redeploy.", canFix: false };
  const parts: string[] = [];
  let allLinked = true;
  for (const w of wabaIds) {
    const r = await metaCall(`${w}/subscribed_apps`);
    if (!r.ok) {
      parts.push(`account ${w}: ${r.detail}`);
      allLinked = false;
      continue;
    }
    const apps = ((r.json.data ?? []) as { whatsapp_business_api_data?: { id?: string; name?: string } }[]).map((a) => a.whatsapp_business_api_data ?? {});
    const linked = appId ? apps.some((a) => a.id === appId) : apps.length > 0;
    if (!linked) allLinked = false;
    parts.push(`account ${w}: ${linked ? "linked" : "NOT linked"}${apps.length ? ` (linked apps: ${apps.map((a) => a.name ?? a.id).join(", ")})` : ""}`);
  }
  return { ok: allLinked, detail: `Token is for app ${appName ?? "?"} (${appId ?? "?"}). ${parts.join("; ")}`, canFix: !allLinked };
}

/** Link the WhatsApp Business Account(s) to this app so Meta sends incoming messages to the webhook. */
export async function linkInbound(): Promise<{ ok: boolean; detail: string }> {
  if (!whatsappConfigured()) return { ok: false, detail: "WhatsApp is not connected" };
  const t = await tokenInfo();
  if (!t.ok) return t;
  if (!t.info.wabaIds.length) return { ok: false, detail: "Add WHATSAPP_WABA_ID in Vercel first" };
  const out: string[] = [];
  let ok = true;
  for (const w of t.info.wabaIds) {
    const r = await metaCall(`${w}/subscribed_apps`, "POST");
    if (!r.ok) ok = false;
    out.push(`account ${w}: ${r.ok ? "linked" : r.detail}`);
  }
  return { ok, detail: out.join("; ") };
}

/** Is each message template set up in Meta, in which languages, and approved? One line per template name. */
export async function checkTemplates(names: string[]): Promise<{ name: string; ok: boolean; detail: string }[]> {
  if (!whatsappConfigured()) return [];
  const t = await tokenInfo();
  if (!t.ok || !t.info.wabaIds.length) return names.map((name) => ({ name, ok: false, detail: t.ok ? "Add WHATSAPP_WABA_ID in Vercel first" : t.detail }));
  const out: { name: string; ok: boolean; detail: string }[] = [];
  for (const name of names) {
    const found: { language: string; status: string }[] = [];
    let error: string | null = null;
    for (const w of t.info.wabaIds) {
      const r = await metaCall(`${w}/message_templates?name=${encodeURIComponent(name)}&fields=name,language,status&limit=50`);
      if (!r.ok) {
        error = r.detail;
        continue;
      }
      for (const x of (r.json.data ?? []) as { name?: string; language?: string; status?: string }[]) {
        if (x.name === name) found.push({ language: x.language ?? "?", status: x.status ?? "?" });
      }
    }
    const approved = found.filter((f) => f.status === "APPROVED").map((f) => f.language);
    out.push({
      name,
      ok: approved.length > 0,
      detail: found.length
        ? found.map((f) => `${f.language}: ${f.status.toLowerCase()}`).join(", ")
        : (error ?? "Not created in Meta yet (WhatsApp Manager → Message templates)"),
    });
  }
  return out;
}

/** Upload a picture to WhatsApp (kept by Meta for 30 days) and get its media id for a message. */
export async function uploadMedia(bytes: Buffer, mime: string, filename: string): Promise<{ ok: true; id: string } | { ok: false; detail: string }> {
  if (!whatsappConfigured()) return { ok: false, detail: "WhatsApp is not connected" };
  try {
    const form = new FormData();
    form.append("messaging_product", "whatsapp");
    form.append("type", mime);
    form.append("file", new Blob([new Uint8Array(bytes)], { type: mime }), filename);
    const res = await fetch(`${apiBase()}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/media`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
      body: form,
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return { ok: false, detail: `Picture upload refused (${res.status}): ${await metaError(res)}` };
    const j = (await res.json()) as { id?: string };
    return j.id ? { ok: true, id: j.id } : { ok: false, detail: "Picture upload gave no id" };
  } catch {
    return { ok: false, detail: "Could not reach WhatsApp to upload the picture" };
  }
}

// Which templates have a picture on top, by "name|language". Asked from Meta at most every 10 minutes.
const headerCache = new Map<string, { image: boolean | null; at: number }>();

/**
 * Does this template (in this language) have an IMAGE header? null when Meta can't tell us (no account
 * id): the caller then tries without a picture and, if Meta says the format is wrong, with one.
 */
export async function templateHasImageHeader(name: string, language: string): Promise<boolean | null> {
  const key = `${name}|${language}`;
  const hit = headerCache.get(key);
  if (hit && Date.now() - hit.at < 10 * 60_000) return hit.image;
  let image: boolean | null = null;
  const t = await tokenInfo();
  if (t.ok) {
    for (const w of t.info.wabaIds) {
      const r = await metaCall(`${w}/message_templates?name=${encodeURIComponent(name)}&fields=name,language,status,components&limit=50`);
      if (!r.ok) continue;
      const match = ((r.json.data ?? []) as { name?: string; language?: string; components?: { type?: string; format?: string }[] }[]).find(
        (x) => x.name === name && x.language === language,
      );
      if (match) {
        image = (match.components ?? []).some((c) => c.type === "HEADER" && c.format === "IMAGE");
        break;
      }
    }
  }
  headerCache.set(key, { image, at: Date.now() });
  return image;
}
