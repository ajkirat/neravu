import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireActor } from "@/lib/auth";
import { nextDueDate, summarizeLedger } from "@/lib/billing";
import { vacantBeds } from "@/lib/beds";
import { toDateInput, today } from "@/lib/dates";
import {
  CHARGE_TYPES,
  ID_TYPES,
  chargeText,
  fmtDate,
  fmtPeriod,
  methodText,
  reminderLink,
  welcomeLink,
  receiptLink,
  rupees,
} from "@/lib/format";
import { syncRentCharges } from "@/lib/ledger";
import { payTokens } from "@/lib/paylink";
import { ActionButton } from "@/components/today-actions";
import { pauseReminders } from "@/app/actions/requests";
import { appOrigin } from "@/lib/url";
import { getT } from "@/lib/i18n/server";
import { TenantStatusBadge } from "@/components/tenant-status";
import { LANGS, asLang } from "@/lib/i18n";
import { parseElectricityDescription } from "@/lib/electricity";
import { CopyButton } from "@/components/copy-button";
import { ActionForm } from "@/components/action-form";
import { BedPicker } from "@/components/bed-picker";
import { PaymentForm } from "@/components/payment-form";
import { FoldCard, Badge, Card, Field, PageHeader, Stat } from "@/components/ui";
import {
  addCharge,
  cancelNotice,
  changeBed,
  deleteCharge,
  giveNotice,
  moveOut,
  updateTenant,
} from "@/app/actions/tenants";
import { deletePayment, recordRefund } from "@/app/actions/payments";

export default async function TenantPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ welcome?: string }>;
}) {
  const { id } = await params;
  const justAdded = (await searchParams).welcome === "1";
  const { owner, role } = await requireActor();
  const isOwner = role === "OWNER";
  const { t: tr, lang } = await getT();
  await syncRentCharges(owner.id, id);
  const t = await db.tenant.findFirst({
    where: { id, ownerId: owner.id },
    include: {
      property: true,
      bed: { include: { room: true } },
      charges: { orderBy: { dueDate: "asc" } },
      payments: { orderBy: { paidOn: "asc" } },
    },
  });
  if (!t) notFound();
  // Every tenant has a My PG link (receipts, complaints, notice), even without online payment.
  const tokens = await payTokens(owner.id, [t.id]);
  const payUrl = tokens.get(t.id) ? `${await appOrigin()}/pay/${tokens.get(t.id)}` : undefined;
  const welcomeUrl = welcomeLink({
    phone: t.phone,
    tenantName: t.name,
    propertyName: owner.businessName ?? t.property.name,
    ownerPhone: owner.phone,
    rules: owner.houseRules,
    payUrl,
    lang: asLang(t.language ?? lang),
  });
  const rcpt = (r: { id: string | number; amount: number; date: Date; method?: string }) =>
    receiptLink({
      phone: t.phone,
      tenantName: t.name,
      amount: r.amount,
      propertyName: owner.businessName ?? t.property.name,
      paidOn: r.date,
      method: r.method ?? "OTHER",
      no: Number(r.id),
      outstanding: s.outstanding,
      lang: asLang(t.language ?? lang),
    });
  const asOf = today();
  const s = summarizeLedger(t.charges, t.payments, asOf);
  const beds = t.status === "MOVED_OUT" ? [] : await vacantBeds(owner.id);
  const next = t.status === "MOVED_OUT" ? null : nextDueDate({ moveIn: t.moveInDate, dueDay: t.rentDueDay, asOf });
  const willBill = next && (!t.moveOutDate || next < t.moveOutDate);

  // Merge charges and payments into one statement with a running balance.
  type Row =
    | { kind: "charge"; date: Date; id: string; label: string; type: string; amount: number; future: boolean }
    | { kind: "payment"; date: Date; id: number; label: string; amount: number; method: string };
  const rows: Row[] = [
    ...t.charges.map((c) => ({
      kind: "charge" as const,
      date: c.dueDate,
      id: c.id,
      label: parseElectricityDescription(c.description) ? tr("elecChargeLabel", { month: fmtPeriod(parseElectricityDescription(c.description)!.period, lang), room: parseElectricityDescription(c.description)!.room, days: parseElectricityDescription(c.description)!.days, total: parseElectricityDescription(c.description)!.total }) : c.type === "RENT" && c.period ? tr("rentForMonth", { month: fmtPeriod(c.period, lang) }) : c.type === "DEPOSIT" && c.description === "Security deposit" ? tr("charge_DEPOSIT") : c.description,
      type: c.type,
      amount: c.amount,
      future: c.dueDate > asOf,
    })),
    ...t.payments.map((p) => ({
      kind: "payment" as const,
      date: p.paidOn,
      id: p.id,
      label:
        p.amount < 0
          ? `${tr("refundLabel")}${p.note ? ` · ${p.note}` : ""}`
          : `${tr("paymentLabel")} · ${methodText(tr, p.method)}${p.reference ? ` · ${p.reference}` : ""}`,
      amount: p.amount,
      method: p.method,
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime() || (a.kind === "charge" ? -1 : 1));
  let running = 0;
  const statement = rows.map((r) => {
    if (r.kind === "charge" && !r.future) running += r.amount;
    if (r.kind === "payment") running -= r.amount;
    return { ...r, balance: running };
  });

  return (
    <>
      {isOwner && justAdded && t.status !== "MOVED_OUT" && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-brand-50 px-4 py-3">
          <p className="text-base font-semibold text-brand-900">{tr("welcomeAdded", { name: t.name.split(" ")[0] })}</p>
          <a className="btn-accent" target="_blank" rel="noreferrer" href={welcomeUrl}>
            {tr("welcomeBtn")}
          </a>
        </div>
      )}
      <PageHeader
        back={{ href: "/tenants", label: tr("tenantsTitle") }}
        title={t.name}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <TenantStatusBadge status={t.status} />
            <span>
              {t.property.name}
              {t.bed ? ` · Room ${t.bed.room.number}, Bed ${t.bed.label}` : ""}
            </span>
            <a href={`tel:${t.phone}`} className="text-brand-600 hover:underline">
              {t.phone}
            </a>
          </span>
        }
        actions={
          <>
            {isOwner && t.status !== "MOVED_OUT" && (
              <ActionButton
                action={pauseReminders.bind(null, t.id, t.remindersPausedUntil && t.remindersPausedUntil > new Date() ? 0 : 30)}
                label={t.remindersPausedUntil && t.remindersPausedUntil > new Date() ? tr("resumeReminders") : tr("pauseReminders")}
                className="btn-secondary"
              />
            )}
            {isOwner && t.status !== "MOVED_OUT" && !justAdded && (
              <a className="btn-secondary" target="_blank" rel="noreferrer" href={welcomeUrl}>
                {tr("welcomeBtn")}
              </a>
            )}
            {isOwner && t.status !== "ACTIVE" && (
              <Link href={`/tenants/${t.id}/settlement`} className="btn-primary">
                {tr("setBtn")}
              </Link>
            )}
            {isOwner && (
            <Link href={`/tenants/${t.id}/agreement`} className="btn-secondary">
              {tr("rentAgreement")}
            </Link>
            )}
            {s.outstanding > 0 && (
              <a
                className="btn-accent"
                target="_blank"
                rel="noreferrer"
                href={reminderLink({
                  phone: t.phone,
                  tenantName: t.name,
                  amount: s.outstanding,
                  propertyName: owner.businessName ?? t.property.name,
                  since: s.oldestUnpaid,
                  payUrl,
                  lang: asLang(t.language ?? lang),
                })}
              >
                {tr("sendReminder")}
              </a>
            )}
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-2 sm:mb-6 sm:gap-3 md:grid-cols-4">
        {s.outstanding > 0 ? (
          <Stat
            label={tr("pendingDues")}
            value={rupees(s.outstanding)}
            hint={s.oldestUnpaid ? tr("sinceDays", { date: fmtDate(s.oldestUnpaid, lang), n: s.overdueDays }) : undefined}
            tone="warn"
          />
        ) : (
          <Stat label={tr("balanceLabel")} value={s.advance ? tr("advanceVal", { amt: rupees(s.advance) }) : tr("settled")} tone="good" />
        )}
        <Stat label={tr("monthlyRent")} value={rupees(t.monthlyRent)} hint={tr("dueOnDay", { n: t.rentDueDay })} />
        <Stat label={tr("depositLabel")} value={rupees(t.deposit)} hint={tr("refundable")} />
        <Stat
          label={t.status === "ACTIVE" ? tr("nextRent") : t.status === "NOTICE" ? tr("leavingOn") : tr("statusMovedOut")}
          value={
            t.status === "ACTIVE"
              ? fmtDate(next)
              : fmtDate(t.moveOutDate)
          }
          hint={t.status === "NOTICE" && willBill ? tr("nextRentOn", { date: fmtDate(next, lang) }) : tr("joinedOn", { date: fmtDate(t.moveInDate, lang) })}
        />
      </div>

      {t.remindersPausedUntil && t.remindersPausedUntil > new Date() && (
        <p className="mb-4 rounded-lg bg-canvas px-4 py-3 text-sm text-muted">{tr("remindersPausedTill", { date: fmtDate(t.remindersPausedUntil, lang) })}</p>
      )}
      {t.payClaimedAt && s.outstanding > 0 && (
        <p className="mb-4 rounded-lg bg-marigold-100 px-4 py-3 text-sm text-marigold-700">
          {tr("saysPaidBanner", { name: t.name.split(" ")[0], date: fmtDate(t.payClaimedAt, lang) })}
        </p>
      )}
      {t.status !== "MOVED_OUT" && (
        <div className="card mb-4 flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:mb-6 sm:px-5">
          {payUrl ? (
            <>
              <div className="min-w-0">
                <p className="text-sm font-medium text-brand-900">{tr("payLinkTitle")}</p>
                <p className="truncate text-xs text-muted">{payUrl}</p>
              </div>
              <CopyButton text={payUrl} />
            </>
          ) : (
            <p className="text-sm text-muted">
              {tr("payLinkSetup")}{" "}
              <Link href="/settings" className="font-medium text-brand-600 underline">
                {tr("navSettings")}
              </Link>
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
        <div className="space-y-4 sm:space-y-6 lg:col-span-2">
          <Card title={tr("statement")} padded={false}>
            {statement.length === 0 ? (
              <p className="p-5 text-sm text-muted">{tr("noCharges")}</p>
            ) : (
              <>
              <ul className="divide-y divide-line md:hidden">
                {[...statement].reverse().map((r) => (
                  <li key={`m-${r.kind}-${r.id}`} className={`px-4 py-3 ${r.kind === "charge" && r.future ? "opacity-50" : ""}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-base font-medium">{r.label}</p>
                        <p className="text-sm text-muted">
                          {fmtDate(r.date, lang)}
                          {r.kind === "charge" && r.future ? ` · ${tr("upcoming")}` : ""}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={`text-base font-bold ${r.kind === "payment" ? "text-brand-700" : ""}`}>
                          {r.kind === "payment" ? "+ " : ""}
                          {rupees(r.amount)}
                        </p>
                        <p className={`text-xs ${r.balance > 0 ? "text-red-700" : "text-muted"}`}>
                          {tr("colBalance")}: {rupees(r.balance)}
                        </p>
                      </div>
                    </div>
                    {r.kind === "payment" ? (
                      <div className="mt-1 flex items-center justify-end gap-4">
                        <Link href={`/payments/${r.id}/receipt`} className="text-sm text-brand-600 underline">
                          {tr("receipt")}
                        </Link>
                        {r.amount > 0 && (
                          <a href={rcpt(r)} target="_blank" rel="noreferrer" className="text-sm text-brand-600 underline">
                            {tr("rcptSendWa")}
                          </a>
                        )}
                        {isOwner && (
                          <ActionForm
                            action={deletePayment.bind(null, r.id)}
                            submitLabel={tr("delete")}
                            submitClassName="min-h-9 text-sm text-red-700 hover:underline"
                            className="inline"
                            confirm={tr("deletePaymentConfirm")}
                          />
                        )}
                      </div>
                    ) : isOwner && r.amount > 0 ? (
                      <div className="mt-1 text-right">
                        <ActionForm
                          action={deleteCharge.bind(null, r.id)}
                          submitLabel={r.type === "RENT" ? tr("waive") : tr("remove")}
                          submitClassName="min-h-9 text-sm text-muted hover:text-red-700 hover:underline"
                          className="inline"
                          confirm={r.type === "RENT" ? tr("waiveConfirm") : tr("removeChargeConfirm")}
                        />
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
              <div className="hidden overflow-x-auto md:block">
                <table className="table">
                  <thead>
                    <tr>
                      <th>{tr("colDate")}</th>
                      <th>{tr("colItem")}</th>
                      <th className="text-right">{tr("colCharge")}</th>
                      <th className="text-right">{tr("colPaid")}</th>
                      <th className="text-right">{tr("colBalance")}</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {[...statement].reverse().map((r) => (
                      <tr key={`${r.kind}-${r.id}`} className={r.kind === "charge" && r.future ? "opacity-50" : ""}>
                        <td className="text-sm whitespace-nowrap text-muted">{fmtDate(r.date, lang)}</td>
                        <td className="text-sm">
                          {r.label}
                          {r.kind === "charge" && r.type !== "RENT" && r.label !== chargeText(tr, r.type) && (
                            <span className="ml-2">
                              <Badge>{chargeText(tr, r.type)}</Badge>
                            </span>
                          )}
                          {r.kind === "charge" && r.future && (
                            <span className="ml-2">
                              <Badge tone="amber">{tr("upcoming")}</Badge>
                            </span>
                          )}
                        </td>
                        <td className="text-right text-sm">{r.kind === "charge" ? rupees(r.amount) : ""}</td>
                        <td className="text-right text-sm text-brand-700">
                          {r.kind === "payment" ? rupees(r.amount) : ""}
                        </td>
                        <td className={`text-right text-sm font-medium ${r.balance > 0 ? "text-red-700" : ""}`}>
                          {rupees(r.balance)}
                        </td>
                        <td className="text-right whitespace-nowrap">
                          {r.kind === "payment" ? (
                            <span className="inline-flex items-center gap-2">
                              <Link href={`/payments/${r.id}/receipt`} className="text-xs text-brand-600 hover:underline">
                                {tr("receipt")}
                              </Link>
                              {r.amount > 0 && (
                                <a href={rcpt(r)} target="_blank" rel="noreferrer" className="text-xs text-brand-600 hover:underline">
                                  {tr("rcptSendWa")}
                                </a>
                              )}
{isOwner && (
                              <ActionForm
                                action={deletePayment.bind(null, r.id)}
                                submitLabel={tr("delete")}
                                submitClassName="text-xs text-red-700 hover:underline"
                                className="inline"
                                confirm={tr("deletePaymentConfirm")}
                              />
)}
                            </span>
                          ) : isOwner && r.amount > 0 ? (
                            <ActionForm
                              action={deleteCharge.bind(null, r.id)}
                              submitLabel={r.type === "RENT" ? tr("waive") : tr("remove")}
                              submitClassName="text-xs text-muted hover:text-red-700 hover:underline"
                              className="inline"
                              confirm={r.type === "RENT" ? tr("waiveConfirm") : tr("removeChargeConfirm")}
                            />
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </Card>

          {isOwner && (
<FoldCard title={tr("profileKyc")}>
            <ActionForm action={updateTenant.bind(null, t.id)} submitLabel={tr("saveChanges")}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={tr("fullName")}>
                  <input className="input" name="name" defaultValue={t.name} required />
                </Field>
                <Field label={tr("mobile")}>
                  <input className="input" name="phone" defaultValue={t.phone} required />
                </Field>
                <Field label={tr("email")}>
                  <input className="input" name="email" type="email" defaultValue={t.email ?? ""} />
                </Field>
                <Field label={tr("occupation")}>
                  <input className="input" name="occupation" defaultValue={t.occupation ?? ""} />
                </Field>
                <Field label={tr("idProof")}>
                  <select className="input" name="idType" defaultValue={t.idType ?? ""}>
                    <option value="">—</option>
                    {ID_TYPES.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </Field>
                <Field label={tr("idNumber")}>
                  <input className="input" name="idNumber" defaultValue={t.idNumber ?? ""} />
                </Field>
                <Field label={tr("emergencyName")}>
                  <input className="input" name="emergencyName" defaultValue={t.emergencyName ?? ""} />
                </Field>
                <Field label={tr("emergencyPhone")}>
                  <input className="input" name="emergencyPhone" defaultValue={t.emergencyPhone ?? ""} />
                </Field>
                <Field label={tr("permanentAddress")} className="sm:col-span-2">
                  <input className="input" name="permanentAddress" defaultValue={t.permanentAddress ?? ""} maxLength={300} />
                </Field>
                <Field label={tr("monthlyRentRs")}>
                  <input className="input" name="monthlyRent" inputMode="numeric" defaultValue={t.monthlyRent} required />
                </Field>
                <Field label={tr("rentDueDay")}>
                  <input className="input" name="rentDueDay" inputMode="numeric" defaultValue={t.rentDueDay} required />
                </Field>
              </div>
              <Field label={tr("notes")}>
                <textarea className="input" name="notes" rows={2} defaultValue={t.notes ?? ""} />
              </Field>
              <Field label={tr("tenantLanguage")} hint={tr("tenantLanguageHint")}>
                  <select className="input" name="language" defaultValue={asLang(t.language ?? lang)}>
                    {LANGS.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </Field>
            </ActionForm>
          </FoldCard>
)}
        </div>

        <div className="order-first space-y-4 sm:space-y-6 lg:order-none">
          <Card title={tr("recordPaymentCard")}>
            <PaymentForm tenantId={t.id} defaultAmount={s.outstanding} />
          </Card>

          {isOwner && (
<FoldCard title={tr("addCharge")}>
            <ActionForm action={addCharge.bind(null, t.id)} submitLabel={tr("addChargeBtn")} resetOnSuccess>
              <div className="grid grid-cols-2 gap-3">
                <Field label={tr("type")}>
                  <select className="input" name="type" defaultValue="ELECTRICITY">
                    {CHARGE_TYPES.map((c) => (
                      <option key={c} value={c}>
                        {chargeText(tr, c)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={tr("amount")}>
                  <input className="input" name="amount" inputMode="numeric" required />
                </Field>
              </div>
              <Field label={tr("description")}>
                <input className="input" name="description" placeholder={tr("descriptionPh")} />
              </Field>
              <Field label={tr("dueOn")}>
                <input className="input" type="date" name="dueDate" defaultValue={toDateInput(asOf)} />
              </Field>
            </ActionForm>
          </FoldCard>
)}

          {isOwner && t.status !== "MOVED_OUT" && (
            <FoldCard title={tr("noticeMoveOut")}>
              <div className="space-y-5">
                <Link href={`/tenants/${t.id}/settlement`} className="btn-secondary w-full sm:w-auto">
                  {tr("setBtn")}
                </Link>
                {t.status === "ACTIVE" ? (
                  <ActionForm action={giveNotice.bind(null, t.id)} submitLabel={tr("recordNotice")} submitClassName="btn-secondary">
                    <Field label={tr("expectedMoveOut")}>
                      <input className="input" type="date" name="moveOutDate" required />
                    </Field>
                  </ActionForm>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted">
                      {tr("noticeGave", { d1: fmtDate(t.noticeDate, lang), d2: fmtDate(t.moveOutDate, lang) })}
                    </p>
                    <ActionForm
                      action={cancelNotice.bind(null, t.id)}
                      submitLabel={tr("withdrawNotice")}
                      submitClassName="btn-secondary btn-sm"
                    />
                  </div>
                )}
                <div className="border-t border-line pt-4">
                  <ActionForm
                    action={moveOut.bind(null, t.id)}
                    submitLabel={tr("moveOutNow")}
                    submitClassName="btn-danger"
                    confirm={tr("moveOutConfirm", { name: t.name })}
                  >
                    <Field
                      label={tr("moveOutDate")}
                      hint={
                        tr("settlementHint", { dues: rupees(s.outstanding), dep: rupees(t.deposit) })
                      }
                    >
                      <input
                        className="input"
                        type="date"
                        name="moveOutDate"
                        defaultValue={toDateInput(t.moveOutDate ?? asOf)}
                        required
                      />
                    </Field>
                  </ActionForm>
                </div>
              </div>
            </FoldCard>
          )}

          {isOwner && t.status !== "ACTIVE" && (
            <FoldCard title={tr("refundToTenant")}>
              <ActionForm action={recordRefund.bind(null, t.id)} submitLabel={tr("recordRefund")} submitClassName="btn-secondary" resetOnSuccess>
                <p className="text-sm text-muted">
                  {s.advance > 0
                    ? tr("owedBack", { amt: rupees(s.advance), name: t.name.split(" ")[0] })
                    : s.outstanding > 0
                      ? tr("stillOwes", { name: t.name.split(" ")[0], amt: rupees(s.outstanding) })
                      : tr("accountSettled")}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label={tr("amount")}>
                    <input className="input" name="amount" inputMode="numeric" defaultValue={s.advance || undefined} required />
                  </Field>
                  <Field label={tr("date")}>
                    <input className="input" type="date" name="paidOn" defaultValue={toDateInput(asOf)} />
                  </Field>
                </div>
              </ActionForm>
            </FoldCard>
          )}

          {isOwner && t.status !== "MOVED_OUT" && beds.length > 0 && (
            <FoldCard title={tr("shiftBedCard")}>
              <ActionForm action={changeBed.bind(null, t.id)} submitLabel={tr("shiftBedBtn")} submitClassName="btn-secondary">
                <BedPicker beds={beds} withRent={false} />
              </ActionForm>
            </FoldCard>
          )}
        </div>
      </div>
    </>
  );
}
