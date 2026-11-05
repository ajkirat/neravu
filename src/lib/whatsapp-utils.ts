/** Digits-only number for the WhatsApp API: 10-digit Indian mobiles get 91 in front. null if unusable. */
export function waNumber(phone: string): string | null {
  const d = phone.replace(/\D/g, "");
  const n = d.length === 10 ? `91${d}` : d.replace(/^0+/, "");
  return n.length >= 11 && n.length <= 15 ? n : null;
}

/** WhatsApp rejects template variables with newlines, tabs or long runs of spaces. */
export const cleanParam = (s: string) => s.replace(/[\r\n\t]+/g, " ").replace(/ {2,}/g, " ").trim().slice(0, 1000) || "-";

export function buildTemplatePayload(opts: { to: string; template: string; language: string; params: string[] }) {
  return {
    messaging_product: "whatsapp",
    to: opts.to,
    type: "template",
    template: {
      name: opts.template,
      language: { code: opts.language },
      components: [{ type: "body", parameters: opts.params.map((p) => ({ type: "text", text: cleanParam(p) })) }],
    },
  };
}
