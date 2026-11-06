import "server-only";
import { db } from "./db";
import { summarizeLedger } from "./billing";
import { fmtDate, methodText, rupees } from "./format";
import { asLang, makeT } from "./i18n";
import { today } from "./dates";
import { receiptImageData, renderReceiptPng } from "./receipt-image";
import { sendTemplate, templateHasImageHeader, uploadMedia, whatsappConfigured, type SendResult } from "./whatsapp";

export const receiptTemplate = () => process.env.WHATSAPP_TEMPLATE_RECEIPT ?? "payment_receipt";

/** The 5 template values: first name, amount, PG, "date · method · receipt no.", what is still pending. */
export async function receiptParams(paymentId: number) {
  const p = await db.payment.findUnique({
    where: { id: paymentId },
    include: {
      tenant: {
        select: {
          name: true,
          phone: true,
          language: true,
          property: { select: { name: true } },
          owner: { select: { businessName: true, language: true, autoReceipts: true } },
          charges: { select: { amount: true, dueDate: true } },
          payments: { select: { amount: true } },
        },
      },
    },
  });
  if (!p || p.amount <= 0) return null;
  const tn = p.tenant;
  const lang = asLang(tn.language ?? tn.owner.language);
  const t = makeT(lang);
  const s = summarizeLedger(tn.charges, tn.payments, today());
  return {
    phone: tn.phone,
    lang,
    auto: tn.owner.autoReceipts,
    params: [
      tn.name.split(" ")[0],
      rupees(p.amount),
      tn.owner.businessName ?? tn.property.name,
      `${fmtDate(p.paidOn, lang)} · ${methodText(t, p.method)} · #${p.id}`,
      s.outstanding > 0 ? t("rcptStillDue", { amt: rupees(s.outstanding) }) : t("rcptAllClear"),
    ],
  };
}

/** Turn Meta's error into words an owner can act on. Unknown errors are passed through as they are. */
export function explainSendError(detail: string): string {
  if (/#132001\b/.test(detail)) return `The "${receiptTemplate()}" message template is not set up or not approved in Meta yet (for this language).`;
  if (/#131030\b/.test(detail)) return "This tenant's number is not on the test number's allowed list (Meta → WhatsApp → API Setup → To).";
  if (/#131026\b/.test(detail)) return "This number does not seem to be on WhatsApp.";
  if (/#132000\b/.test(detail)) return `The "${receiptTemplate()}" template in Meta needs exactly 5 blanks ({{1}} to {{5}}) in the text.`;
  if (/#132012\b/.test(detail)) return `The "${receiptTemplate()}" template in Meta does not match what Neravu sends (check the picture header and the 5 blanks).`;
  if (/#190\b/.test(detail)) return "Meta says our WhatsApp token has expired. Make a new one and put it in Vercel.";
  return detail;
}

/**
 * Send the tenant a WhatsApp receipt, if WhatsApp is connected and the owner keeps receipts on. The
 * outcome is saved on the payment, so the owner can see it (and send the receipt by hand if it failed).
 * Awaited by every caller: background work after the response is not reliable on Vercel.
 */
export async function sendPaymentReceipt(paymentId: number): Promise<{ ok: boolean; status: string } | null> {
  if (!whatsappConfigured()) return null;
  let status: string;
  try {
    const r = await receiptParams(paymentId);
    if (!r || !r.auto) return null;
    const tpl = receiptTemplate();
    // If the template has a picture on top, the receipt goes as a picture with the text as its caption.
    const picture = async (): Promise<{ id?: string; error?: string }> => {
      const d = await receiptImageData(paymentId);
      if (!d) return { error: "Receipt not found" };
      const up = await uploadMedia(await renderReceiptPng(d), "image/png", `receipt-${d.no}.png`);
      return up.ok ? { id: up.id } : { error: up.detail };
    };
    const hasImage = await templateHasImageHeader(tpl, r.lang);
    let img = hasImage ? await picture() : {};
    let res: SendResult = img.error
      ? { ok: false, reason: "rejected", detail: img.error }
      : await sendTemplate({ phone: r.phone, template: tpl, language: r.lang, params: r.params, headerImageId: img.id });
    // Meta could not tell us the template's shape: if it wants a picture, send again with one.
    if (!res.ok && hasImage === null && /#132012\b|#132000\b/.test(res.detail)) {
      img = await picture();
      if (img.id) res = await sendTemplate({ phone: r.phone, template: tpl, language: r.lang, params: r.params, headerImageId: img.id });
    }
    status = res.ok ? "SENT" : explainSendError(res.detail);
    if (!res.ok) console.error(`Receipt #${paymentId}: ${res.detail}`);
  } catch (e) {
    console.error(`Receipt #${paymentId} failed:`, (e as Error).message);
    status = "Could not send (unexpected error)";
  }
  await db.payment.update({ where: { id: paymentId }, data: { receiptStatus: status.slice(0, 300), receiptAt: new Date() } }).catch(() => {});
  return { ok: status === "SENT", status };
}
