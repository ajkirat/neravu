import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireActor } from "@/lib/auth";
import { categoryText, fmtDate, rupees } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { clearDuplicate, deleteExpenseAndBack } from "@/app/actions/expenses";
import { ActionForm } from "@/components/action-form";
import { ActionButton } from "@/components/today-actions";
import { Badge, Card, PageHeader } from "@/components/ui";

export const metadata = { title: "Expense" };

/** One expense, with its bill photo shown large. Owner, or the caretaker who added it. */
export default async function ExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { owner, role, staff } = await requireActor();
  const isOwner = role === "OWNER";
  const { t, lang } = await getT();
  const e = await db.expense.findFirst({
    where: { id, ownerId: owner.id, ...(isOwner ? {} : { addedByStaffId: staff?.id ?? "-" }) },
    include: { property: true, items: { orderBy: { id: "asc" } }, receipt: { select: { expenseId: true } } },
  });
  if (!e) notFound();
  const original = e.duplicateOfId ? await db.expense.findFirst({ where: { id: e.duplicateOfId, ownerId: owner.id }, select: { id: true, spentOn: true } }) : null;
  const month = e.spentOn.toISOString().slice(0, 7);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader back={{ href: `/expenses?month=${month}`, label: t("expensesTitle") }} title={t("expenseTitle")} />
      {e.mayBeDuplicate && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-marigold-100 px-4 py-3 text-sm text-marigold-700">
          <span>
            ⚠️ <span className="font-semibold">{t("dupBadge")}</span>
            {original && (
              <>
                {" · "}
                <Link href={`/expenses/${original.id}`} className="underline">
                  {t("dupOf", { date: fmtDate(original.spentOn, lang) })}
                </Link>
              </>
            )}
          </span>
          {isOwner && <ActionButton action={clearDuplicate.bind(null, e.id)} label={t("notDuplicate")} />}
        </div>
      )}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-brand-900">
              {categoryText(t, e.category)} {e.mayBeDuplicate && <Badge tone="amber">{t("dupBadge")}</Badge>}
            </p>
            <p className="text-sm text-muted">
              {fmtDate(e.spentOn, lang)} · {e.property?.name ?? t("allGeneral")}
            </p>
            {e.vendor && <p className="text-base font-medium">{e.vendor}</p>}
            {e.note && <p className="text-sm text-muted">{e.note}</p>}
            {e.addedByName && <p className="text-sm text-muted">{t("sentBy", { name: e.addedByName })}</p>}
          </div>
          <p className="text-2xl font-bold text-brand-900">{rupees(e.amount)}</p>
        </div>
        {e.items.length > 0 && (
          <ul className="mt-4 divide-y divide-line border-t border-line text-sm">
            {e.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-3 py-1.5">
                <span>
                  {i.name}
                  {i.quantity !== 1 ? ` × ${i.quantity}` : ""}
                </span>
                <span>{rupees(i.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title={t("billPhoto")}>
        {e.receipt ? (
          <>
            {/* Shown large by default: the attachment is the point of opening an expense. */}
            <a href={`/expenses/${e.id}/bill`} target="_blank" rel="noreferrer" className="block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/expenses/${e.id}/bill`} alt={t("billPhoto")} className="mx-auto max-h-[80vh] w-full rounded-lg border border-line object-contain" />
            </a>
            <a href={`/expenses/${e.id}/bill`} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-brand-600 underline">
              {t("openFull")}
            </a>
          </>
        ) : (
          <p className="text-sm text-muted">{t("noPhoto")}</p>
        )}
      </Card>
      {isOwner && (
        <ActionForm action={deleteExpenseAndBack.bind(null, e.id)} submitLabel={t("delete")} submitClassName="btn-danger btn-sm" confirm={t("deleteExpenseConfirm")} />
      )}
    </div>
  );
}
