// Bulk room creation. Every PG numbers its rooms differently (101, G1, A-12, "Rose"...), so instead of
// a fixed scheme there are two flexible ways to describe rooms: a pattern builder and a free list.
// Everything here is pure so it can be tested and reused on both the server and in the browser.

export type RoomDraft = { number: string; floor: string | null; sharing: number; rent: number };

export const MAX_BULK = 300;
export const MAX_NUMBER_LEN = 20;

const FLOOR_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** A, B, ... Z, AA, AB ... for 0-based index. */
export function letters(i: number): string {
  let n = i;
  let s = "";
  do {
    s = FLOOR_LETTERS[n % 26] + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

export type PatternOpts = {
  /** Text before the number, e.g. "A-" or "Room ". */
  prefix: string;
  /** How the floor shows in the number: 1,2,3 | A,B,C | not at all. */
  floorPart: "digit" | "letter" | "none";
  /** What the lowest floor is called when it is the ground floor (floor 0). */
  groundLabel: string;
  /** Text between the floor part and the room part, e.g. "-" gives 1-01. */
  separator: string;
  /** Minimum digits of the room part: 2 gives 01, 02. */
  digits: number;
  /** First room number on each floor (or overall when continuous). */
  start: number;
  /** Number the room part as 1,2,3 across the whole building instead of restarting each floor. */
  continuous: boolean;
  /** Text after the number. */
  suffix: string;
  /** Use letters for the room part (A, B, C) instead of digits. */
  roomLetters: boolean;
  /** Lowest floor: 0 = ground floor included, 1 = start at first floor. */
  firstFloor: number;
  /** Rooms on each floor, one entry per floor. */
  perFloor: number[];
};

export const defaultPattern: PatternOpts = {
  prefix: "",
  floorPart: "digit",
  groundLabel: "G",
  separator: "",
  digits: 2,
  start: 1,
  continuous: false,
  suffix: "",
  roomLetters: false,
  firstFloor: 1,
  perFloor: [10, 10, 10],
};

/** Ready-made patterns for the commonest styles, so most owners just pick one. */
export const PRESETS: Record<string, Partial<PatternOpts>> = {
  floor100: { prefix: "", floorPart: "digit", separator: "", digits: 2, continuous: false, roomLetters: false, firstFloor: 1 }, // 101, 102, 201
  ground: { prefix: "", floorPart: "digit", separator: "", digits: 1, continuous: false, roomLetters: false, firstFloor: 0, groundLabel: "G" }, // G1, G2, 11, 12
  simple: { prefix: "", floorPart: "none", separator: "", digits: 1, continuous: true, roomLetters: false, firstFloor: 1 }, // 1, 2, 3
  prefixed: { prefix: "A-", floorPart: "digit", separator: "", digits: 2, continuous: false, roomLetters: false, firstFloor: 1 }, // A-101
  floorLetter: { prefix: "", floorPart: "letter", separator: "", digits: 1, continuous: false, roomLetters: false, firstFloor: 1 }, // A1, A2, B1
};

const clampInt = (n: unknown, lo: number, hi: number, fallback: number) => {
  const v = typeof n === "number" ? n : Number(n);
  return Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.trunc(v))) : fallback;
};

/** Build room numbers from a pattern. Returns at most MAX_BULK entries. */
export function generatePattern(o: PatternOpts): { number: string; floor: string | null }[] {
  const out: { number: string; floor: string | null }[] = [];
  let running = clampInt(o.start, 0, 99999, 1);
  const first = clampInt(o.firstFloor, 0, 200, 1);
  const digits = clampInt(o.digits, 1, 6, 1);
  o.perFloor.forEach((count, fi) => {
    const floor = first + fi;
    const n = clampInt(count, 0, MAX_BULK, 0);
    let local = clampInt(o.start, 0, 99999, 1);
    for (let k = 0; k < n; k++) {
      if (out.length >= MAX_BULK) return;
      const idx = o.continuous ? running++ : local++;
      const roomPart = o.roomLetters ? letters(Math.max(0, idx - 1)) : String(idx).padStart(digits, "0");
      const floorText = floor === 0 && o.floorPart !== "none" ? o.groundLabel : o.floorPart === "digit" ? String(floor) : o.floorPart === "letter" ? letters(Math.max(0, floor - 1)) : "";
      const sep = floorText && roomPart ? o.separator : "";
      out.push({ number: `${o.prefix}${floorText}${sep}${roomPart}${o.suffix}`, floor: floor === 0 ? "G" : String(floor) });
    }
  });
  return out;
}

/** Floor guessed from a number like 101, A-204 or G3; null when it cannot be told. */
export function guessFloor(number: string): string | null {
  const g = number.match(/^\D*?(g|ground)\D*\d/i);
  if (g) return "G";
  const m = number.match(/(\d+)\s*$/);
  if (!m) return null;
  const digits = m[1].replace(/^0+(?=\d)/, "");
  if (digits.length >= 3) return String(Math.floor(Number(digits) / 100));
  return null;
}

const RANGE = /^(.*?)(\d+)\s*(?:-|–|—|\.\.+|\bto\b)\s*(.*?)(\d+)$/i;

/** "101-110" -> 101..110, "A1-A5" -> A1..A5, "001-004" keeps zero padding. Anything else is one name. */
export function expandToken(token: string): string[] | null {
  const t = token.trim();
  if (!t) return [];
  const m = t.match(RANGE);
  if (m) {
    const [, p1, a, p2, b] = m;
    if ((p2 === "" || p2.trim() === p1.trim()) && a.length <= 9 && b.length <= 9) {
      const from = Number(a);
      const to = Number(b);
      if (to < from) return null;
      if (to - from + 1 > MAX_BULK) return null;
      const pad = a.length === b.length || a.startsWith("0") ? a.length : 0;
      const prefix = p1;
      return Array.from({ length: to - from + 1 }, (_, i) => `${prefix}${String(from + i).padStart(pad, "0")}`);
    }
  }
  return [t];
}

export type ParsedRow = { number: string; sharing?: number; rent?: number; floor?: string | null };
export type ParseResult = { rows: ParsedRow[]; problems: string[] };

const toInt = (s: string | undefined) => {
  if (s === undefined) return undefined;
  const v = Number(s.replace(/[,₹\s]/g, ""));
  return s.trim() !== "" && Number.isFinite(v) ? Math.trunc(v) : undefined;
};

/**
 * Parse what an owner typed or pasted.
 * - One line: rooms separated by commas, spaces or semicolons, ranges allowed ("101-110, 201-210, G1").
 * - Several lines (e.g. pasted from Excel): one room per line; optional columns after the number:
 *   number, beds, rent, floor. Columns may be separated by tab, comma or semicolon.
 */
export function parseRoomList(text: string): ParseResult {
  const rows: ParsedRow[] = [];
  const problems: string[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const multi = lines.length > 1;
  const push = (r: ParsedRow) => {
    if (rows.length < MAX_BULK) rows.push(r);
  };
  for (const line of lines) {
    if (multi) {
      const cols = line.split(/\t|;|,(?=\s*\d|\s*$)/).map((c) => c.trim());
      // A line like "101, 102, 103" is a list, not columns: treat it as a list when the extra columns look like room tokens.
      const first = cols[0];
      const sharing = toInt(cols[1]);
      const rent = toInt(cols[2]);
      const floor = cols[3] ? cols[3] : undefined;
      const expanded = expandToken(first);
      if (!expanded) {
        problems.push(first);
        continue;
      }
      for (const number of expanded) push({ number, sharing, rent, floor: floor ?? undefined });
    } else {
      for (const tok of line.split(/[;,\n]|\s{2,}|(?<=\d)\s+(?=\S)|\t/)) {
        const t = tok.trim();
        if (!t) continue;
        const expanded = expandToken(t);
        if (!expanded) {
          problems.push(t);
          continue;
        }
        for (const number of expanded) push({ number });
      }
    }
  }
  if (rows.length >= MAX_BULK) problems.push(`more than ${MAX_BULK} rooms`);
  return { rows, problems };
}

export type DraftIssue = "empty" | "tooLong" | "duplicate" | "exists" | "beds" | "rent";
export type ValidatedDraft = RoomDraft & { issues: DraftIssue[] };

/** Check every draft: name present and short, not repeated, not already in the property, beds 1..12, rent >= 1. */
export function validateDrafts(drafts: RoomDraft[], existing: Iterable<string>): { rows: ValidatedDraft[]; ok: boolean } {
  const exist = new Set([...existing].map((n) => n.trim().toLowerCase()));
  const seen = new Map<string, number>();
  for (const d of drafts) {
    const k = d.number.trim().toLowerCase();
    seen.set(k, (seen.get(k) ?? 0) + 1);
  }
  let ok = drafts.length > 0 && drafts.length <= MAX_BULK;
  const rows = drafts.map((d) => {
    const issues: DraftIssue[] = [];
    const k = d.number.trim().toLowerCase();
    if (!k) issues.push("empty");
    if (d.number.trim().length > MAX_NUMBER_LEN) issues.push("tooLong");
    if (k && (seen.get(k) ?? 0) > 1) issues.push("duplicate");
    if (k && exist.has(k)) issues.push("exists");
    if (!Number.isInteger(d.sharing) || d.sharing < 1 || d.sharing > 12) issues.push("beds");
    if (!Number.isInteger(d.rent) || d.rent < 1) issues.push("rent");
    if (issues.length) ok = false;
    return { ...d, number: d.number.trim(), issues };
  });
  return { rows, ok };
}

/** Turn parsed rows into drafts, filling in defaults and a guessed floor. */
export function toDrafts(rows: ParsedRow[], defaults: { sharing: number; rent: number }, guess = true): RoomDraft[] {
  return rows.map((r) => ({
    number: r.number,
    floor: r.floor !== undefined ? r.floor : guess ? guessFloor(r.number) : null,
    sharing: r.sharing ?? defaults.sharing,
    rent: r.rent ?? defaults.rent,
  }));
}
