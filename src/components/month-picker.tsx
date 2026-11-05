import Link from "next/link";
import { fmtPeriod } from "@/lib/format";
import { shiftPeriod } from "@/lib/dates";
import { getT } from "@/lib/i18n/server";

/** Prev / next month switcher driven by a `?month=YYYY-MM` query param. */
export async function MonthPicker({ base, month }: { base: string; month: string }) {
  const { t, lang } = await getT();
  const sep = base.includes("?") ? "&" : "?";
  return (
    <div className="inline-flex items-center rounded-xl bg-white ring-1 ring-line">
      <Link href={`${base}${sep}month=${shiftPeriod(month, -1)}`} className="px-3 py-2 text-muted hover:text-ink" aria-label={t("prevMonth")}>
        ←
      </Link>
      <span className="min-w-36 text-center text-sm font-semibold">{fmtPeriod(month, lang)}</span>
      <Link href={`${base}${sep}month=${shiftPeriod(month, 1)}`} className="px-3 py-2 text-muted hover:text-ink" aria-label={t("nextMonth")}>
        →
      </Link>
    </div>
  );
}
