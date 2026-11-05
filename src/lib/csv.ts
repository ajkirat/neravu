// Spreadsheet export. Tenant names and notes are typed by people, and Excel runs anything that starts
// with = + - @ as a formula, so text cells are defused before they are written.

export type Cell = string | number | Date | null | undefined;

/** Defuse spreadsheet formulas and quote when needed. Numbers are written as numbers. */
export function csvCell(v: Cell): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "";
  let s = v instanceof Date ? v.toISOString().slice(0, 10) : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV with a UTF-8 byte-order mark so Excel shows Kannada and Telugu correctly. */
export function toCsv(header: string[], rows: Cell[][]): string {
  const lines = [header, ...rows].map((r) => r.map(csvCell).join(","));
  return "﻿" + lines.join("\r\n") + "\r\n";
}
