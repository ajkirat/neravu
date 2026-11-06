import "server-only";
import { db } from "./db";
import { summarizeLedger } from "./billing";
import { addDays, today } from "./dates";
import { chargeText, fmtPeriod, rupees, whatsappNumber } from "./format";
import { asLang, makeT, type Lang } from "./i18n";
import { parseElectricityDescription } from "./electricity";
import { openCharges } from "./settlement";
import { payTokens } from "./paylink";
import { ensurePayCode } from "./paycode-db";
import { taggedRupees } from "./paycode";
import { appOrigin } from "./url";

/** Tenants whose rent fell due in the last 10 days, who still owe, and have not been sent this month's bill. */
export async function billCandidates(ownerId: string, asOf = today()) {
  const since = addDays(asOf, -10);
  const tenants = await db.tenant.findMany({
    where: { ownerId, status: { in: ["ACTIVE", "NOTICE"] }, payClaimedAt: null, charges: { some: { type: "RENT", dueDate: { gte: since, lte: asOf } } } },
    select: {
      id: true,
      name: true,
      phone: true,
      remindersPausedUntil: true,
      charges: { select: { amount: true, dueDate: true, type: true } },
      payments: { select: { amount: true } },
      reminderLogs: { where: { kind: "BILL", status: "SENT", sentAt: { gte: since } }, select: { id: true } },
    },
  });
  return tenants
    .filter((t) => !(t.remindersPausedUntil && t.remindersPausedUntil > asOf) && t.reminderLogs.length === 0)
    .map((t) => ({ id: t.id, name: t.name, phone: t.phone, outstanding: summarizeLedger(t.charges, t.payments, asOf).outstanding }))
    .filter((t) => t.outstanding > 0);
}

/** One message with everything owed this month (rent, electricity, charges), the total and the tenant's link. */
export async function billMessage(ownerId: string, tenantId: string, fallbackLang: Lang): Promise<{ url: string; amount: number } | null> {
  const asOf = today();
  const tn = await db.tenant.findFirst({
    where: { id: tenantId, ownerId },
    select: {
      id: true, name: true, phone: true, language: true,
      property: { select: { name: true } },
      owner: { select: { businessName: true, paymentMode: true, razorpayEnabled: true } },
      charges: true,
      payments: { select: { amount: true } },
    },
  });
  if (!tn) return null;
  const s = summarizeLedger(tn.charges, tn.payments, asOf);
  if (s.outstanding <= 0) return null;
  const lang = asLang(tn.language ?? fallbackLang);
  const t = makeT(lang);
  const paid = tn.payments.reduce((n, p) => n + p.amount, 0);
  const lines = openCharges(tn.charges, paid, asOf)
    .slice(-5)
    .map((c) => {
      const e = parseElectricityDescription(c.description);
      const what = e ? t("charge_ELECTRICITY") : c.type === "RENT" && c.period ? t("rentForMonth", { month: fmtPeriod(c.period, lang) }) : c.type === "OTHER" ? c.description : chargeText(t, c.type);
      return `${what} ${rupees(c.open)}`;
    })
    .join(", ");
  const token = (await payTokens(ownerId, [tn.id])).get(tn.id);
  const upi = tn.owner.paymentMode === "UPI";
  const code = upi ? await ensurePayCode(ownerId, tn.id) : null;
  const text = t("billMsg", {
    name: tn.name.split(" ")[0],
    pg: tn.owner.businessName ?? tn.property.name,
    lines,
    amt: code ? taggedRupees(s.outstanding, code) : rupees(s.outstanding),
    url: token ? `${await appOrigin()}/pay/${token}` : "",
  });
  return { url: `https://wa.me/${whatsappNumber(tn.phone)}?text=${encodeURIComponent(text)}`, amount: s.outstanding };
}
