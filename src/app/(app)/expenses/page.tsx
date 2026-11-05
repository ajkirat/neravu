import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { monthRange, periodKey, toDateInput, today } from "@/lib/dates";
import { EXPENSE_CATEGORIES, fmtDate, rupees } from "@/lib/format";
import { ActionForm } from "@/components/action-form";
import { MonthPicker } from "@/components/month-picker";
import { Card, EmptyState, Field, PageHeader } from "@/components/ui";
import { createExpense, deleteExpense } from "@/app/actions/expenses";

export const metadata = { title: "Expenses" };

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const sp = await searchParams;
  const owner = await requireOwner();
  const month = sp.month && monthRange(sp.month) ? sp.month : periodKey(today());
  const range = monthRange(month)!;
  const [expenses, properties] = await Promise.all([
    db.expense.findMany({
      where: { ownerId: owner.id, spentOn: { gte: range.start, lt: range.end } },
      include: { property: true },
      orderBy: [{ spentOn: "desc" }, { createdAt: "desc" }],
    }),
    db.property.findMany({ where: { ownerId: owner.id }, orderBy: { name: "asc" } }),
  ]);
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const byCat = new Map<string, number>();
  for (const e of expenses) byCat.set(e.category, (byCat.get(e.category) ?? 0) + e.amount);
  const cats = [...byCat].sort((a, b) => b[1] - a[1]);

  return (
    <>
      <PageHeader
        title="Expenses"
        subtitle="What it costs to run your PGs."
        actions={<MonthPicker base="/expenses" month={month} />}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="card p-4">
            <p className="text-xs text-muted uppercase">Spent this month</p>
            <p className="text-2xl font-bold text-brand-900">{rupees(total)}</p>
            {cats.length > 0 && (
              <div className="mt-4 space-y-2">
                {cats.map(([c, v]) => (
                  <div key={c} className="grid grid-cols-[8rem_1fr_6rem] items-center gap-3 text-sm">
                    <span className="truncate text-muted">{c}</span>
                    <span className="h-2 rounded-full bg-canvas">
                      <span
                        className="block h-2 rounded-full bg-marigold-400"
                        style={{ width: `${Math.max(3, (v / total) * 100)}%` }}
                      />
                    </span>
                    <span className="text-right font-medium">{rupees(v)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {expenses.length === 0 ? (
            <EmptyState title="No expenses this month" body="Log bills, salaries and purchases to see your real profit." />
          ) : (
            <div className="card overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Property</th>
                    <th className="text-right">Amount</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e) => (
                    <tr key={e.id}>
                      <td className="text-sm whitespace-nowrap text-muted">{fmtDate(e.spentOn)}</td>
                      <td className="text-sm">
                        {e.category}
                        {e.note && <div className="text-xs text-muted">{e.note}</div>}
                      </td>
                      <td className="text-sm">{e.property?.name ?? "All / general"}</td>
                      <td className="text-right font-semibold">{rupees(e.amount)}</td>
                      <td className="text-right">
                        <ActionForm
                          action={deleteExpense.bind(null, e.id)}
                          submitLabel="Delete"
                          submitClassName="text-xs text-muted hover:text-red-700 hover:underline"
                          className="inline"
                          confirm="Delete this expense?"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <Card title="Add an expense">
          <ActionForm action={createExpense} submitLabel="Add expense" resetOnSuccess>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Amount (₹)">
                <input className="input" name="amount" inputMode="numeric" required />
              </Field>
              <Field label="Date">
                <input className="input" type="date" name="spentOn" defaultValue={toDateInput(today())} />
              </Field>
            </div>
            <Field label="Category">
              <select className="input" name="category" defaultValue="Groceries">
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Property">
              <select className="input" name="propertyId" defaultValue={properties.length === 1 ? properties[0].id : ""}>
                <option value="">All / general</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Note">
              <input className="input" name="note" placeholder="e.g. Vegetables for the week" />
            </Field>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
