"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n/client";
import { EVERY_CHOICES, JOB_PRESETS } from "@/lib/jobs";
import type { MsgKey } from "@/lib/i18n";

/** Tap a ready job to fill the form, or type your own. */
export function JobFields({ properties, defaultDate }: { properties: { id: string; name: string }[]; defaultDate: string }) {
  const t = useT();
  const [title, setTitle] = useState("");
  const [every, setEvery] = useState("30");
  return (
    <>
      <div className="col-span-full flex flex-wrap gap-2">
        {JOB_PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            className={`rounded-xl px-3 py-2 text-sm font-semibold ring-1 ring-line ${title === t(p.key as MsgKey) ? "bg-brand-600 text-white" : "bg-white"}`}
            onClick={() => {
              setTitle(t(p.key as MsgKey));
              setEvery(String(p.every));
            }}
          >
            {t(p.key as MsgKey)}
          </button>
        ))}
      </div>
      <label className="block">
        <span className="label">{t("jobTitle")}</span>
        <input name="title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} />
      </label>
      <label className="block">
        <span className="label">{t("jobEvery")}</span>
        <select name="every" className="input" value={every} onChange={(e) => setEvery(e.target.value)}>
          {EVERY_CHOICES.map((d) => (
            <option key={d} value={d}>
              {t("jobEveryN", { n: d })}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="label">{t("jobNextDue")}</span>
        <input name="nextDue" type="date" className="input" defaultValue={defaultDate} />
      </label>
      {properties.length > 1 && (
        <label className="block">
          <span className="label">{t("propertyLabel")}</span>
          <select name="propertyId" className="input" defaultValue="">
            <option value="">{t("annAllPgs")}</option>
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
