import { daysInMonth, diffDays, monthRange, utcDate } from "./dates";

export type Stay = { id: string; moveIn: Date; moveOut: Date | null };

/** First and last calendar day (inclusive) of a "YYYY-MM" period, or null if the period is malformed. */
export function periodSpan(period: string): { start: Date; end: Date; days: number } | null {
  const m = monthRange(period);
  if (!m) return null;
  const [y, mo] = period.split("-").map(Number);
  const days = daysInMonth(y, mo - 1);
  return { start: m.start, end: utcDate(y, mo - 1, days), days };
}

/** Days a person stayed in the month. Move-in day and move-out day both count. */
export function stayDays(stay: Stay, period: string): number {
  const span = periodSpan(period);
  if (!span) return 0;
  const from = stay.moveIn > span.start ? stay.moveIn : span.start;
  const to = stay.moveOut && stay.moveOut < span.end ? stay.moveOut : span.end;
  return to < from ? 0 : diffDays(to, from) + 1;
}

export type Share = { id: string; days: number; share: number };

/**
 * Split a bill in whole rupees across people in proportion to the days they stayed.
 * The shares always add up to exactly `amount` (the leftover rupees go to whoever has the largest remainder).
 */
export function splitByDays(amount: number, people: { id: string; days: number }[]): Share[] {
  const present = people.filter((p) => p.days > 0);
  const total = present.reduce((s, p) => s + p.days, 0);
  if (total === 0 || amount <= 0) return [];
  const raw = present.map((p) => ({ p, exact: (amount * p.days) / total }));
  const floors = raw.map((r) => Math.floor(r.exact));
  let left = amount - floors.reduce((s, n) => s + n, 0);
  const order = raw
    .map((r, i) => ({ i, rem: r.exact - floors[i], days: r.p.days }))
    .sort((a, b) => b.rem - a.rem || b.days - a.days || a.i - b.i);
  for (const o of order) {
    if (left <= 0) break;
    floors[o.i] += 1;
    left -= 1;
  }
  return present.map((p, i) => ({ id: p.id, days: p.days, share: floors[i] }));
}

/** Bill from meter readings: (current - previous) x rate, rounded to whole rupees. null if the numbers do not make sense. */
export function amountFromReadings(prev: number | null, curr: number | null, rate: number | null): number | null {
  if (prev === null || curr === null || rate === null) return null;
  if (![prev, curr, rate].every(Number.isFinite) || curr < prev || rate < 0) return null;
  return Math.round((curr - prev) * rate);
}

export const unitsUsed = (prev: number | null, curr: number | null): number | null =>
  prev === null || curr === null || curr < prev ? null : Math.round((curr - prev) * 100) / 100;

// Charges created from a bill keep their details in a short code, so the statement can show them in any language.
const PREFIX = "ELEC|";
export const electricityDescription = (period: string, room: string, days: number, total: number) => `${PREFIX}${period}|${room}|${days}|${total}`;
export function parseElectricityDescription(desc: string): { period: string; room: string; days: number; total: number } | null {
  if (!desc.startsWith(PREFIX)) return null;
  const [period, room, days, total] = desc.slice(PREFIX.length).split("|");
  const d = Number(days);
  const t = Number(total);
  return period && room !== undefined && Number.isFinite(d) && Number.isFinite(t) ? { period, room, days: d, total: t } : null;
}

