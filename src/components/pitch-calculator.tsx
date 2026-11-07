"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { savePitch } from "@/app/actions/pitch";
import { VoiceInput } from "@/components/voice-input";
import { rupees } from "@/lib/format";
import { useI18n } from "@/lib/i18n/client";
import type { MsgKey } from "@/lib/i18n";
import { INTEREST, PAINS, PITCH_DEFAULTS, cleanPitchInputs, computePitch, type PitchInputs } from "@/lib/pitch";

const GROUPS: { title: MsgKey; keys: (keyof PitchInputs)[] }[] = [
  { title: "pitchSecPg", keys: ["beds", "rent", "occupancy", "leavers"] },
  { title: "pitchSecWork", keys: ["chaseHours", "bills", "minsPerBill", "rooms", "minsPerRoom", "hourValue"] },
  { title: "pitchSecMoney", keys: ["unpaidPct", "elecLost", "cashPct", "leakPct", "emptyDays"] },
];

/** Savings calculator + pain points, filled in together with a prospective PG owner. */
export function PitchCalculator() {
  const { t } = useI18n();
  const formRef = useRef<HTMLFormElement>(null);
  const [vals, setVals] = useState<Record<keyof PitchInputs, string>>(
    () => Object.fromEntries(Object.entries(PITCH_DEFAULTS).map(([k, v]) => [k, String(v)])) as Record<keyof PitchInputs, string>,
  );
  const result = useMemo(() => computePitch(cleanPitchInputs(vals)), [vals]);
  const [saved, setSaved] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [pending, start] = useTransition();

  const save = () =>
    start(async () => {
      setErr(null);
      const r = await savePitch(new FormData(formRef.current!));
      if (r.error) setErr(r.error);
      else if (r.id) setSaved(r.id);
    });

  const pdfUrl = saved ? `/settings/pitch/${saved}/pdf` : "";
  // On a phone, share the PDF file straight to WhatsApp; elsewhere, download it.
  const share = async () => {
    if (!saved) return;
    setSharing(true);
    try {
      const blob = await (await fetch(pdfUrl)).blob();
      const file = new File([blob], "Neravu-savings.pdf", { type: "application/pdf" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Neravu" });
      } else {
        window.location.href = `${pdfUrl}?download=1`;
      }
    } catch {
      /* the person closed the share sheet */
    } finally {
      setSharing(false);
    }
  };

  const newPitch = () => {
    formRef.current?.reset();
    setVals(Object.fromEntries(Object.entries(PITCH_DEFAULTS).map(([k, v]) => [k, String(v)])) as Record<keyof PitchInputs, string>);
    setSaved(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <form ref={formRef} onSubmit={(e) => (e.preventDefault(), save())} className="space-y-6" data-testid="pitch-form">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        {/* Their numbers */}
        <div className="space-y-5">
          {GROUPS.map((g) => (
            <fieldset key={g.title} className="card p-4 sm:p-5">
              <legend className="px-1 text-sm font-semibold tracking-wide text-muted uppercase">{t(g.title)}</legend>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {g.keys.map((k) => (
                  <label key={k} className="block min-w-0">
                    <span className="label">{t(`in_${k}` as MsgKey)}</span>
                    <input
                      className="input tabular-nums"
                      name={`in_${k}`}
                      inputMode="decimal"
                      value={vals[k]}
                      onChange={(e) => setVals((v) => ({ ...v, [k]: e.target.value }))}
                      data-testid={`in-${k}`}
                    />
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>

        {/* Result: stays in view on a computer */}
        <section className="card overflow-hidden lg:sticky lg:top-4" aria-live="polite" data-testid="pitch-result">
          <div className="bg-brand-700 p-5 text-white">
            <p className="text-xs font-semibold tracking-wide text-brand-200 uppercase">{t("pitchResTitle")}</p>
            <p className="mt-1 text-sm text-brand-100">{t("pitchPerMonth")}</p>
            <p className="text-4xl font-bold tabular-nums" data-testid="per-month">{rupees(result.perMonth)}</p>
            <p className="mt-1 text-sm text-brand-100">
              {t("pitchPerYear")}: <b className="text-lg text-white tabular-nums" data-testid="per-year">{rupees(result.perYear)}</b>
            </p>
          </div>
          <div className="grid grid-cols-3 divide-x divide-line border-b border-line text-center">
            <div className="p-3">
              <p className="text-xs text-muted">{t("pitchHoursLabel")}</p>
              <p className="text-lg font-bold text-brand-900 tabular-nums">{t("pitchHours", { n: result.hours })}</p>
            </div>
            <div className="p-3">
              <p className="text-xs text-muted">{t("pitchTimeValue")}</p>
              <p className="text-lg font-bold text-brand-900 tabular-nums">{rupees(result.timeValue)}</p>
            </div>
            <div className="p-3">
              <p className="text-xs text-muted">{t("pitchMoneyLabel")}</p>
              <p className="text-lg font-bold text-brand-900 tabular-nums">{rupees(result.money)}</p>
            </div>
          </div>
          <details className="group p-4" open>
            <summary className="cursor-pointer text-sm font-semibold text-brand-700">{t("pitchHow")}</summary>
            <ul className="mt-2 divide-y divide-line text-sm">
              {result.lines.map((l) => (
                <li key={l.key} className="flex items-start justify-between gap-3 py-2">
                  <span className="min-w-0">
                    <span className="block font-medium text-brand-900">{t(`line_${l.key}` as MsgKey)}</span>
                    <span className="block text-xs text-muted">{t(`how_${l.key}` as MsgKey)}</span>
                  </span>
                  <span className="shrink-0 text-right font-semibold whitespace-nowrap tabular-nums">
                    {l.hours ? t("pitchHours", { n: l.hours }) : rupees(l.rupees)}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        </section>
      </div>

      {/* Their problems */}
      <section className="card p-4 sm:p-5">
        <h2 className="text-lg font-bold text-brand-900">{t("pitchPainsTitle")}</h2>
        <p className="mb-3 text-sm text-muted">{t("pitchPainsHint")}</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {PAINS.map((p) => (
            <label key={p} className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50">
              <input type="checkbox" name="pain" value={p} className="mt-0.5 h-5 w-5 shrink-0" />
              <span className="text-sm font-medium text-brand-900">{t(`pain_${p}` as MsgKey)}</span>
            </label>
          ))}
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            <span className="label">{t("pitchOtherPains")}</span>
            <VoiceInput name="otherPains" maxLength={1000} />
          </div>
          <label className="block min-w-0">
            <span className="label">{t("pitchWouldPay")}</span>
            <input className="input tabular-nums" name="wouldPay" inputMode="numeric" />
          </label>
          <div className="min-w-0">
            <span className="label">{t("pitchInterest")}</span>
            <div className="flex gap-2">
              {INTEREST.map((i) => (
                <label key={i} className="flex-1 cursor-pointer rounded-xl border border-line px-2 py-2.5 text-center text-sm font-semibold has-[:checked]:border-brand-600 has-[:checked]:bg-brand-600 has-[:checked]:text-white">
                  <input type="radio" name="interest" value={i} className="sr-only" />
                  {t(`interest_${i}` as MsgKey)}
                </label>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Who, then save and share */}
      <section className="card p-4 sm:p-5">
        <h2 className="mb-3 text-lg font-bold text-brand-900">{t("pitchWho")}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="label">{t("pitchName")}</span>
            <input className="input" name="prospectName" required maxLength={80} />
          </label>
          <label className="block">
            <span className="label">{t("pitchPhone")}</span>
            <input className="input" name="prospectPhone" type="tel" inputMode="numeric" maxLength={20} />
          </label>
          <label className="block">
            <span className="label">{t("pitchPg")}</span>
            <input className="input" name="pgName" maxLength={80} />
          </label>
          <label className="block">
            <span className="label">{t("pitchCity")}</span>
            <input className="input" name="city" maxLength={60} />
          </label>
        </div>
        {err && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">{err}</p>}
        {!saved ? (
          <button type="submit" className="btn-primary mt-4 w-full sm:w-auto" disabled={pending}>
            {pending ? "…" : t("pitchSave")}
          </button>
        ) : (
          <div className="mt-4 space-y-2 rounded-xl bg-brand-50 p-4" role="status">
            <p className="font-semibold text-brand-700">{t("pitchSaved")}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-accent" onClick={share} disabled={sharing} data-testid="pitch-share">
                {t("pitchShare")}
              </button>
              <a className="btn-secondary" href={`${pdfUrl}?download=1`} data-testid="pitch-pdf">
                {t("pitchPdf")}
              </a>
              <button type="button" className="btn-secondary" onClick={newPitch}>
                {t("pitchNew")}
              </button>
            </div>
            <p className="text-xs text-muted">{t("pitchShareHint")}</p>
          </div>
        )}
      </section>
    </form>
  );
}
