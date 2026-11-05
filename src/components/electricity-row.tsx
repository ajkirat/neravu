"use client";

import { useActionState, useState, useTransition, startTransition } from "react";
import { applyBill, deleteBill, saveBill, undoBill } from "@/app/actions/electricity";
import { rupees } from "@/lib/format";
import { useI18n } from "@/lib/i18n/client";
import { amountFromReadings, splitByDays, unitsUsed } from "@/lib/electricity";

type Bill = { id: string; prev: number | null; curr: number | null; rate: number | null; amount: number; applied: boolean };
type Person = { id: string; name: string; days: number };

const toNum = (s: string): number | null => {
  const v = Number(s.replace(/[,₹\s]/g, ""));
  return s.trim() !== "" && Number.isFinite(v) && v >= 0 ? v : null;
};
const show = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(n));

export function ElectricityRow({
  room,
  period,
  bill,
  suggest,
  people,
}: {
  room: { id: string; number: string };
  period: string;
  bill: Bill | null;
  suggest: { prev: number | null; rate: number | null };
  people: Person[];
}) {
  const { t } = useI18n();
  const locked = !!bill?.applied;
  const [prev, setPrev] = useState(show(bill?.prev ?? suggest.prev));
  const [curr, setCurr] = useState(show(bill?.curr));
  const [rate, setRate] = useState(show(bill?.rate ?? suggest.rate));
  // A total the owner typed over the readings must survive a reload: keep it whenever it differs from what the readings give.
  const [typed, setTyped] = useState(bill && amountFromReadings(bill.prev, bill.curr, bill.rate) !== bill.amount ? String(bill.amount) : "");
  const [state, dispatch, saving] = useActionState(saveBill.bind(null, room.id, period), undefined);
  const [busy, run] = useTransition();
  const [msg, setMsg] = useState<{ ok?: string; error?: string }>();

  const fromReadings = amountFromReadings(toNum(prev), toNum(curr), toNum(rate));
  const amount = typed.trim() !== "" ? Math.round(toNum(typed) ?? 0) : (fromReadings ?? bill?.amount ?? 0);
  const units = unitsUsed(toNum(prev), toNum(curr));
  const shares = splitByDays(amount, people);
  const totalDays = people.reduce((s, p) => s + p.days, 0);
  const field = "input !py-1.5";

  return (
    <div className="card p-4" data-room={room.number}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-brand-900">{t("roomN", { n: room.number })}</h3>
        {bill && (
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${locked ? "bg-brand-50 text-brand-700 ring-brand-100" : "bg-marigold-100 text-marigold-700 ring-marigold-400/40"}`}>
            {locked ? t("elecAppliedBadge") : t("elecDraftBadge")}
          </span>
        )}
      </div>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          fd.set("amount", amount > 0 ? String(amount) : "");
          startTransition(() => dispatch(fd));
        }}
      >
        <div className="grid grid-cols-3 gap-2">
          <label className="block">
            <span className="label">{t("elecPrev")}</span>
            <input name="prev" className={field} inputMode="decimal" disabled={locked} value={prev} onChange={(e) => setPrev(e.target.value)} />
          </label>
          <label className="block">
            <span className="label">{t("elecCurr")}</span>
            <input name="curr" className={field} inputMode="decimal" disabled={locked} value={curr} onChange={(e) => setCurr(e.target.value)} />
          </label>
          <label className="block">
            <span className="label">{t("elecRate")}</span>
            <input name="rate" className={field} inputMode="decimal" disabled={locked} value={rate} onChange={(e) => setRate(e.target.value)} />
          </label>
        </div>
        {units !== null && <p className="text-xs text-muted">{t("elecUnits", { n: units })}</p>}
        <label className="block max-w-48">
          <span className="label">{t("elecTotal")}</span>
          <input
            className={`${field} font-semibold`}
            inputMode="numeric"
            disabled={locked}
            aria-label={t("elecTotal")}
            value={typed.trim() !== "" ? typed : amount > 0 ? String(amount) : ""}
            onChange={(e) => setTyped(e.target.value.replace(/[^\d.]/g, ""))}
          />
        </label>

        {amount > 0 && (
          <div className="rounded-xl bg-canvas p-3">
            <p className="mb-1 text-xs font-semibold text-muted uppercase">{t("elecSplitTitle")}</p>
            {shares.length === 0 ? (
              <p className="text-sm text-red-700">{t("elecNobody")}</p>
            ) : (
              <ul className="space-y-0.5 text-sm" data-testid="split">
                {shares.map((s) => (
                  <li key={s.id} className="flex justify-between gap-3">
                    <span>
                      {people.find((p) => p.id === s.id)?.name} <span className="text-xs text-muted">· {t("elecDayShare", { days: s.days, total: totalDays })}</span>
                    </span>
                    <span className="font-semibold">{rupees(s.share)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {!locked && (
            <button type="submit" className="btn-secondary btn-sm" disabled={saving}>
              {saving ? t("saving") : t("elecSave")}
            </button>
          )}
          {bill && !locked && (
            <>
              <button
                type="button"
                className="btn-primary btn-sm"
                disabled={busy || shares.length === 0 || bill.amount !== amount}
                onClick={() => window.confirm(t("elecApplyConfirm", { n: shares.filter((s) => s.share > 0).length })) && run(async () => setMsg(await applyBill(bill.id)))}
              >
                {t("elecApply")}
              </button>
              <button type="button" className="btn-danger btn-sm" disabled={busy} onClick={() => run(async () => setMsg(await deleteBill(bill.id)))}>
                {t("elecDeleteBill")}
              </button>
            </>
          )}
          {bill && locked && (
            <button type="button" className="btn-secondary btn-sm" disabled={busy} onClick={() => window.confirm(t("elecUndoConfirm")) && run(async () => setMsg(await undoBill(bill.id)))}>
              {t("elecUndo")}
            </button>
          )}
        </div>
        {bill && !locked && bill.amount !== amount && amount > 0 && <p className="text-xs text-muted">↑ {t("elecSave")}</p>}
        {state?.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
        {state?.ok && !state.error && <p role="status" className="text-sm text-brand-700">{state.ok}</p>}
        {msg?.ok && <p role="status" className="text-sm text-brand-700">{msg.ok}</p>}
        {msg?.error && <p role="alert" className="text-sm text-red-700">{msg.error}</p>}
      </form>
    </div>
  );
}
