import { createHmac, timingSafeEqual } from "node:crypto";
import type { ReceiptData } from "./receipt";

/** One message someone sent to our WhatsApp number, reduced to what we use. */
export type Inbound = {
  id: string;
  from: string; // digits, e.g. 919845011122
  name: string | null; // their WhatsApp profile name
  kind: "image" | "document" | "button" | "text" | "other";
  mediaId?: string;
  mime?: string;
  buttonId?: string;
  text?: string;
};

type Raw = Record<string, unknown>;
const obj = (v: unknown): Raw | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Raw) : null);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const s = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

/** Pull the incoming messages out of a Cloud API webhook body. Delivery statuses and junk are dropped. */
export function parseWebhook(body: unknown): Inbound[] {
  const out: Inbound[] = [];
  for (const entry of arr(obj(body)?.entry)) {
    for (const change of arr(obj(entry)?.changes)) {
      const value = obj(obj(change)?.value);
      if (!value) continue;
      const names = new Map<string, string>();
      for (const c of arr(value.contacts)) {
        const wa = s(obj(c)?.wa_id);
        const nm = s(obj(obj(c)?.profile)?.name);
        if (wa && nm) names.set(wa, nm.slice(0, 80));
      }
      for (const m of arr(value.messages)) {
        const msg = obj(m);
        const id = s(msg?.id);
        const from = s(msg?.from)?.replace(/\D/g, "");
        if (!msg || !id || !from || from.length < 10 || from.length > 15) continue;
        const base = { id: id.slice(0, 200), from, name: names.get(from) ?? null };
        const type = s(msg.type);
        if (type === "image") {
          const img = obj(msg.image);
          out.push({ ...base, kind: "image", mediaId: s(img?.id), mime: s(img?.mime_type) });
        } else if (type === "document") {
          const doc = obj(msg.document);
          out.push({ ...base, kind: "document", mediaId: s(doc?.id), mime: s(doc?.mime_type) });
        } else if (type === "interactive") {
          const br = obj(obj(msg.interactive)?.button_reply);
          out.push({ ...base, kind: "button", buttonId: s(br?.id), text: s(br?.title) });
        } else if (type === "button") {
          out.push({ ...base, kind: "button", buttonId: s(obj(msg.button)?.payload), text: s(obj(msg.button)?.text) });
        } else if (type === "text") {
          out.push({ ...base, kind: "text", text: s(obj(msg.text)?.body)?.slice(0, 500) });
        } else {
          out.push({ ...base, kind: "other" });
        }
      }
    }
  }
  return out;
}

const YES = ["yes", "y", "yes add it", "ok", "okay", "haan", "ha", "haa", "han", "ho", "hau", "houdu", "avunu", "sari", "ಹೌದು", "ಹೂ", "ಹೂಂ", "ಸರಿ", "అవును", "సరే", "హా", "हाँ", "हां", "हा"];
const NO = ["no", "n", "nahi", "nako", "illa", "beda", "vaddu", "ledu", "ಇಲ್ಲ", "ಬೇಡ", "వద్దు", "లేదు", "కాదు", "नहीं", "ना"];

/** Did they answer yes or no? Accepts English, Kannada, Telugu, Hindi and romanised forms. */
export function replyIntent(text: string | undefined): "yes" | "no" | null {
  if (!text) return null;
  const t = text.toLowerCase().replace(/[.!,?✅✔️👍👎❌]/gu, " ").replace(/\s+/g, " ").trim();
  if (!t) return /👍|✅|✔/u.test(text) ? "yes" : /👎|❌/u.test(text) ? "no" : null;
  if (YES.includes(t)) return "yes";
  if (NO.includes(t)) return "no";
  return null;
}

/** Button ids look like exp_yes_<id> / exp_no_<id>. */
export function parseButton(id: string | undefined): { answer: "yes" | "no"; pendingId: string } | null {
  const m = /^exp_(yes|no)_([a-z0-9]{10,40})$/.exec(id ?? "");
  return m ? { answer: m[1] as "yes" | "no", pendingId: m[2] } : null;
}

/** The amount to book: the printed grand total when there is one, else the sum of the lines. */
export function billAmount(r: Pick<ReceiptData, "items" | "total">): number {
  if (r.total && r.total > 0) return r.total;
  return r.items.reduce((sum, i) => sum + i.amount, 0);
}

/** Check Meta's X-Hub-Signature-256 header against the raw body. */
export function verifySignature(raw: string, header: string | null, secret: string): boolean {
  if (!header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", secret).update(raw, "utf8").digest();
  const given = Buffer.from(header.slice(7), "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}
