"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n/client";
import { EVERY_CHOICES } from "@/lib/jobs";
import { REMIND_CHOICES, SERVICE_CATEGORIES, SERVICE_PRESETS } from "@/lib/upkeep";
import type { MsgKey } from "@/lib/i18n";

export type ServiceValues = {
  title: string;
  category: string;
  every: number;
  nextDue: string;
  propertyId: string | null;
  vendorName: string | null;
  vendorPhone: string | null;
  cost: number | null;
  remindDays: number;
};

/**
 * The fields of a recurring service. When adding, tap a ready service (grouped by type) to fill the
 * form; then add who does it, what it costs and how early to be reminded.
 */
export function JobFields({
  properties,
  defaultDate,
  initial,
}: {
  properties: { id: string; name: string }[];
  defaultDate: string;
  initial?: ServiceValues;
}) {
  const t = useT();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [category, setCategory] = useState(initial?.category ?? "OTHER");
  const [every, setEvery] = useState(String(initial?.every ?? 30));
  const choices = [...new Set([...EVERY_CHOICES, Number(every)])].sort((a, b) => a - b);
  return (
    <>
      {!initial && (
        <div className="col-span-full space-y-2">
          <p className="text-xs text-muted">{t("svcPresets")}</p>
          {SERVICE_CATEGORIES.filter((c) => SERVICE_PRESETS.some((p) => p.category === c)).map((c) => (
            <div key={c} className="flex flex-wrap items-center gap-2">
              <span className="w-28 shrink-0 text-xs font-semibold tracking-wide text-muted uppercase">{t(`svc_${c}` as MsgKey)}</span>
              {SERVICE_PRESETS.filter((p) => p.category === c).map((p) => (
                <button
                  key={p.key}
                  type="button"
                  className={`rounded-xl px-3 py-1.5 text-sm font-semibold ring-1 ring-line ${title === t(p.key as MsgKey) ? "bg-brand-600 text-white" : "bg-white"}`}
                  onClick={() => {
                    setTitle(t(p.key as MsgKey));
                    setCategory(p.category);
                    setEvery(String(p.every));
                  }}
                >
                  {t(p.key as MsgKey)}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
      <label className="block">
        <span className="label">{t("jobTitle")}</span>
        <input name="title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} />
      </label>
      <label className="block">
        <span className="label">{t("svcCategory")}</span>
        <select name="category" className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
          {SERVICE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {t(`svc_${c}` as MsgKey)}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="label">{t("jobEvery")}</span>
        <select name="every" className="input" value={every} onChange={(e) => setEvery(e.target.value)}>
          {choices.map((d) => (
            <option key={d} value={d}>
              {t("jobEveryN", { n: d })}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="label">{t("jobNextDue")}</span>
        <input name="nextDue" type="date" className="input" defaultValue={initial?.nextDue ?? defaultDate} />
      </label>
      <label className="block">
        <span className="label">{t("svcVendor")}</span>
        <input name="vendorName" className="input" maxLength={80} defaultValue={initial?.vendorName ?? ""} />
      </label>
      <label className="block">
        <span className="label">{t("svcVendorPhone")}</span>
        <input name="vendorPhone" type="tel" inputMode="numeric" className="input" maxLength={20} defaultValue={initial?.vendorPhone ?? ""} />
      </label>
      <label className="block">
        <span className="label">{t("svcCost")}</span>
        <input name="cost" inputMode="numeric" className="input" defaultValue={initial?.cost ?? ""} />
      </label>
      <label className="block">
        <span className="label">{t("svcRemind")}</span>
        <select name="remindDays" className="input" defaultValue={String(initial?.remindDays ?? 3)}>
          {REMIND_CHOICES.map((n) => (
            <option key={n} value={n}>
              {n === 0 ? t("svcRemind0") : t("svcRemindN", { n })}
            </option>
          ))}
        </select>
      </label>
      {properties.length > 1 && (
        <label className="block">
          <span className="label">{t("propertyLabel")}</span>
          <select name="propertyId" className="input" defaultValue={initial?.propertyId ?? ""}>
            <option value="">{t("svcAllPgs")}</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      )}
    </>
  );
}
