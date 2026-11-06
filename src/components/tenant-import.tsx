"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { importTenants } from "@/app/actions/import";
import { shrinkImage } from "@/lib/image";
import { emptyRow, parseImportCsv, type ImportRow } from "@/lib/tenant-import";
import { useT } from "@/lib/i18n/client";
import type { MsgKey } from "@/lib/i18n";

const COLS: { key: keyof ImportRow; label: MsgKey; mode?: "numeric" | "tel"; type?: string; wide?: boolean }[] = [
  { key: "name", label: "fullName", wide: true },
  { key: "phone", label: "mobile", mode: "tel", wide: true },
  { key: "room", label: "roomNo" },
  { key: "bed", label: "impColBed" },
  { key: "rent", label: "impColRent", mode: "numeric" },
  { key: "dueDay", label: "impColDue", mode: "numeric" },
  { key: "moveIn", label: "impColIn", type: "date" },
  { key: "deposit", label: "impColDep", mode: "numeric" },
  { key: "pending", label: "impColPending", mode: "numeric" },
];

export function TenantImport({ properties, scanOn }: { properties: { id: string; name: string }[]; scanOn: boolean }) {
  const t = useT();
  const router = useRouter();
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? "");
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [reading, setReading] = useState(false);
  const [saving, start] = useTransition();
  const photoRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const add = (more: ImportRow[]) => {
    setRows((rs) => [...rs, ...more].slice(0, 200));
    setRowErrors({});
    setMsg({ tone: "ok", text: t("impFound", { n: more.length }) });
  };

  const onPhoto = async (f?: File) => {
    if (!f) return;
    setReading(true);
    setMsg(null);
    try {
      const img = await shrinkImage(f, 2000, 0.85);
      const res = await fetch("/api/tenants/scan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: img.base64, mediaType: img.mediaType }) });
      const data = (await res.json().catch(() => ({}))) as { rows?: ImportRow[] };
      if (!res.ok || !data.rows?.length) setMsg({ tone: "err", text: res.status === 503 ? t("impPhotoOff") : t("impReadFail") });
      else add(data.rows);
    } catch {
      setMsg({ tone: "err", text: t("impReadFail") });
    } finally {
      setReading(false);
      if (photoRef.current) photoRef.current.value = "";
    }
  };

  const onFile = async (f?: File) => {
    if (!f) return;
    const { rows: got, missing } = parseImportCsv(await f.text());
    if (fileRef.current) fileRef.current.value = "";
    if (missing.length) return setMsg({ tone: "err", text: t("impMissingCols", { cols: missing.join(", ") }) });
    add(got);
  };

  const set = (i: number, k: keyof ImportRow, v: string) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [k]: v } : r)));

  const save = () =>
    start(async () => {
      const res = await importTenants(propertyId, JSON.stringify(rows));
      if (res.created) {
        router.push("/tenants");
        return;
      }
      setRowErrors(res.rowErrors ?? {});
      setMsg({ tone: "err", text: res.error ?? "?" });
    });

  return (
    <div className="space-y-4">
      <div className="card space-y-4 p-4 sm:p-5">
        {properties.length > 1 && (
          <label className="block">
            <span className="label">{t("impProperty")}</span>
            <select className="input sm:max-w-sm" value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <input ref={photoRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} />
            <button type="button" className="btn-primary w-full" disabled={!scanOn || reading} onClick={() => photoRef.current?.click()}>
              {reading ? t("impReading") : t("impPhoto")}
            </button>
            {!scanOn && <p className="mt-1 text-xs text-muted">{t("impPhotoOff")}</p>}
          </div>
          <div>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
            <button type="button" className="btn-secondary w-full" onClick={() => fileRef.current?.click()}>
              {t("impFile")}
            </button>
            <p className="mt-1 text-xs text-muted">{t("impFileHint")}</p>
          </div>
        </div>
        {msg && (
          <p role={msg.tone === "err" ? "alert" : "status"} className={`rounded-lg px-3 py-2 text-sm ${msg.tone === "err" ? "bg-red-50 text-red-700" : "bg-brand-50 text-brand-700"}`}>
            {msg.text}
          </p>
        )}
      </div>

      {rows.length > 0 && (
        <>
          <p className="text-sm text-muted">
            {t("impReview")} {t("impPendingHint")}
          </p>
          <ol className="space-y-2">
            {rows.map((r, i) => (
              <li key={i} className={`card p-3 ${rowErrors[i] ? "border-red-300 bg-red-50/40" : ""}`} data-row={i}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-brand-900">#{i + 1}</span>
                  <button type="button" className="min-h-9 px-2 text-sm text-muted hover:text-red-700" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}>
                    ✕ {t("impRemove")}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-11">
                  {COLS.map((c) => (
                    <label key={c.key} className={c.wide ? "col-span-2" : ""}>
                      <span className="block text-xs text-muted">{t(c.label)}</span>
                      <input className="input" name={`${c.key}-${i}`} type={c.type ?? "text"} inputMode={c.mode} value={r[c.key]} onChange={(e) => set(i, c.key, e.target.value)} />
                    </label>
                  ))}
                </div>
                {rowErrors[i] && <p className="mt-2 text-sm font-medium text-red-700">{rowErrors[i]}</p>}
              </li>
            ))}
          </ol>
        </>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn-secondary" onClick={() => setRows((rs) => [...rs, emptyRow()])}>
          {t("impAddRow")}
        </button>
        {rows.length > 0 && (
          <button type="button" className="btn-primary" disabled={saving || !propertyId} onClick={save}>
            {saving ? t("saving") : t("impSave", { n: rows.length })}
          </button>
        )}
      </div>
    </div>
  );
}
