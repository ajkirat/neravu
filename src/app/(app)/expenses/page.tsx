import Link from "next/link";
import { waBillNumber } from "@/lib/whatsapp";
import { PhotoThumb } from "@/components/photo-lightbox";
import { db } from "@/lib/db";
import { requireActor } from "@/lib/auth";
import { monthRange, periodKey, toDateInput, today } from "@/lib/dates";
import { EXPENSE_CATEGORIES, categoryText, fmtDate, rupees } from "@/lib/format";
import { ActionForm } from "@/components/action-form";
import { ExpenseForm } from "@/components/expense-form";
import { scanEnabled } from "@/lib/receipt-ai";
import { getT } from "@/lib/i18n/server";
import { Badge } from "@/components/ui";
import { MonthPicker } from "@/components/month-picker";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { deleteExpense } from "@/app/actions/expenses";

export const metadata = { title: "Expenses" };

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const sp = await searchParams;
  const { owner, role, staff } = await requireActor();
  const isOwner = role === "OWNER";
  const { t, lang } = await getT();
  const month = sp.month && monthRange(sp.month) ? sp.month : periodKey(today());
  const range = monthRange(month)!;
  const [expenses, properties] = await Promise.all([
    db.expense.findMany({
      // A caretaker sees only the bills they added, never the PG's spending.
      where: { ownerId: owner.id, spentOn: { gte: range.start, lt: range.end }, ...(isOwner ? {} : { addedByStaffId: staff?.id ?? "-" }) },
      include: { property: true, items: { orderBy: { id: "asc" } }, receipt: { select: { expenseId: true } } },
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
        title={t("expensesTitle")}
        subtitle={
          isOwner && waBillNumber() ? (
            <>
              {t("expensesSub")}{" "}
              <span className="mt-1 block font-medium text-brand-700">{t("waBillsHint", { num: waBillNumber()! })}</span>
            </>
          ) : (
            t("expensesSub")
          )
        }
        actions={<MonthPicker base="/expenses" month={month} />}
      />
      <div className="space-y-4">
        <Card title={t("addExpenseCard")}>
          <ExpenseForm
            properties={properties.map((p) => ({ id: p.id, name: p.name }))}
            categories={EXPENSE_CATEGORIES.map((c) => ({ value: c, label: categoryText(t, c) }))}
            defaultDate={toDateInput(today())}
            scanEnabled={scanEnabled()}
            currentMonth={month}
          />
        </Card>
        <div className="space-y-4">
          {isOwner && (
          <div className="card p-4">
            <p className="text-xs text-muted uppercase">{t("spentThisMonth")}</p>
            <p className="text-2xl font-bold text-brand-900">{rupees(total)}</p>
            {cats.length > 0 && (
              <div className="mt-4 space-y-2">
                {cats.map(([c, v]) => (
                  <div key={c} className="grid grid-cols-[6rem_1fr_5rem] items-center gap-2 text-sm sm:grid-cols-[8rem_1fr_6rem] sm:gap-3">
                    <span className="truncate text-muted">{categoryText(t, c)}</span>
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
          )}
          {expenses.length === 0 ? (
            <EmptyState title={t("noExpenses")} body={t("noExpensesBody")} />
          ) : (
            <>
            <ul className="space-y-2 md:hidden">
              {expenses.map((e) => (
                <li key={e.id} className="card p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    {e.receipt && <PhotoThumb src={`/expenses/${e.id}/bill`} alt={t("billPhoto")} className="h-14 w-14" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-semibold text-brand-900">
                        <Link href={`/expenses/${e.id}`} className="hover:underline">{categoryText(t, e.category)}</Link>{" "}
                        {e.mayBeDuplicate && <Badge tone="amber">{t("dupBadge")}</Badge>}{" "}
                        {e.source === "SCAN" && <Badge tone="green">{t("scannedBadge")}</Badge>}
                        {e.source === "WHATSAPP" && <Badge tone="green">{t("waBadge")}</Badge>}
                        {e.addedByName && <span className="block text-xs font-normal text-muted">{t("sentBy", { name: e.addedByName })}</span>}
                      </p>
                      <p className="text-sm text-muted">
                        {fmtDate(e.spentOn, lang)} · {e.property?.name ?? t("allGeneral")}
                      </p>
                      {e.vendor && <p className="text-sm font-medium">{e.vendor}</p>}
                      {e.note && <p className="text-sm text-muted">{e.note}</p>}
                    </div>
                    <p className="shrink-0 text-base font-bold">{rupees(e.amount)}</p>
                  </div>
                  {e.items.length > 0 && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-sm text-brand-600">{t("itemsN", { n: e.items.length })}</summary>
                      <ul className="mt-1 space-y-0.5 text-sm text-muted">
                        {e.items.map((i) => (
                          <li key={i.id} className="flex justify-between gap-3">
                            <span>
                              {i.name}
                              {i.quantity !== 1 ? ` × ${i.quantity}` : ""}
                            </span>
                            <span>{rupees(i.amount)}</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                  {isOwner && (
                  <div className="mt-1 text-right">
                    <ActionForm
                      action={deleteExpense.bind(null, e.id)}
                      submitLabel={t("delete")}
                      submitClassName="min-h-9 px-2 text-sm text-muted hover:text-red-700 hover:underline"
                      className="inline"
                      confirm={t("deleteExpenseConfirm")}
                    />
                  </div>
                  )}
                </li>
              ))}
            </ul>
            <div className="card hidden overflow-x-auto md:block">
              <table className="table">
                <thead>
                  <tr>
                    <th className="w-16">{t("billPhoto")}</th>
                    <th>{t("date")}</th>
                    <th>{t("colCategory")}</th>
                    <th>{t("colProperty")}</th>
                    <th className="text-right">{t("colAmount")}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e) => (
                    <tr key={e.id}>
                      <td>{e.receipt ? <PhotoThumb src={`/expenses/${e.id}/bill`} alt={t("billPhoto")} className="h-14 w-14" /> : <span className="text-xs text-muted">—</span>}</td>
                      <td className="text-sm whitespace-nowrap text-muted">{fmtDate(e.spentOn, lang)}</td>
                      <td className="text-sm">
                        <Link href={`/expenses/${e.id}`} className="font-medium text-brand-900 hover:underline">{categoryText(t, e.category)}</Link>{" "}
                        {e.mayBeDuplicate && <Badge tone="amber">{t("dupBadge")}</Badge>}{" "}
                        {e.source === "SCAN" && <Badge tone="green">{t("scannedBadge")}</Badge>}
                        {e.source === "WHATSAPP" && <Badge tone="green">{t("waBadge")}</Badge>}
                        {e.addedByName && <span className="block text-xs font-normal text-muted">{t("sentBy", { name: e.addedByName })}</span>}
                        {e.vendor && <div className="text-xs font-medium text-brand-900">{e.vendor}</div>}
                        {e.note && <div className="text-xs text-muted">{e.note}</div>}
                        {e.items.length > 0 && (
                          <details className="mt-1">
                            <summary className="cursor-pointer text-xs text-brand-600">{t("itemsN", { n: e.items.length })}</summary>
                            <ul className="mt-1 space-y-0.5 text-xs text-muted">
                              {e.items.map((i) => (
                                <li key={i.id} className="flex justify-between gap-3">
                                  <span>
                                    {i.name}
                                    {i.quantity !== 1 ? ` × ${i.quantity}` : ""}
                                  </span>
                                  <span>{rupees(i.amount)}</span>
                                </li>
                              ))}
                            </ul>
                          </details>
                        )}
                      </td>
                      <td className="text-sm">{e.property?.name ?? t("allGeneral")}</td>
                      <td className="text-right font-semibold">{rupees(e.amount)}</td>
                      <td className="text-right">
                        {isOwner && (
                        <ActionForm
                          action={deleteExpense.bind(null, e.id)}
                          submitLabel={t("delete")}
                          submitClassName="text-xs text-muted hover:text-red-700 hover:underline"
                          className="inline"
                          confirm={t("deleteExpenseConfirm")}
                        />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
