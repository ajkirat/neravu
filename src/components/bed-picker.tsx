"use client";

import { useState } from "react";
import type { BedOption } from "@/lib/beds";
import { useT } from "@/lib/i18n/client";

/** Bed select that pre-fills the rent field with the room's per-bed rent. */
export function BedPicker({
  beds,
  defaultBed,
  withRent = true,
}: {
  beds: BedOption[];
  defaultBed?: string;
  withRent?: boolean;
}) {
  const t = useT();
  const initial = beds.find((b) => b.id === defaultBed) ?? null;
  const [rent, setRent] = useState(initial ? String(initial.rent) : "");
  const groups = new Map<string, BedOption[]>();
  for (const b of beds) groups.set(b.property, [...(groups.get(b.property) ?? []), b]);

  return (
    <div className={withRent ? "grid gap-3 sm:grid-cols-2" : ""}>
      <label className="block">
        <span className="label">{t("bed")}</span>
        <select
          className="input"
          name="bedId"
          defaultValue={initial?.id ?? ""}
          required
          onChange={(e) => {
            const b = beds.find((x) => x.id === e.target.value);
            if (b) setRent(String(b.rent));
          }}
        >
          <option value="" disabled>
            {beds.length ? t("chooseBed") : t("noVacantBeds")}
          </option>
          {[...groups].map(([property, list]) => (
            <optgroup key={property} label={property}>
              {list.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      {withRent && (
        <label className="block">
          <span className="label">{t("monthlyRentRs")}</span>
          <input
            className="input"
            name="monthlyRent"
            inputMode="numeric"
            value={rent}
            onChange={(e) => setRent(e.target.value)}
            required
          />
        </label>
      )}
    </div>
  );
}
