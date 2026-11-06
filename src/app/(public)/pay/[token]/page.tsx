import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { summarizeLedger } from "@/lib/billing";
import { syncRentCharges } from "@/lib/ledger";
import { toDateInput, today, addDays } from "@/lib/dates";
import { fmtDate, fmtPeriod, methodText, rupees, whatsappNumber } from "@/lib/format";
import { parseElectricityDescription } from "@/lib/electricity";
import { openCharges } from "@/lib/settlement";
import { ensurePayCode } from "@/lib/paycode-db";
import { taggedAmount, taggedRupees } from "@/lib/paycode";
import { qrDataUrl } from "@/lib/qr";
import { upiLink } from "@/lib/upi";
import { claimPayment } from "@/app/actions/paylink";
import { requestLeave, submitTenantComplaint } from "@/app/actions/mypg";
import { ActionForm } from "@/components/action-form";
import { Card, Field } from "@/components/ui";
import { PayOnlineButton } from "@/components/pay-online-button";
import { LANG_COOKIE, asLang, isLang, makeT } from "@/lib/i18n";
import { I18nProvider } from "@/lib/i18n/client";

export const metadata = { title: "My PG", robots: { index: false, follow: false } };

/** The tenant's own private page, opened from WhatsApp. No login: the link itself is the key. */
export default async function MyPgPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{32}$/.test(token)) notFound();
  const tenant = await db.tenant.findUnique({
    where: { payToken: token },
    select: {
      id: true,
      ownerId: true,
      name: true,
      status: true,
      moveOutDate: true,
      language: true,
      owner: { select: { upiId: true, businessName: true, name: true, phone: true, language: true, paymentMode: true, razorpayEnabled: true, payConfirm: true, houseRules: true } },
      property: { select: { name: true } },
    },
  });
  if (!tenant) notFound();
  await syncRentCharges(tenant.ownerId, tenant.id);
  const [ledger, claim, leave, receipts] = await Promise.all([
    db.tenant.findUnique({ where: { id: tenant.id }, select: { charges: true, payments: { select: { amount: true } } } }),
    db.paymentClaim.findFirst({ where: { tenantId: tenant.id, status: "PENDING" }, orderBy: { createdAt: "desc" } }),
    db.tenantRequest.findFirst({ where: { tenantId: tenant.id, kind: "NOTICE", status: "PENDING" } }),
    db.payment.findMany({ where: { tenantId: tenant.id }, orderBy: { paidOn: "desc" }, take: 12 }),
  ]);
  const asOf = today();
  const s = summarizeLedger(ledger?.charges ?? [], ledger?.payments ?? [], asOf);
  const paid = (ledger?.payments ?? []).reduce((n, p) => n + p.amount, 0);
  const open = openCharges(ledger?.charges ?? [], paid, asOf);

  // A language the visitor picked wins; otherwise the tenant's own, then the owner's.
  const picked = (await cookies()).get(LANG_COOKIE)?.value;
  const lang = isLang(picked) ? picked : asLang(tenant.language ?? tenant.owner.language);
  const t = makeT(lang);
  const o = tenant.owner;
  const payee = o.businessName ?? tenant.property.name;
  const first = tenant.name.split(" ")[0];
  const rzp = o.paymentMode === "RAZORPAY" && o.razorpayEnabled;
  // Verified online payment replaces direct UPI completely: no unverifiable path when Razorpay is on.
  const upiId = !rzp && o.paymentMode === "UPI" ? o.upiId : null;
  const bankMode = o.payConfirm === "BANK";
  const code = upiId && s.outstanding > 0 ? await ensurePayCode(tenant.ownerId, tenant.id) : null;
  const link = upiId ? upiLink({ upiId, name: payee, amount: taggedAmount(s.outstanding, code), note: `Rent ${first}` }) : "";
  const qr = link ? await qrDataUrl(link, 320) : "";
  const label = (c: { type: string; period: string | null; description: string }) => {
    const e = parseElectricityDescription(c.description);
    if (e) return t("elecChargeLabel", { month: fmtPeriod(e.period, lang), room: e.room, days: e.days, total: e.total });
    if (c.type === "RENT" && c.period) return t("rentForMonth", { month: fmtPeriod(c.period, lang) });
    if (c.type === "DEPOSIT") return t("charge_DEPOSIT");
    return c.description;
  };

  return (
    <I18nProvider lang={lang}>
      <div className="space-y-4">
        <Card>
          <p className="text-sm text-muted">{payee}</p>
          <h1 className="text-lg font-semibold text-brand-900">{t("payHi", { name: first })}</h1>
          {s.outstanding <= 0 ? (
            <p className="mt-3 rounded-xl bg-brand-50 px-4 py-3 text-base font-semibold text-brand-700">{t("payAllPaid", { name: first })}</p>
          ) : (
            <div className="mt-2 text-center">
              <p className="text-4xl font-bold tracking-tight text-brand-900">{code ? taggedRupees(s.outstanding, code) : rupees(s.outstanding)}</p>
              {s.oldestUnpaid && <p className="text-xs text-muted">{t("paySince", { date: fmtDate(s.oldestUnpaid, lang) })}</p>}
              {claim && !bankMode ? (
                <p className="mt-4 rounded-xl bg-marigold-100 px-4 py-3 text-sm text-marigold-700">{t("mpWaiting", { amt: rupees(claim.amount), date: fmtDate(claim.createdAt, lang), pg: payee })}</p>
              ) : rzp ? (
                <div className="mt-4">
                  <PayOnlineButton token={token} amount={rupees(s.outstanding)} />
                  <p className="mt-2 text-xs text-muted">{t("mpRzpAuto")}</p>
                </div>
              ) : upiId ? (
                <>
                  <a href={link} className="btn-primary mt-4 w-full justify-center">
                    {t("payWithUpi")}
                  </a>
                  {code && <p className="mt-2 text-xs text-muted">{t("mpExact", { amt: taggedRupees(s.outstanding, code) })}</p>}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qr} alt="UPI QR code" className="mx-auto mt-3 h-44 w-44" />
                  <p className="text-xs text-muted">
                    {t("payScan")} · {upiId}
                  </p>
                  <div className="mt-4 border-t border-line pt-4 text-left">
                    {bankMode ? (
                      <p className="text-sm text-brand-700">{t("mpBankAuto")}</p>
                    ) : (
                      <ActionForm action={claimPayment.bind(null, token)} submitLabel={t("payIPaid")} submitClassName="btn-secondary w-full justify-center" className="space-y-2">
                        <Field label={t("mpUtr")} hint={t("mpUtrHint")}>
                          <input name="utr" className="input" inputMode="numeric" maxLength={30} />
                        </Field>
                      </ActionForm>
                    )}
                  </div>
                </>
              ) : (
                <p className="mt-3 text-sm text-muted">{t("payDirect", { pg: payee })}</p>
              )}
            </div>
          )}
        </Card>

        {open.length > 0 && (
          <Card title={t("mpOwed")}>
            <ul className="divide-y divide-line text-sm">
              {open.map((c) => (
                <li key={c.id} className="flex justify-between gap-3 py-2">
                  <span>
                    {label(c)}
                    <span className="block text-xs text-muted">{fmtDate(c.dueDate, lang)}</span>
                  </span>
                  <span className="font-semibold">{rupees(c.open)}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {receipts.length > 0 && (
          <Card title={t("mpReceipts")}>
            <ul className="divide-y divide-line text-sm">
              {receipts.map((p) => (
                <li key={p.id} className="flex justify-between gap-3 py-2">
                  <span>
                    {fmtDate(p.paidOn, lang)} · {methodText(t, p.method)}
                    <span className="block text-xs text-muted">#{p.id}{p.reference ? ` · ${p.reference}` : ""}</span>
                  </span>
                  <span className={`font-semibold ${p.amount < 0 ? "text-red-700" : "text-brand-700"}`}>{rupees(p.amount)}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {tenant.status !== "MOVED_OUT" && (
          <Card title={t("mpProblem")}>
            <ActionForm action={submitTenantComplaint.bind(null, token)} submitLabel={t("mpSendProblem")} submitClassName="btn-secondary" resetOnSuccess>
              <Field label={t("mpWhat")}>
                <input name="title" className="input" required maxLength={200} placeholder={t("mpWhatPh")} />
              </Field>
              <Field label={t("complaintDetails")}>
                <input name="details" className="input" maxLength={1000} />
              </Field>
              <Field label={t("mpPhoto")}>
                <input name="photo" type="file" accept="image/*" capture="environment" className="block w-full text-sm" />
              </Field>
            </ActionForm>
          </Card>
        )}

        {tenant.status === "ACTIVE" && (
          <Card title={t("mpLeave")}>
            {leave?.date ? (
              <p className="text-sm text-marigold-700">{t("mpLeaveWaiting", { date: fmtDate(leave.date, lang), pg: payee })}</p>
            ) : (
              <ActionForm action={requestLeave.bind(null, token)} submitLabel={t("mpLeaveSend")} submitClassName="btn-secondary" resetOnSuccess>
                <Field label={t("mpLeaveDate")}>
                  <input name="date" type="date" className="input" required min={toDateInput(asOf)} defaultValue={toDateInput(addDays(asOf, 30))} />
                </Field>
                <Field label={t("note")}>
                  <input name="note" className="input" maxLength={300} />
                </Field>
              </ActionForm>
            )}
          </Card>
        )}
        {tenant.status === "NOTICE" && tenant.moveOutDate && (
          <Card>
            <p className="text-sm">{t("mpLeaving", { date: fmtDate(tenant.moveOutDate, lang) })}</p>
          </Card>
        )}

        <Card title={t("mpContact")}>
          {o.phone && (
            <div className="flex flex-wrap gap-2">
              <a className="btn-secondary" href={`tel:${o.phone}`}>
                {t("call")}
              </a>
              <a className="btn-accent" target="_blank" rel="noreferrer" href={`https://wa.me/${whatsappNumber(o.phone)}`}>
                {t("whatsapp")}
              </a>
            </div>
          )}
          {o.houseRules && <p className="mt-3 text-sm whitespace-pre-line text-muted">{o.houseRules}</p>}
        </Card>
      </div>
    </I18nProvider>
  );
}
