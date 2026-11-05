"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createExpense } from "@/app/actions/expenses";
import { VoiceInput } from "@/components/voice-input";
import { Field } from "@/components/ui";
import { useI18n } from "@/lib/i18n/client";
import { shrinkImage } from "@/lib/image";
import { rupees } from "@/lib/format";
import { totalsMismatch } from "@/lib/receipt";


type Row = { name: string; qty: string; amount: string };
type Scan = { isReceipt: boolean; vendor: string | null; date: string | null; category: string; items: { name: string; quantity: number; amount: number }[]; total: number | null };

const emptyRow = (): Row => ({ name: "", qty: "1", amount: "" });
const num = (s: string) => {
  const n = Number(s.replace(/[,₹\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

export function ExpenseForm({
  properties,
  categories,
  defaultDate,
  scanEnabled,
}: {
  properties: { id: string; name: string }[];
  categories: { value: string; label: string }[];
  defaultDate: string;
  scanEnabled: boolean;
}) {
  const { t } = useI18n();
  const [state, dispatch, pending] = useActionState(createExpense, undefined);
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [category, setCategory] = useState("Groceries");
  const [vendor, setVendor] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [billTotal, setBillTotal] = useState<number | null>(null);
  const [scanned, setScanned] = useState(false);
  const [scan, setScan] = useState<{ busy: boolean; msg?: string; error?: string }>({ busy: false });
  const [key, setKey] = useState(0); // remount uncontrolled fields after a successful save

  // Clear everything once an expense has been saved.
  useEffect(() => {
    if (state?.ok) {
      setRows([]);
      setVendor("");
      setBillTotal(null);
      setScanned(false);
      setScan({ busy: false });
      setKey((k) => k + 1);
    }
  }, [state]);

  const parsedItems = rows.map((r) => ({ name: r.name.trim(), quantity: num(r.qty) || 1, amount: Math.round(num(r.amount)) }));
  const total = parsedItems.reduce((s, i) => s + i.amount, 0);
  const mismatch = totalsMismatch(parsedItems, billTotal);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setScan({ busy: true });
    try {
      const img = await shrinkImage(file).catch(() => null);
      if (!img) return setScan({ busy: false, error: t("scanBadImage") });
      const res = await fetch("/api/expenses/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: img.base64, mediaType: img.mediaType }),
      });
      if (res.status === 429) return setScan({ busy: false, error: t("scanRate") });
      if (res.status === 503) return setScan({ busy: false, error: t("scanOff") });
      if (!res.ok) return setScan({ busy: false, error: t("scanFailed") });
      const data = (await res.json()) as Scan;
      if (!data.isReceipt) return setScan({ busy: false, error: t("scanNotBill") });
      setRows(data.items.map((i) => ({ name: i.name, qty: String(i.quantity), amount: String(i.amount) })));
      if (data.vendor) setVendor(data.vendor);
      if (data.date) setDate(data.date);
      setCategory(data.category);
      setBillTotal(data.total);
      setScanned(true);
      setScan({ busy: false, msg: t("scanDone") });
    } catch {
      setScan({ busy: false, error: t("scanFailed") });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const setRow = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, k) => (k === i ? { ...r, ...patch } : r)));

  return (
    <form action={dispatch} className="space-y-4" key={key}>
      <div className="rounded-xl border border-dashed border-brand-200 bg-brand-50/50 p-3">
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        <button type="button" className="btn-primary w-full" disabled={!scanEnabled || scan.busy} onClick={() => fileRef.current?.click()}>
          📷 {scan.busy ? t("scanning") : scanned ? t("scanAgain") : t("scanBill")}
        </button>
        <p className="mt-2 text-xs text-muted">{scanEnabled ? t("scanHint") : t("scanOff")}</p>
        {scan.msg && <p role="status" className="mt-2 text-sm font-medium text-brand-700">{scan.msg}</p>}
        {scan.error && <p role="alert" className="mt-2 text-sm text-red-700">{scan.error}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label={t("date")}>
          <input className="input" type="date" name="spentOn" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label={t("categoryLabel")}>
          <select className="input" name="category" value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label={t("vendorLabel")}>
        <input className="input" name="vendor" value={vendor} maxLength={120} onChange={(e) => setVendor(e.target.value)} />
      </Field>

      {rows.length === 0 ? (
        <>
          <Field label={t("amount")}>
            <input className="input" name="amount" inputMode="numeric" required />
          </Field>
          <button type="button" className="text-sm font-medium text-brand-600 hover:underline" onClick={() => setRows([emptyRow()])}>
            {t("addItemsToggle")}
          </button>
        </>
      ) : (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-brand-900">{t("itemsTitle")}</p>
          <div className="space-y-2">
            {rows.map((r, i) => (
              <div key={i} className="grid grid-cols-[1fr_4rem_5.5rem_auto] items-center gap-2">
                <input className="input" aria-label={t("itemName")} placeholder={t("itemName")} value={r.name} maxLength={120} onChange={(e) => setRow(i, { name: e.target.value })} />
                <input className="input" aria-label={t("itemQty")} placeholder={t("itemQty")} inputMode="decimal" value={r.qty} onChange={(e) => setRow(i, { qty: e.target.value })} />
                <input className="input" aria-label={t("itemAmount")} placeholder="₹" inputMode="numeric" value={r.amount} onChange={(e) => setRow(i, { amount: e.target.value })} />
                <button type="button" className="px-1 text-lg text-muted hover:text-red-700" aria-label={t("removeRow")} onClick={() => setRows((rs) => rs.filter((_, k) => k !== i))}>
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="text-sm font-medium text-brand-600 hover:underline" onClick={() => setRows((rs) => [...rs, emptyRow()])}>
            {t("addItem")}
          </button>
          <div className="flex items-center justify-between rounded-lg bg-canvas px-3 py-2">
            <span className="text-sm text-muted">{t("totalAuto")}</span>
            <span className="text-lg font-bold text-brand-900" data-testid="items-total">{rupees(total)}</span>
          </div>
          {mismatch && billTotal !== null && (
            <p role="alert" className="rounded-lg bg-marigold-100 px-3 py-2 text-sm text-marigold-700">
              {t("billMismatch", { bill: rupees(billTotal), sum: rupees(total) })}
            </p>
          )}
          <input type="hidden" name="items" value={JSON.stringify(parsedItems.filter((i) => i.name || i.amount))} />
          {billTotal !== null && <input type="hidden" name="billTotal" value={billTotal} />}
          {scanned && <input type="hidden" name="source" value="SCAN" />}
        </div>
      )}

      <Field label={t("propertyLabel")}>
        <select className="input" name="propertyId" defaultValue={properties.length === 1 ? properties[0].id : ""}>
          <option value="">{t("allGeneral")}</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("note")}>
        <VoiceInput name="note" maxLength={500} placeholder={t("notePh")} />
      </Field>

      {state?.error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      {state?.ok && !state.error && <p role="status" className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">{state.ok}</p>}
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? t("saving") : t("addExpenseBtn")}
      </button>
    </form>
  );
}

