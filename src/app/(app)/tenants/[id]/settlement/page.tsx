import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { summarizeLedger } from "@/lib/billing";
import { today } from "@/lib/dates";
import { chargeText, fmtDate, fmtPeriod, rupees, whatsappNumber } from "@/lib/format";
import { syncRentCharges } from "@/lib/ledger";
import { DEDUCTION_REASONS, openCharges, settle } from "@/lib/settlement";
import { asLang, makeT, type MsgKey } from "@/lib/i18n";
import { getT } from "@/lib/i18n/server";
import { addDeduction, payRefund } from "@/app/actions/settlement";
import { deleteCharge } from "@/app/actions/tenants";
import { ActionForm } from "@/components/action-form";
import { PrintButton } from "@/components/print-button";
import { Card, Field, PageHeader } from "@/components/ui";

export const metadata = { title: "Move-out settlement" };

export default async function SettlementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owner = await requireOwner();
  const { t, lang } = await getT();
  await syncRentCharges(owner.id, id);
  const tn = await db.tenant.findFirst({
    where: { id, ownerId: owner.id },
    include: { property: true, bed: { include: { room: true } }, charges: true, payments: { select: { amount: true } } },
  });
  if (!tn) notFound();
  const asOf = today();
  const ledger = summarizeLedger(tn.charges, tn.payments, asOf);
  const s = settle({ deposit: tn.deposit, outstanding: ledger.outstanding, advance: ledger.advance });
  const paid = tn.payments.reduce((n, p) => n + p.amount, 0);
  const open = openCharges(tn.charges, paid, asOf);
  const deductions = tn.charges.filter((c) => c.type === "DEDUCTION");
  const pg = owner.businessName ?? tn.property.name;
  const label = (c: { type: string; period: string | null; description: string }) =>
    c.type === "RENT" && c.period ? t("rentForMonth", { month: fmtPeriod(c.period, lang) }) : c.type === "DEPOSIT" ? t("charge_DEPOSIT") : c.description;

  const tl = asLang(tn.language ?? lang);
  const tt = makeT(tl);
  const waText = tt("setWaText", {
    pg,
    name: tn.name.split(" ")[0],
    dep: rupees(s.deposit),
    dues: rupees(s.dues),
    result: s.refund > 0 ? tt("setWaRefund", { amt: rupees(s.refund) }) : s.owes > 0 ? tt("setWaOwes", { amt: rupees(s.owes) }) : tt("setWaSettled"),
  });
  const leftOn = tn.moveOutDate ?? asOf;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="no-print">
        <PageHeader back={{ href: `/tenants/${tn.id}`, label: tn.name }} title={t("setTitle")} subtitle={t("setSub")} actions={<PrintButton />} />
        {tn.status === "ACTIVE" && <p className="mb-4 rounded-lg bg-marigold-100 px-4 py-3 text-sm text-marigold-700">{t("setNotLeaving")}</p>}
      </div>

      <Card>
        <div className="mb-4">
          <p className="text-lg font-bold text-brand-900">{pg}</p>
          <p className="text-base font-semibold">{tn.name}</p>
          <p className="text-sm text-muted">
            {tn.property.name}
            {tn.bed ? ` · ${t("roomBed", { r: tn.bed.room.number, b: tn.bed.label })}` : ""} · {tn.phone}
          </p>
          <p className="text-sm text-muted">{t("setStay", { from: fmtDate(tn.moveInDate, lang), to: fmtDate(leftOn, lang) })}</p>
        </div>

        <dl className="divide-y divide-line rounded-xl border border-line text-base">
          <div className="flex justify-between px-4 py-3">
            <dt>{t("setDeposit")}</dt>
            <dd className="font-semibold">{rupees(s.deposit)}</dd>
          </div>
          {s.credit > 0 && (
            <div className="flex justify-between px-4 py-3">
              <dt>{t("setCredit")}</dt>
              <dd className="font-semibold">+ {rupees(s.credit)}</dd>
            </div>
          )}
          <div className="flex justify-between px-4 py-3">
            <dt>{t("setDues")}</dt>
            <dd className="font-semibold text-red-700">− {rupees(s.dues)}</dd>
          </div>
          <div className={`flex items-center justify-between px-4 py-4 ${s.refund > 0 ? "bg-brand-50" : s.owes > 0 ? "bg-marigold-100" : ""}`}>
            <dt className="font-semibold">{s.refund > 0 ? t("setRefund") : s.owes > 0 ? t("setOwes") : t("setSettled")}</dt>
            <dd className="text-2xl font-bold text-brand-900">{s.refund > 0 ? rupees(s.refund) : s.owes > 0 ? rupees(s.owes) : "✓"}</dd>
          </div>
        </dl>

        <h2 className="mt-5 mb-2 text-sm font-semibold text-brand-900">{t("setOpenList")}</h2>
        {open.length === 0 ? (
          <p className="text-sm text-muted">{t("setNothingOwed")}</p>
        ) : (
          <ul className="divide-y divide-line text-sm">
            {open.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-2">
                <span>
                  {label(c)}
                  {c.type !== "RENT" && c.type !== "DEPOSIT" && <span className="ml-2 text-xs text-muted">{chargeText(t, c.type)}</span>}
                  <span className="block text-xs text-muted">{fmtDate(c.dueDate, lang)}</span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="font-semibold">{rupees(c.open)}</span>
                  {c.type === "DEDUCTION" && (
                    <span className="no-print">
                      <ActionForm action={deleteCharge.bind(null, c.id)} submitLabel={t("remove")} submitClassName="min-h-9 text-sm text-muted hover:text-red-700 hover:underline" className="inline" />
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-10 hidden grid-cols-2 gap-8 text-sm print:grid">
          <p className="border-t border-ink pt-1">{t("setSign")}</p>
          <p className="border-t border-ink pt-1">{t("setSignTenant")}</p>
        </div>
        <p className="mt-4 hidden text-xs text-muted print:block">{fmtDate(asOf, lang)}</p>
      </Card>

      <div className="no-print mt-4 space-y-4">
        <Card title={t("setDeductTitle")}>
          <ActionForm action={addDeduction.bind(null, tn.id)} submitLabel={t("setAddDeduction")} submitClassName="btn-secondary" resetOnSuccess>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("setReason")}>
                <select name="reason" className="input" defaultValue="DAMAGE">
                  {DEDUCTION_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {t(`ded_${r}` as MsgKey)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t("amount")}>
                <input name="amount" className="input" inputMode="numeric" required />
              </Field>
            </div>
            <Field label={t("setNote")}>
              <input name="note" className="input" maxLength={120} placeholder={t("setNotePh")} />
            </Field>
          </ActionForm>
          {deductions.length > 0 && <p className="mt-2 text-xs text-muted">{deductions.length} × {t("charge_DEDUCTION")}</p>}
        </Card>

        <div className="flex flex-wrap items-start gap-3">
          {s.refund > 0 && (
            <ActionForm
              action={payRefund.bind(null, tn.id)}
              submitLabel={t("setPayRefund", { amt: rupees(s.refund) })}
              confirm={t("setPayRefundConfirm", { name: tn.name.split(" ")[0], amt: rupees(s.refund) })}
              className="flex flex-wrap items-end gap-3"
            >
              <Field label={t("setRefundHow")}>
                <select name="how" className="input" defaultValue="CASH">
                  <option value="CASH">{t("method_CASH")}</option>
                  <option value="UPI">{t("method_UPI")}</option>
                  <option value="BANK">{t("method_BANK")}</option>
                </select>
              </Field>
            </ActionForm>
          )}
          <a className="btn-accent" target="_blank" rel="noreferrer" href={`https://wa.me/${whatsappNumber(tn.phone)}?text=${encodeURIComponent(waText)}`}>
            {t("setSendWa")}
          </a>
        </div>
      </div>
    </div>
  );
}
