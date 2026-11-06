import { z } from "zod";

/** One tenant row as shown in the import review table. Everything is text so people can edit it. */
export type ImportRow = {
  name: string;
  phone: string;
  room: string;
  bed: string;
  rent: string;
  dueDay: string;
  moveIn: string; // YYYY-MM-DD or empty
  deposit: string;
  pending: string; // dues owed today, from the old register
};

export const MAX_IMPORT_ROWS = 200;

export const emptyRow = (): ImportRow => ({ name: "", phone: "", room: "", bed: "", rent: "", dueDay: "", moveIn: "", deposit: "", pending: "" });

const cell = (v: unknown, max = 80) => (v === null || v === undefined ? "" : String(v).replace(/\s+/g, " ").trim().slice(0, max));
const money = (v: unknown) => {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(/[,₹\s]|rs\.?/gi, ""));
  return Number.isFinite(n) && n > 0 && n < 10_000_000 ? String(Math.round(n)) : "";
};

/** Accept DD/MM/YYYY, DD-MM-YY, YYYY-MM-DD. Returns YYYY-MM-DD or "". */
export function normDate(v: unknown): string {
  const s = cell(v, 20);
  let y: number, m: number, d: number;
  let r = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(s);
  if (r) [y, m, d] = [+r[1], +r[2], +r[3]];
  else if ((r = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/.exec(s))) [d, m, y] = [+r[1], +r[2], r[3].length === 2 ? 2000 + +r[3] : +r[3]];
  else return "";
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d || y < 2000 || y > 2100) return "";
  return dt.toISOString().slice(0, 10);
}

const HEADERS: Record<keyof ImportRow, string[]> = {
  name: ["name", "tenant", "tenant name", "full name", "ಹೆಸರು", "పేరు"],
  phone: ["phone", "mobile", "mobile number", "phone number", "contact", "ಫೋನ್", "ಮೊಬೈಲ್", "ఫోన్", "మొబైల్"],
  room: ["room", "room no", "room number", "ಕೋಣೆ", "గది"],
  bed: ["bed", "bed no", "bed label", "ಹಾಸಿಗೆ", "బెడ్"],
  rent: ["rent", "monthly rent", "rent per month", "ಬಾಡಿಗೆ", "అద్దె"],
  dueDay: ["due day", "due date", "rent due day", "due"],
  moveIn: ["move in", "move-in", "move in date", "joined", "joining date", "date of joining", "from"],
  deposit: ["deposit", "advance", "security deposit", "ಠೇವಣಿ", "డిపాజిట్"],
  pending: ["pending", "dues", "balance", "due amount", "pending amount", "ಬಾಕಿ", "బకాయి"],
};

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') (cur += '"'), i++;
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === "," || c === ";" || c === "\t") out.push(cur), (cur = "");
    else cur += c;
  }
  out.push(cur);
  return out;
}

/** Read a CSV saved from Excel or Google Sheets. The first row must name the columns. */
export function parseImportCsv(text: string): { rows: ImportRow[]; missing: (keyof ImportRow)[] } {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return { rows: [], missing: ["name", "phone", "room"] };
  const head = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase().replace(/[_.:]+/g, " ").replace(/\s+/g, " "));
  const col = {} as Record<keyof ImportRow, number>;
  for (const k of Object.keys(HEADERS) as (keyof ImportRow)[]) col[k] = head.findIndex((h) => HEADERS[k].includes(h));
  const missing = (["name", "phone", "room"] as const).filter((k) => col[k] < 0);
  const rows = lines.slice(1, MAX_IMPORT_ROWS + 1).map((l) => {
    const c = splitCsvLine(l);
    const get = (k: keyof ImportRow) => (col[k] >= 0 ? c[col[k]] : "");
    return sanitizeRow({ name: get("name"), phone: get("phone"), room: get("room"), bed: get("bed"), rent: get("rent"), dueDay: get("dueDay"), moveIn: get("moveIn"), deposit: get("deposit"), pending: get("pending") });
  });
  return { rows: rows.filter((r) => r.name || r.phone), missing: [...missing] };
}

/** Bound and tidy one row, from a file or from the photo reader. */
export function sanitizeRow(r: Partial<Record<keyof ImportRow, unknown>>): ImportRow {
  const due = Number(cell(r.dueDay, 4).replace(/\D/g, ""));
  return {
    name: cell(r.name),
    phone: cell(r.phone, 20).replace(/[^\d+\s-]/g, ""),
    room: cell(r.room, 20),
    bed: cell(r.bed, 6).toUpperCase(),
    rent: money(r.rent),
    dueDay: due >= 1 && due <= 31 ? String(Math.min(due, 28)) : "",
    moveIn: normDate(r.moveIn),
    deposit: money(r.deposit),
    pending: money(r.pending),
  };
}

const aiSchema = z.object({
  rows: z.array(z.record(z.string(), z.unknown())).max(MAX_IMPORT_ROWS),
});

/** Turn the photo reader's output into rows. Its output is untrusted, like any typed input. */
export function rowsFromAi(input: unknown): ImportRow[] {
  const p = aiSchema.safeParse(input);
  if (!p.success) return [];
  return p.data.rows
    .map((r) => sanitizeRow({ name: r.name, phone: r.phone, room: r.room, bed: r.bed, rent: r.rent, dueDay: r.due_day, moveIn: r.move_in, deposit: r.deposit, pending: r.pending }))
    .filter((r) => r.name || r.phone);
}
