/** Digits-only number for the WhatsApp API: 10-digit Indian mobiles get 91 in front. null if unusable. */
export function waNumber(phone: string): string | null {
  const d = phone.replace(/\D/g, "");
  const n = d.length === 10 ? `91${d}` : d.replace(/^0+/, "");
  return n.length >= 11 && n.length <= 15 ? n : null;
}

/** WhatsApp rejects template variables with newlines, tabs or long runs of spaces. */
export const cleanParam = (s: string) => s.replace(/[\r\n\t]+/g, " ").replace(/ {2,}/g, " ").trim().slice(0, 1000) || "-";

export function buildTemplatePayload(opts: { to: string; template: string; language: string; params: string[]; headerImageId?: string }) {
  const body = { type: "body", parameters: opts.params.map((p) => ({ type: "text", text: cleanParam(p) })) };
  // A template with a picture on top needs the picture with every message (an uploaded media id).
  const header = opts.headerImageId ? [{ type: "header", parameters: [{ type: "image", image: { id: opts.headerImageId } }] }] : [];
  return {
    messaging_product: "whatsapp",
    to: opts.to,
    type: "template",
    template: {
      name: opts.template,
      language: { code: opts.language },
      components: [...header, body],
    },
  };
}

/** Human-friendly number: Indian mobiles as +91 98450 11122, US/Canada as +1 555 147 2730, others as +<digits>. */
export function formatWaNumber(digits: string): string {
  const d = digits.replace(/\D/g, "");
  if (d.length === 10) return `+91 ${d.slice(0, 5)} ${d.slice(5)}`;
  if (d.length === 12 && d.startsWith("91")) return `+91 ${d.slice(2, 7)} ${d.slice(7)}`;
  if (d.length === 11 && d.startsWith("1")) return `+1 ${d.slice(1, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
  return `+${d}`;
}
