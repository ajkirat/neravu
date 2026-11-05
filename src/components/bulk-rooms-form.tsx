"use client";

import { useActionState, useEffect, useMemo, useState, startTransition } from "react";
import { createRoomsBulk } from "@/app/actions/properties";
import { useI18n } from "@/lib/i18n/client";
import type { MsgKey } from "@/lib/i18n";
import {
  MAX_BULK,
  PRESETS,
  defaultPattern,
  generatePattern,
  parseRoomList,
  toDrafts,
  validateDrafts,
  type DraftIssue,
  type PatternOpts,
  type RoomDraft,
} from "@/lib/room-gen";

const PRESET_KEYS = ["floor100", "ground", "simple", "prefixed", "floorLetter"] as const;
const digitsOnly = (s: string) => Number(s.replace(/\D/g, "") || 0);

/** Parse "10" -> same on every floor, or "10, 10, 8" -> per floor. */
function perFloorFrom(text: string, floors: number): number[] {
  const parts = text.split(/[,\s]+/).filter(Boolean).map((p) => Math.max(0, Math.min(MAX_BULK, digitsOnly(p))));
  if (parts.length > 1) return parts;
  return Array.from({ length: Math.max(1, floors) }, () => parts[0] ?? 0);
}

export function BulkRoomsForm({ propertyId, existing }: { propertyId: string; existing: string[] }) {
  const { t } = useI18n();
  const [state, dispatch, pending] = useActionState(createRoomsBulk.bind(null, propertyId), undefined);
  const [mode, setMode] = useState<"pattern" | "list">("pattern");
  const [beds, setBeds] = useState(2);
  const [rent, setRent] = useState("");
  const [opts, setOpts] = useState<PatternOpts>(defaultPattern);
  const [floors, setFloors] = useState(3);
  const [perFloorText, setPerFloorText] = useState("10");
  const [list, setList] = useState("");
  const [drafts, setDrafts] = useState<RoomDraft[]>([]);
  const [problems, setProblems] = useState<string[]>([]);
  const [key, setKey] = useState(0);

  const rentNum = digitsOnly(rent);
  const patternOpts = useMemo<PatternOpts>(() => ({ ...opts, perFloor: perFloorFrom(perFloorText, floors) }), [opts, perFloorText, floors]);

  // Rebuild the preview whenever the way of describing the rooms changes.
  useEffect(() => {
    if (mode === "pattern") {
      setDrafts(generatePattern(patternOpts).map((r) => ({ number: r.number, floor: r.floor, sharing: beds, rent: rentNum })));
      setProblems([]);
    } else {
      const parsed = parseRoomList(list);
      setDrafts(toDrafts(parsed.rows, { sharing: beds, rent: rentNum }));
      setProblems(parsed.problems);
    }
  }, [mode, patternOpts, list, beds, rentNum]);

  useEffect(() => {
    if (state?.ok) {
      setDrafts([]);
      setList("");
      setKey((k) => k + 1);
    }
  }, [state]);

  const { rows, ok } = useMemo(() => validateDrafts(drafts, existing), [drafts, existing]);
  const totalBeds = rows.reduce((s, r) => s + (Number.isInteger(r.sharing) ? r.sharing : 0), 0);
  const setRow = (i: number, patch: Partial<RoomDraft>) => setDrafts((d) => d.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  const set = (patch: Partial<PatternOpts>) => setOpts((o) => ({ ...o, ...patch }));

  const field = "input";
  return (
    <form
      key={key}
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData();
        fd.set("rows", JSON.stringify(rows.map(({ issues: _i, ...r }) => r)));
        startTransition(() => dispatch(fd));
      }}
    >
      <p className="text-sm text-muted">{t("bulkSub")}</p>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="label">{t("bulkDefaultBeds")}</span>
          <select className={field} value={beds} onChange={(e) => setBeds(Number(e.target.value))}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">{t("bulkDefaultRent")}</span>
          <input data-testid="bulk-rent" className={field} inputMode="numeric" value={rent} onChange={(e) => setRent(e.target.value.replace(/\D/g, ""))} placeholder="8000" />
        </label>
      </div>

      <div className="inline-flex rounded-xl bg-white p-1 ring-1 ring-line" role="tablist">
        {(["pattern", "list"] as const).map((m) => (
          <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${mode === m ? "bg-brand-600 text-white" : "text-muted"}`}>
            {t(m === "pattern" ? "bulkModePattern" : "bulkModeList")}
          </button>
        ))}
      </div>

      {mode === "pattern" ? (
        <div className="space-y-3">
          <div>
            <p className="label">{t("bulkPresetTitle")}</p>
            <div className="flex flex-wrap gap-2">
              {PRESET_KEYS.map((k) => (
                <button key={k} type="button" className="btn-secondary btn-sm" onClick={() => set({ ...PRESETS[k] })}>
                  {t(`bulkP_${k}` as MsgKey)}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="label">{t("bulkFloors")}</span>
              <input className={field} inputMode="numeric" value={floors} onChange={(e) => setFloors(Math.min(60, digitsOnly(e.target.value)))} />
            </label>
            <label className="block">
              <span className="label">{t("bulkPerFloor")}</span>
              <input className={field} value={perFloorText} onChange={(e) => setPerFloorText(e.target.value)} />
            </label>
          </div>
          <p className="-mt-2 text-xs text-muted">{t("bulkPerFloorHint")}</p>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4" checked={opts.firstFloor === 0} onChange={(e) => set({ firstFloor: e.target.checked ? 0 : 1 })} />
            {t("bulkGround")}
          </label>
          {opts.firstFloor === 0 && (
            <label className="block max-w-40">
              <span className="label">{t("bulkGroundLabel")}</span>
              <input className={field} value={opts.groundLabel} maxLength={4} onChange={(e) => set({ groundLabel: e.target.value })} />
            </label>
          )}
          <details className="rounded-xl bg-canvas p-3">
            <summary className="cursor-pointer text-sm font-medium text-brand-700">{t("bulkMore")}</summary>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="block">
                <span className="label">{t("bulkPrefix")}</span>
                <input className={field} value={opts.prefix} maxLength={8} onChange={(e) => set({ prefix: e.target.value })} />
              </label>
              <label className="block">
                <span className="label">{t("bulkSuffix")}</span>
                <input className={field} value={opts.suffix} maxLength={8} onChange={(e) => set({ suffix: e.target.value })} />
              </label>
              <label className="block">
                <span className="label">{t("bulkFloorPart")}</span>
                <select className={field} value={opts.floorPart} onChange={(e) => set({ floorPart: e.target.value as PatternOpts["floorPart"] })}>
                  <option value="digit">{t("bulkFloorDigit")}</option>
                  <option value="letter">{t("bulkFloorLetter")}</option>
                  <option value="none">{t("bulkFloorNone")}</option>
                </select>
              </label>
              <label className="block">
                <span className="label">{t("bulkSeparator")}</span>
                <input className={field} value={opts.separator} maxLength={3} onChange={(e) => set({ separator: e.target.value })} />
              </label>
              <label className="block">
                <span className="label">{t("bulkDigits")}</span>
                <select className={field} value={opts.digits} onChange={(e) => set({ digits: Number(e.target.value) })}>
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="label">{t("bulkStartAt")}</span>
                <input className={field} inputMode="numeric" value={opts.start} onChange={(e) => set({ start: digitsOnly(e.target.value) })} />
              </label>
              <label className="col-span-2 flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4" checked={opts.continuous} onChange={(e) => set({ continuous: e.target.checked })} />
                {t("bulkContinuous")}
              </label>
              <label className="col-span-2 flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4" checked={opts.roomLetters} onChange={(e) => set({ roomLetters: e.target.checked })} />
                {t("bulkRoomLetters")}
              </label>
            </div>
          </details>
        </div>
      ) : (
        <div>
          <label className="block">
            <span className="label">{t("bulkListLabel")}</span>
            <textarea className="input font-mono" rows={5} value={list} onChange={(e) => setList(e.target.value)} placeholder={"101-110, 201-210, G1, G2"} />
          </label>
          <p className="mt-1 text-xs text-muted">{t("bulkListHint")}</p>
          {problems.length > 0 && <p role="alert" className="mt-1 text-xs text-red-700">{t("bulkListProblems", { items: problems.slice(0, 5).join(", ") })}</p>}
        </div>
      )}

      {rows.length === 0 ? (
        <p className="rounded-lg bg-canvas px-3 py-4 text-center text-sm text-muted">{t("bulkEmpty")}</p>
      ) : (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-brand-900" data-testid="bulk-count">{t("bulkCount", { rooms: rows.length, beds: totalBeds })}</p>
          <div className="max-h-80 overflow-y-auto rounded-xl border border-line">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-canvas text-left text-xs text-muted">
                <tr>
                  <th className="px-2 py-1.5">{t("bulkColRoom")}</th>
                  <th className="px-2 py-1.5">{t("bulkColFloor")}</th>
                  <th className="px-2 py-1.5">{t("bulkColBeds")}</th>
                  <th className="px-2 py-1.5">{t("bulkColRent")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const bad = r.issues.length > 0;
                  return (
                    <tr key={i} className={bad ? "bg-red-50" : ""} data-bad={bad ? "1" : undefined}>
                      <td className="px-2 py-1 align-top">
                        <input className={`input !py-1 ${bad ? "!border-red-400" : ""}`} aria-label={t("bulkColRoom")} value={r.number} maxLength={30} onChange={(e) => setRow(i, { number: e.target.value })} />
                        {r.issues.map((x: DraftIssue) => (
                          <span key={x} className="block text-xs text-red-700">{t(`bulkIssue_${x}` as MsgKey)}</span>
                        ))}
                      </td>
                      <td className="px-2 py-1 align-top">
                        <input className="input !w-16 !py-1" aria-label={t("bulkColFloor")} value={r.floor ?? ""} maxLength={6} onChange={(e) => setRow(i, { floor: e.target.value || null })} />
                      </td>
                      <td className="px-2 py-1 align-top">
                        <select className="input !w-16 !py-1" aria-label={t("bulkColBeds")} value={r.sharing} onChange={(e) => setRow(i, { sharing: Number(e.target.value) })}>
                          {Array.from({ length: 12 }, (_, n) => n + 1).map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-1 align-top">
                        <input className="input !w-24 !py-1" inputMode="numeric" aria-label={t("bulkColRent")} value={r.rent} onChange={(e) => setRow(i, { rent: digitsOnly(e.target.value) })} />
                      </td>
                      <td className="px-1 py-1 align-top">
                        <button type="button" className="px-2 text-lg text-muted hover:text-red-700" aria-label="remove" onClick={() => setDrafts((d) => d.filter((_, k) => k !== i))}>
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {rows.length > MAX_BULK && <p role="alert" className="text-sm text-red-700">{t("bulkTooMany")}</p>}
      {state?.error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      {state?.ok && !state.error && <p role="status" className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">{state.ok}</p>}
      {!ok && rows.length > 0 && <p className="text-sm text-red-700">{t("bulkFix")}</p>}
      <button type="submit" className="btn-primary w-full" disabled={pending || !ok}>
        {pending ? t("saving") : t("bulkAddBtn", { n: rows.length })}
      </button>
    </form>
  );
}
