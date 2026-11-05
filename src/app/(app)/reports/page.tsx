import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { monthRange, periodKey, shiftPeriod, today } from "@/lib/dates";
import { fmtPeriod, rupees } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { syncRentCharges } from "@/lib/ledger";
import { MonthPicker } from "@/components/month-picker";
import { Card, PageHeader } from "@/components/ui";

export const metadata = { title: "Reports" };

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const sp = await searchParams;
  const owner = await requireOwner();
  const { t: tr, lang } = await getT();
  await syncRentCharges(owner.id);
  const month = sp.month && monthRange(sp.month) ? sp.month : periodKey(today());
  const range = monthRange(month)!;
  const trendStart = monthRange(shiftPeriod(month, -5))!.start;

  const [properties, charges, payments, expenses] = await Promise.all([
    db.property.findMany({
      where: { ownerId: owner.id },
      orderBy: { name: "asc" },
      include: {
        rooms: { select: { beds: { select: { id: true } } } },
        tenants: { where: { status: { in: ["ACTIVE", "NOTICE"] } }, select: { id: true } },
      },
    }),
    db.charge.findMany({
      where: { tenant: { ownerId: owner.id }, dueDate: { gte: range.start, lt: range.end } },
      select: { amount: true, type: true, tenant: { select: { propertyId: true } } },
    }),
    db.payment.findMany({
      where: { tenant: { ownerId: owner.id }, paidOn: { gte: trendStart, lt: range.end } },
      select: { amount: true, paidOn: true, tenant: { select: { propertyId: true } } },
    }),
    db.expense.findMany({
      where: { ownerId: owner.id, spentOn: { gte: trendStart, lt: range.end } },
      select: { amount: true, spentOn: true, propertyId: true },
    }),
  ]);

  const inMonth = (d: Date) => d >= range.start && d < range.end;
  const rows = properties.map((p) => {
    const beds = p.rooms.reduce((s, r) => s + r.beds.length, 0);
    const billed = charges
      .filter((c) => c.tenant.propertyId === p.id && c.type !== "DEPOSIT")
      .reduce((s, c) => s + c.amount, 0);
    const collected = payments
      .filter((x) => x.tenant.propertyId === p.id && inMonth(x.paidOn))
      .reduce((s, x) => s + x.amount, 0);
    const spent = expenses
      .filter((e) => e.propertyId === p.id && inMonth(e.spentOn))
      .reduce((s, e) => s + e.amount, 0);
    return { p, beds, occupied: p.tenants.length, billed, collected, spent };
  });
  const general = expenses.filter((e) => !e.propertyId && inMonth(e.spentOn)).reduce((s, e) => s + e.amount, 0);
  const totals = rows.reduce(
    (t, r) => ({
      billed: t.billed + r.billed,
      collected: t.collected + r.collected,
      spent: t.spent + r.spent,
    }),
    { billed: 0, collected: 0, spent: general },
  );

  const trend = Array.from({ length: 6 }, (_, i) => {
    const m = shiftPeriod(month, i - 5);
    const r = monthRange(m)!;
    const within = (d: Date) => d >= r.start && d < r.end;
    return {
      m,
      collected: payments.filter((x) => within(x.paidOn)).reduce((s, x) => s + x.amount, 0),
      spent: expenses.filter((e) => within(e.spentOn)).reduce((s, e) => s + e.amount, 0),
    };
  });
  const max = Math.max(1, ...trend.flatMap((t) => [t.collected, t.spent]));

  return (
    <>
      <PageHeader
        title={tr("reportsTitle")}
        subtitle={tr("reportsSub")}
        actions={
          <>
            <MonthPicker base="/reports" month={month} />
            <a href="/reports/dues.csv" className="btn-secondary">
              {tr("exportDues")}
            </a>
          </>
        }
      />

      <Card title={tr("byProperty", { month: fmtPeriod(month, lang) })} padded={false} className="mb-6">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>{tr("colProperty")}</th>
                <th>{tr("colOccupancy")}</th>
                <th className="text-right">{tr("colBilled")}</th>
                <th className="text-right">{tr("colCollected")}</th>
                <th className="text-right">{tr("colExpenses")}</th>
                <th className="text-right">{tr("colNet")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.p.id}>
                  <td className="font-medium">{r.p.name}</td>
                  <td className="text-sm text-muted">
                    {tr("bedsShort", { occ: r.occupied, beds: r.beds })}
                  </td>
                  <td className="text-right">{rupees(r.billed)}</td>
                  <td className="text-right">{rupees(r.collected)}</td>
                  <td className="text-right">{rupees(r.spent)}</td>
                  <td className="text-right font-semibold">{rupees(r.collected - r.spent)}</td>
                </tr>
              ))}
              {general > 0 && (
                <tr>
                  <td className="text-muted">{tr("generalExpenses")}</td>
                  <td />
                  <td />
                  <td />
                  <td className="text-right">{rupees(general)}</td>
                  <td className="text-right font-semibold">{rupees(-general)}</td>
                </tr>
              )}
              <tr className="bg-canvas font-semibold">
                <td>{tr("totalRow")}</td>
                <td />
                <td className="text-right">{rupees(totals.billed)}</td>
                <td className="text-right">{rupees(totals.collected)}</td>
                <td className="text-right">{rupees(totals.spent)}</td>
                <td className="text-right">{rupees(totals.collected - totals.spent)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="border-t border-line px-5 py-3 text-xs text-muted">
          {tr("reportNote")}
        </p>
      </Card>

      <Card title={tr("last6")}>
        <div className="mb-4 flex gap-4 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-brand-500" /> {tr("legendCollected")}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-marigold-400" /> {tr("legendExpenses")}
          </span>
        </div>
        <div className="grid h-56 grid-cols-6 items-end gap-3">
          {trend.map((t) => (
            <div key={t.m} className="flex h-full flex-col justify-end">
              <div className="flex flex-1 items-end justify-center gap-1">
                <div
                  className="w-1/3 rounded-t bg-brand-500"
                  style={{ height: `${(Math.max(0, t.collected) / max) * 100}%` }}
                  title={`${tr("legendCollected")} ${rupees(t.collected)}`}
                />
                <div
                  className="w-1/3 rounded-t bg-marigold-400"
                  style={{ height: `${(t.spent / max) * 100}%` }}
                  title={`${tr("legendExpenses")} ${rupees(t.spent)}`}
                />
              </div>
              <p className="mt-2 text-center text-xs text-muted">{fmtPeriod(t.m, lang).split(" ")[0].slice(0, 4)}</p>
              <p className="text-center text-[11px] font-medium">{rupees(t.collected - t.spent)}</p>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
