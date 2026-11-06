import "server-only";
import { db } from "./db";
import { summarizeLedger } from "./billing";
import { fmtDate, methodText, rupees } from "./format";
import { asLang, makeT } from "./i18n";
import { today } from "./dates";
import { sendTemplate, whatsappConfigured } from "./whatsapp";

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

/** Send the tenant a WhatsApp receipt, if WhatsApp is connected and the owner keeps receipts on. */
export async function sendPaymentReceipt(paymentId: number): Promise<void> {
  if (!whatsappConfigured()) return;
  try {
    const r = await receiptParams(paymentId);
    if (!r || !r.auto) return;
    const res = await sendTemplate({ phone: r.phone, template: receiptTemplate(), language: r.lang, params: r.params });
    if (!res.ok) console.error(`Receipt #${paymentId}: ${res.detail}`);
  } catch (e) {
    console.error(`Receipt #${paymentId} failed:`, (e as Error).message);
  }
}
