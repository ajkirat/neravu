import Link from "next/link";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { addDays, parseDateInput, toDateInput, today } from "@/lib/dates";
import { categoryText, fmtDate, methodText, rupees } from "@/lib/format";
import { cashWithStaff } from "@/lib/cash";
import { getT } from "@/lib/i18n/server";
import { closeDay, reopenDay } from "@/app/actions/cashbook";
import { ActionForm } from "@/components/action-form";
import { ActionButton } from "@/components/today-actions";
import { Card, Field, PageHeader } from "@/components/ui";

export const metadata = { title: "Cash book" };

/** The day's money, the way owners keep it in a notebook: what came in, what went out, what is in hand. */
export default async function CashBookPage({ searchParams }: { searchParams: Promise<{ day?: string }> }) {
  const owner = await requireOwner();
  const { t, lang } = await getT();
  const asOf = today();
  const picked = parseDateInput((await searchParams).day ?? "");
  const day = picked && picked <= asOf ? picked : asOf;
  const next = addDays(day, 1);
  const [ins, outs, refunds, closed, cash, week] = await Promise.all([
    db.payment.findMany({
      where: { tenant: { ownerId: owner.id }, paidOn: { gte: day, lt: next }, amount: { gt: 0 } },
      include: { tenant: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    db.expense.findMany({ where: { ownerId: owner.id, spentOn: { gte: day, lt: next } }, orderBy: { createdAt: "asc" } }),
    db.payment.findMany({ where: { tenant: { ownerId: owner.id }, paidOn: { gte: day, lt: next }, amount: { lt: 0 } }, include: { tenant: { select: { name: true } } } }),
    db.dayClose.findUnique({ where: { ownerId_day: { ownerId: owner.id, day } } }),
    cashWithStaff(owner.id),
    db.dayClose.findMany({ where: { ownerId: owner.id, day: { gte: addDays(asOf, -6) } }, select: { day: true } }),
  ]);
  const byMethod = new Map<string, number>();
  for (const p of ins) byMethod.set(p.method, (byMethod.get(p.method) ?? 0) + p.amount);
  const totalIn = ins.reduce((n, p) => n + p.amount, 0);
  const totalOut = outs.reduce((n, e) => n + e.amount, 0) + refunds.reduce((n, p) => n - p.amount, 0);
  const cashIn = byMethod.get("CASH") ?? 0;
  const held = cash.reduce((n, c) => n + c.amount, 0);
  const closedDays = new Set(week.map((w) => toDateInput(w.day)));
  const iso = toDateInput(day);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t("cbTitle")} subtitle={t("cbSub")} />
      {/* The last 7 days: tap a day; a tick means it was closed. */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {Array.from({ length: 7 }, (_, i) => addDays(asOf, i - 6)).map((d) => {
          const k = toDateInput(d);
          const on = k === iso;
          return (
            <Link key={k} href={`/cashbook?day=${k}`} className={`min-w-16 rounded-xl px-3 py-2 text-center text-sm ${on ? "bg-brand-600 text-white" : "bg-white ring-1 ring-line"}`}>
              <span className="block font-semibold">{fmtDate(d, lang).split(" ").slice(0, 2).join(" ")}</span>
              <span className="block text-xs">{closedDays.has(k) ? "✓" : "·"}</span>
            </Link>
          );
        })}
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2">
        <div className="card p-3">
          <p className="text-sm text-muted">{t("cbIn")}</p>
          <p className="text-xl font-bold text-brand-700">{rupees(totalIn)}</p>
        </div>
        <div className="card p-3">
          <p className="text-sm text-muted">{t("cbOut")}</p>
          <p className="text-xl font-bold text-red-700">{rupees(totalOut)}</p>
        </div>
        <div className="card p-3">
          <p className="text-sm text-muted">{t("cbNet")}</p>
          <p className="text-xl font-bold">{rupees(totalIn - totalOut)}</p>
        </div>
      </div>

      <div className="space-y-4">
        <Card title={t("cbMoneyIn")}>
          {ins.length === 0 ? (
            <p className="text-sm text-muted">{t("cbNothingIn")}</p>
          ) : (
            <>
              <p className="mb-2 flex flex-wrap gap-3 text-sm">
                {[...byMethod].map(([m, v]) => (
                  <span key={m} className="rounded-full bg-brand-50 px-3 py-1 font-semibold text-brand-700">
                    {methodText(t, m)} {rupees(v)}
                  </span>
                ))}
              </p>
              <ul className="divide-y divide-line text-sm">
                {ins.map((p) => (
                  <li key={p.id} className="flex justify-between gap-3 py-2">
                    <span>
                      {p.tenant.name} · {methodText(t, p.method)}
                      {p.recordedByName && <span className="block text-xs text-muted">{t("recordedByName", { name: p.recordedByName })}</span>}
                    </span>
                    <span className="font-semibold">{rupees(p.amount)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>

        <Card title={t("cbMoneyOut")}>
          {outs.length + refunds.length === 0 ? (
            <p className="text-sm text-muted">{t("cbNothingOut")}</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {outs.map((e) => (
                <li key={e.id} className="flex justify-between gap-3 py-2">
                  <Link href={`/expenses/${e.id}`} className="hover:underline">
                    {categoryText(t, e.category)}
                    {e.vendor ? ` · ${e.vendor}` : ""}
                  </Link>
                  <span className="font-semibold">{rupees(e.amount)}</span>
                </li>
              ))}
              {refunds.map((p) => (
                <li key={p.id} className="flex justify-between gap-3 py-2">
                  <span>
                    {t("refundLabel")} · {p.tenant.name}
                  </span>
                  <span className="font-semibold">{rupees(-p.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {held > 0 && (
          <Card title={t("cashTitle")}>
            <ul className="text-sm">
              {cash.map((c) => (
                <li key={c.staffId} className="flex justify-between py-1">
                  <span>{c.name}</span>
                  <span className="font-semibold">{rupees(c.amount)}</span>
                </li>
              ))}
            </ul>
            <Link href="/staff" className="mt-2 inline-block text-sm text-brand-600 underline">
              {t("cbHandover")}
            </Link>
          </Card>
        )}

        <Card title={t("cbClose")}>
          {closed ? (
            <div className="space-y-2 text-sm">
              <p className="text-base font-semibold text-brand-700">✓ {t("cbClosedAt", { time: closed.closedAt.toLocaleTimeString(lang === "en" ? "en-IN" : `${lang}-IN`, { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }) })}</p>
              {closed.cashCounted !== null && (
                <p>
                  {t("cbCounted")}: <b>{rupees(closed.cashCounted)}</b> · {t("cbCashToday")}: <b>{rupees(cashIn)}</b>
                  {closed.cashCounted !== cashIn && <span className="ml-1 font-semibold text-red-700">({t("cbDiff", { amt: rupees(closed.cashCounted - cashIn) })})</span>}
                </p>
              )}
              {closed.note && <p className="text-muted">{closed.note}</p>}
              <ActionButton action={reopenDay.bind(null, iso)} label={t("cbReopen")} />
            </div>
          ) : (
            <ActionForm action={closeDay} submitLabel={t("cbCloseBtn")}>
              <input type="hidden" name="day" value={iso} />
              <p className="text-sm text-muted">{t("cbCloseHint", { amt: rupees(cashIn) })}</p>
              <Field label={t("cbCountedLabel")}>
                <input name="cashCounted" className="input sm:max-w-xs" inputMode="numeric" />
              </Field>
              <Field label={t("note")}>
                <input name="note" className="input" maxLength={300} />
              </Field>
            </ActionForm>
          )}
        </Card>
      </div>
    </div>
  );
}
