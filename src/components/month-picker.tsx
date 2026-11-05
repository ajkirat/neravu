import Link from "next/link";
import { fmtPeriod } from "@/lib/format";
import { shiftPeriod } from "@/lib/dates";

/** Prev / next month switcher driven by a `?month=YYYY-MM` query param. */
export function MonthPicker({ base, month }: { base: string; month: string }) {
  const sep = base.includes("?") ? "&" : "?";
  return (
    <div className="inline-flex items-center rounded-xl bg-white ring-1 ring-line">
      <Link href={`${base}${sep}month=${shiftPeriod(month, -1)}`} className="px-3 py-2 text-muted hover:text-ink" aria-label="Previous month">
        ←
      </Link>
      <span className="min-w-36 text-center text-sm font-semibold">{fmtPeriod(month)}</span>
      <Link href={`${base}${sep}month=${shiftPeriod(month, 1)}`} className="px-3 py-2 text-muted hover:text-ink" aria-label="Next month">
        →
      </Link>
    </div>
  );
}
