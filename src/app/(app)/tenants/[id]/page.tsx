import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { nextDueDate, summarizeLedger } from "@/lib/billing";
import { vacantBeds } from "@/lib/beds";
import { toDateInput, today } from "@/lib/dates";
import {
  CHARGE_TYPES,
  ID_TYPES,
  chargeLabel,
  fmtDate,
  methodLabel,
  reminderLink,
  rupees,
} from "@/lib/format";
import { syncRentCharges } from "@/lib/ledger";
import { ActionForm } from "@/components/action-form";
import { BedPicker } from "@/components/bed-picker";
import { PaymentForm } from "@/components/payment-form";
import { Badge, Card, Field, PageHeader, Stat, TenantStatusBadge } from "@/components/ui";
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

export default async function TenantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owner = await requireOwner();
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
  const asOf = today();
  const s = summarizeLedger(t.charges, t.payments, asOf);
  const beds = t.status === "MOVED_OUT" ? [] : await vacantBeds(owner.id);
  const next = t.status === "MOVED_OUT" ? null : nextDueDate({ moveIn: t.moveInDate, dueDay: t.rentDueDay, asOf });
  const willBill = next && (!t.moveOutDate || next < t.moveOutDate);

  // Merge charges and payments into one statement with a running balance.
  type Row =
    | { kind: "charge"; date: Date; id: string; label: string; type: string; amount: number; future: boolean }
    | { kind: "payment"; date: Date; id: number; label: string; amount: number };
  const rows: Row[] = [
    ...t.charges.map((c) => ({
      kind: "charge" as const,
      date: c.dueDate,
      id: c.id,
      label: c.description,
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
          ? `Refund${p.note ? ` · ${p.note}` : ""}`
          : `Payment · ${methodLabel[p.method] ?? p.method}${p.reference ? ` · ${p.reference}` : ""}`,
      amount: p.amount,
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
      <PageHeader
        back={{ href: "/tenants", label: "Tenants" }}
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
          s.outstanding > 0 ? (
            <a
              className="btn-accent"
              target="_blank"
              rel="noreferrer"
              href={reminderLink({
                phone: t.phone,
                tenantName: t.name,
                amount: s.outstanding,
                propertyName: t.property.name,
                since: s.oldestUnpaid,
              })}
            >
              Send WhatsApp reminder
            </a>
          ) : undefined
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {s.outstanding > 0 ? (
          <Stat
            label="Pending dues"
            value={rupees(s.outstanding)}
            hint={s.oldestUnpaid ? `Since ${fmtDate(s.oldestUnpaid)} · ${s.overdueDays} days` : undefined}
            tone="warn"
          />
        ) : (
          <Stat label="Balance" value={s.advance ? `${rupees(s.advance)} advance` : "Settled"} tone="good" />
        )}
        <Stat label="Monthly rent" value={rupees(t.monthlyRent)} hint={`Due on day ${t.rentDueDay}`} />
        <Stat label="Deposit" value={rupees(t.deposit)} hint="Refundable" />
        <Stat
          label={t.status === "ACTIVE" ? "Next rent" : t.status === "NOTICE" ? "Leaving on" : "Moved out"}
          value={
            t.status === "ACTIVE"
              ? fmtDate(next)
              : fmtDate(t.moveOutDate)
          }
          hint={t.status === "NOTICE" && willBill ? `Next rent ${fmtDate(next)}` : `Joined ${fmtDate(t.moveInDate)}`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Statement" padded={false}>
            {statement.length === 0 ? (
              <p className="p-5 text-sm text-muted">No charges yet. Rent will appear on the move-in date.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Item</th>
                      <th className="text-right">Charge</th>
                      <th className="text-right">Paid</th>
                      <th className="text-right">Balance</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {[...statement].reverse().map((r) => (
                      <tr key={`${r.kind}-${r.id}`} className={r.kind === "charge" && r.future ? "opacity-50" : ""}>
                        <td className="text-sm whitespace-nowrap text-muted">{fmtDate(r.date)}</td>
                        <td className="text-sm">
                          {r.label}
                          {r.kind === "charge" && r.type !== "RENT" && r.label !== chargeLabel[r.type] && (
                            <span className="ml-2">
                              <Badge>{chargeLabel[r.type]}</Badge>
                            </span>
                          )}
                          {r.kind === "charge" && r.future && (
                            <span className="ml-2">
                              <Badge tone="amber">Upcoming</Badge>
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
                                Receipt
                              </Link>
                              <ActionForm
                                action={deletePayment.bind(null, r.id)}
                                submitLabel="Delete"
                                submitClassName="text-xs text-red-700 hover:underline"
                                className="inline"
                                confirm="Delete this payment?"
                              />
                            </span>
                          ) : r.amount > 0 ? (
                            <ActionForm
                              action={deleteCharge.bind(null, r.id)}
                              submitLabel={r.type === "RENT" ? "Waive" : "Remove"}
                              submitClassName="text-xs text-muted hover:text-red-700 hover:underline"
                              className="inline"
                              confirm={r.type === "RENT" ? "Waive this month's rent?" : "Remove this charge?"}
                            />
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title="Profile and KYC">
            <ActionForm action={updateTenant.bind(null, t.id)} submitLabel="Save changes">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name">
                  <input className="input" name="name" defaultValue={t.name} required />
                </Field>
                <Field label="Mobile">
                  <input className="input" name="phone" defaultValue={t.phone} required />
                </Field>
                <Field label="Email">
                  <input className="input" name="email" type="email" defaultValue={t.email ?? ""} />
                </Field>
                <Field label="Occupation / college">
                  <input className="input" name="occupation" defaultValue={t.occupation ?? ""} />
                </Field>
                <Field label="ID proof">
                  <select className="input" name="idType" defaultValue={t.idType ?? ""}>
                    <option value="">—</option>
                    {ID_TYPES.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </Field>
                <Field label="ID number">
                  <input className="input" name="idNumber" defaultValue={t.idNumber ?? ""} />
                </Field>
                <Field label="Emergency contact name">
                  <input className="input" name="emergencyName" defaultValue={t.emergencyName ?? ""} />
                </Field>
                <Field label="Emergency contact phone">
                  <input className="input" name="emergencyPhone" defaultValue={t.emergencyPhone ?? ""} />
                </Field>
                <Field label="Monthly rent (₹)">
                  <input className="input" name="monthlyRent" inputMode="numeric" defaultValue={t.monthlyRent} required />
                </Field>
                <Field label="Rent due day (1-28)">
                  <input className="input" name="rentDueDay" inputMode="numeric" defaultValue={t.rentDueDay} required />
                </Field>
              </div>
              <Field label="Notes">
                <textarea className="input" name="notes" rows={2} defaultValue={t.notes ?? ""} />
              </Field>
            </ActionForm>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Record a payment">
            <PaymentForm tenantId={t.id} defaultAmount={s.outstanding} />
          </Card>

          <Card title="Add a charge">
            <ActionForm action={addCharge.bind(null, t.id)} submitLabel="Add charge" resetOnSuccess>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Type">
                  <select className="input" name="type" defaultValue="ELECTRICITY">
                    {CHARGE_TYPES.map((c) => (
                      <option key={c} value={c}>
                        {chargeLabel[c]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Amount (₹)">
                  <input className="input" name="amount" inputMode="numeric" required />
                </Field>
              </div>
              <Field label="Description">
                <input className="input" name="description" placeholder="e.g. October electricity, 112 units" />
              </Field>
              <Field label="Due on">
                <input className="input" type="date" name="dueDate" defaultValue={toDateInput(asOf)} />
              </Field>
            </ActionForm>
          </Card>

          {t.status !== "MOVED_OUT" && (
            <Card title="Notice and move-out">
              <div className="space-y-5">
                {t.status === "ACTIVE" ? (
                  <ActionForm action={giveNotice.bind(null, t.id)} submitLabel="Record notice" submitClassName="btn-secondary">
                    <Field label="Expected move-out date">
                      <input className="input" type="date" name="moveOutDate" required />
                    </Field>
                  </ActionForm>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted">
                      Gave notice on {fmtDate(t.noticeDate)}, leaving {fmtDate(t.moveOutDate)}.
                    </p>
                    <ActionForm
                      action={cancelNotice.bind(null, t.id)}
                      submitLabel="Withdraw notice"
                      submitClassName="btn-secondary btn-sm"
                    />
                  </div>
                )}
                <div className="border-t border-line pt-4">
                  <ActionForm
                    action={moveOut.bind(null, t.id)}
                    submitLabel="Move out now"
                    submitClassName="btn-danger"
                    confirm={`Move ${t.name} out and free the bed?`}
                  >
                    <Field
                      label="Move-out date"
                      hint={
                        <>
                          Settlement: dues {rupees(s.outstanding)} vs deposit {rupees(t.deposit)}. Add any
                          deductions as charges, then record the refund.
                        </>
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
            </Card>
          )}

          {t.status !== "ACTIVE" && (
            <Card title="Refund to tenant">
              <ActionForm action={recordRefund.bind(null, t.id)} submitLabel="Record refund" submitClassName="btn-secondary" resetOnSuccess>
                <p className="text-sm text-muted">
                  {s.advance > 0
                    ? `${rupees(s.advance)} is owed back to ${t.name.split(" ")[0]}.`
                    : s.outstanding > 0
                      ? `${t.name.split(" ")[0]} still owes ${rupees(s.outstanding)}.`
                      : "Account is settled."}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Amount (₹)">
                    <input className="input" name="amount" inputMode="numeric" defaultValue={s.advance || undefined} required />
                  </Field>
                  <Field label="Date">
                    <input className="input" type="date" name="paidOn" defaultValue={toDateInput(asOf)} />
                  </Field>
                </div>
              </ActionForm>
            </Card>
          )}

          {t.status !== "MOVED_OUT" && beds.length > 0 && (
            <Card title="Shift to another bed">
              <ActionForm action={changeBed.bind(null, t.id)} submitLabel="Shift bed" submitClassName="btn-secondary">
                <BedPicker beds={beds} withRent={false} />
              </ActionForm>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
