"use client";

import { useActionState, useEffect, useRef, useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import { createExpense } from "@/app/actions/expenses";
import { VoiceInput } from "@/components/voice-input";
import { Field } from "@/components/ui";
import { CategoryPicker } from "@/components/category-picker";
import { useI18n } from "@/lib/i18n/client";
import { shrinkImage } from "@/lib/image";
import { fmtDate, rupees } from "@/lib/format";
import type { DupInfo, ExpenseState } from "@/app/actions/expenses";
import { totalsMismatch } from "@/lib/receipt";


type Row = { name: string; qty: string; amount: string };
type Scan = { isReceipt: boolean; vendor: string | null; date: string | null; category: string; items: { name: string; quantity: number; amount: number }[]; total: number | null };
type ScanResponse = { scanned: boolean; receipt?: Scan; duplicate?: DupInfo | null };

const emptyRow = (): Row => ({ name: "", qty: "1", amount: "" });
const num = (s: string) => {
  const n = Number(s.replace(/[,₹\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

export function ExpenseForm({
  properties,
  groups,
  defaultDate,
  scanEnabled,
  currentMonth,
}: {
  properties: { id: string; name: string }[];
  groups: { label: string; options: { value: string; label: string }[] }[];
  defaultDate: string;
  scanEnabled: boolean;
  /** The month the list below is showing (YYYY-MM). */
  currentMonth: string;
}) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const [state, dispatch, pending] = useActionState<ExpenseState, FormData>(createExpense, undefined);
  const fileRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [photo, setPhoto] = useState<{ base64: string; mediaType: string } | null>(null);
  const [dup, setDup] = useState<DupInfo | null>(null);
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
      // A bill dated in another month is saved there: show that month so the new expense is visible.
      const savedMonth = date.slice(0, 7);
      if (/^\d{4}-\d{2}$/.test(savedMonth) && savedMonth !== currentMonth) router.push(`/expenses?month=${savedMonth}`);
      setRows([]);
      setVendor("");
      setBillTotal(null);
      setScanned(false);
      setScan({ busy: false });
      setPhoto(null);
      setDup(null);
      setKey((k) => k + 1);
    }
    if (state?.duplicate) setDup(state.duplicate);
  }, [state]);

  const parsedItems = rows.map((r) => ({ name: r.name.trim(), quantity: num(r.qty) || 1, amount: Math.round(num(r.amount)) }));
  const total = parsedItems.reduce((s, i) => s + i.amount, 0);
  const mismatch = totalsMismatch(parsedItems, billTotal);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setScan({ busy: true });
    setDup(null);
    try {
      const img = await shrinkImage(file).catch(() => null);
      if (!img) return setScan({ busy: false, error: t("scanBadImage") });
      // The photo is kept with the expense, whether or not it can be read.
      setPhoto({ base64: img.base64, mediaType: img.mediaType });
      const res = await fetch("/api/expenses/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: img.base64, mediaType: img.mediaType }),
      });
      if (res.status === 429) return setScan({ busy: false, error: t("scanRate") });
      if (!res.ok) return setScan({ busy: false, error: t("scanFailed") });
      const data = (await res.json()) as ScanResponse;
      if (data.duplicate) setDup(data.duplicate);
      if (!data.scanned) return setScan({ busy: false, msg: t("photoAttached") });
      const r = data.receipt;
      if (!r || !r.isReceipt) return setScan({ busy: false, error: t("scanNotBill") });
      setRows(r.items.map((i) => ({ name: i.name, qty: String(i.quantity), amount: String(i.amount) })));
      if (r.vendor) setVendor(r.vendor);
      if (r.date) setDate(r.date);
      setCategory(r.category);
      setBillTotal(r.total);
      setScanned(true);
      setScan({ busy: false, msg: t("scanDone") });
    } catch {
      setScan({ busy: false, error: t("scanFailed") });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
      if (galleryRef.current) galleryRef.current.value = "";
    }
  };

  const dupText = (d: DupInfo) =>
    t("dupWarn", { date: fmtDate(new Date(`${d.date}T00:00:00Z`), lang), amt: rupees(d.amount), vendor: d.vendor ? ` · ${d.vendor}` : "" }) + " " + t(`dup_${d.reason}`);

  const setRow = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, k) => (k === i ? { ...r, ...patch } : r)));

  return (
    <form
      key={key}
      ref={formRef}
      className="grid grid-cols-2 items-start gap-x-3 gap-y-3 lg:grid-cols-4 lg:gap-x-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => dispatch(fd));
      }}
    >
      <div className="col-span-full rounded-xl border border-dashed border-brand-200 bg-brand-50/50 p-3">
        {/* Camera on phones; the second button picks a photo you already have (e.g. received on WhatsApp). */}
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-primary" disabled={scan.busy} onClick={() => fileRef.current?.click()}>
            📷 {scan.busy ? t("scanning") : t("takePhoto")}
          </button>
          <button type="button" className="btn-secondary" disabled={scan.busy} onClick={() => galleryRef.current?.click()}>
            🖼️ {t("choosePhoto")}
          </button>
        </div>
        <p className="mt-2 text-xs text-muted">{scanEnabled ? t("scanHint") : t("photoOnlyHint")}</p>
        {photo && (
          <div className="mt-2 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`data:${photo.mediaType};base64,${photo.base64}`} alt={t("billPhoto")} className="h-16 w-16 rounded-lg border border-line object-cover" />
            <button type="button" className="text-sm text-muted underline" onClick={() => { setPhoto(null); setDup(null); }}>
              {t("removePhoto")}
            </button>
          </div>
        )}
        {scan.msg && <p role="status" className="mt-2 text-sm font-medium text-brand-700">{scan.msg}</p>}
        {scan.error && <p role="alert" className="mt-2 text-sm text-red-700">{scan.error}</p>}
        {dup && (
          <div role="alert" className="mt-2 rounded-lg bg-marigold-100 px-3 py-2 text-sm text-marigold-700">
            ⚠️ {dupText(dup)}
            <a href={`/expenses/${dup.expenseId}`} target="_blank" rel="noreferrer" className="ml-1 font-semibold underline">
              {t("dupSee")}
            </a>
          </div>
        )}
        {photo && <input type="hidden" name="photo" value={photo.base64} />}
        {photo && <input type="hidden" name="photoMime" value={photo.mediaType} />}
        <input type="hidden" name="confirmDuplicate" value="" />
      </div>

      <div className="contents">
        <Field label={t("date")}>
          <input className="input" type="date" name="spentOn" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        {/* Not a <label>: a click inside the open list would otherwise also toggle it. */}
        <div>
          <span className="label">{t("categoryLabel")}</span>
          <CategoryPicker name="category" groups={groups} value={category} onChange={setCategory} />
        </div>
      </div>
      <Field label={t("vendorLabel")} className="col-span-2 lg:col-span-1">
        <input className="input" name="vendor" value={vendor} maxLength={120} onChange={(e) => setVendor(e.target.value)} />
      </Field>

      {rows.length === 0 ? (
        <>
          <Field label={t("amount")} className="col-span-2 lg:col-span-1">
            <input className="input" name="amount" inputMode="numeric" required />
          </Field>
          <button type="button" className="col-span-full justify-self-start text-sm font-medium text-brand-600 hover:underline" onClick={() => setRows([emptyRow()])}>
            {t("addItemsToggle")}
          </button>
        </>
      ) : (
        <div className="col-span-full space-y-2">
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

      <Field label={t("propertyLabel")} className="col-span-2">
        <select className="input" name="propertyId" defaultValue={properties.length === 1 ? properties[0].id : ""}>
          <option value="">{t("allGeneral")}</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("note")} className="col-span-2">
        <VoiceInput name="note" maxLength={500} placeholder={t("notePh")} />
      </Field>

      {state?.error && !state.duplicate && <p role="alert" className="col-span-full rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      {state?.ok && !state.error && <p role="status" className="col-span-full rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">{state.ok}</p>}
      {state?.duplicate && (
        <div className="col-span-full flex flex-wrap items-center gap-3 rounded-lg bg-marigold-100 px-3 py-2 text-sm text-marigold-700">
          <span>⚠️ {dupText(state.duplicate)}</span>
          <button
            type="button"
            className="btn-secondary btn-sm"
            disabled={pending}
            onClick={() => {
              const f = formRef.current;
              if (!f) return;
              (f.elements.namedItem("confirmDuplicate") as HTMLInputElement).value = "1";
              f.requestSubmit();
            }}
          >
            {t("dupSaveAnyway")}
          </button>
        </div>
      )}
      <button type="submit" className="btn-primary col-span-full w-full justify-self-start sm:w-auto" disabled={pending}>
        {pending ? t("saving") : t("addExpenseBtn")}
      </button>
    </form>
  );
}

