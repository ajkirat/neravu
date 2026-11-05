// Date-only helpers. Calendar dates (move-in, due dates, payment dates) are
// stored as UTC midnight so they never shift with the server's timezone.

export const APP_TIMEZONE = process.env.APP_TIMEZONE ?? "Asia/Kolkata";

export function utcDate(year: number, monthIndex: number, day: number): Date {
  return new Date(Date.UTC(year, monthIndex, day));
}

/** Today's calendar date in the app timezone, as UTC midnight. */
export function today(now: Date = new Date(), timeZone = APP_TIMEZONE): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return parseDateInput(parts)!;
}

/** Parse a `YYYY-MM-DD` form value. Returns null when invalid. */
export function parseDateInput(value: string | null | undefined): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const d = utcDate(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (d.getUTCDate() !== Number(m[3])) return null;
  return d;
}

export function toDateInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 86_400_000);
}

export function diffDays(later: Date, earlier: Date): number {
  return Math.round((later.getTime() - earlier.getTime()) / 86_400_000);
}

/** `YYYY-MM` key for a date. */
export function periodKey(d: Date): string {
  return d.toISOString().slice(0, 7);
}

/** Parse `YYYY-MM` into the first and last+1 day of that month. */
export function monthRange(period: string): { start: Date; end: Date } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(period);
  if (!m) return null;
  const y = Number(m[1]);
  const mi = Number(m[2]) - 1;
  if (mi < 0 || mi > 11) return null;
  return { start: utcDate(y, mi, 1), end: utcDate(y, mi + 1, 1) };
}

export function shiftPeriod(period: string, months: number): string {
  const [y, m] = period.split("-").map(Number);
  return periodKey(utcDate(y, m - 1 + months, 1));
}
