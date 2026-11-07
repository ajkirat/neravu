/**
 * The savings calculator shown to a prospective PG owner. Pure and simple on purpose: every line is
 * "what you spend today x how much of it Neravu takes away", with the share written next to it, so the
 * owner can see and argue with each number. The shares are deliberately modest.
 */

export type PitchInputs = {
  beds: number;
  rent: number; // per bed per month, rupees
  occupancy: number; // percent of beds filled
  chaseHours: number; // hours a month spent following up rent
  unpaidPct: number; // percent of monthly rent that is never collected (forgotten dues, people leaving)
  bills: number; // bills / expenses written down per month
  minsPerBill: number;
  rooms: number; // rooms with an electricity meter to split
  minsPerRoom: number; // minutes per room per month to work out shares
  elecLost: number; // rupees of electricity a month not recovered from tenants
  cashPct: number; // percent of rent paid in cash
  leakPct: number; // percent of that cash that goes missing
  leavers: number; // tenants leaving per month (and new ones joining)
  emptyDays: number; // days a bed stays empty before the next tenant
  hourValue: number; // rupees an hour of the owner's time is worth
};

export const PITCH_DEFAULTS: PitchInputs = {
  beds: 40,
  rent: 8000,
  occupancy: 85,
  chaseHours: 10,
  unpaidPct: 2,
  bills: 40,
  minsPerBill: 5,
  rooms: 15,
  minsPerRoom: 10,
  elecLost: 3000,
  cashPct: 30,
  leakPct: 1,
  leavers: 3,
  emptyDays: 15,
  hourValue: 300,
};

/** Upper limits so a typo cannot produce silly totals. */
export const PITCH_MAX: PitchInputs = {
  beds: 2000,
  rent: 100000,
  occupancy: 100,
  chaseHours: 300,
  unpaidPct: 50,
  bills: 2000,
  minsPerBill: 60,
  rooms: 1000,
  minsPerRoom: 120,
  elecLost: 1000000,
  cashPct: 100,
  leakPct: 50,
  leavers: 500,
  emptyDays: 120,
  hourValue: 10000,
};

/** How much of each cost Neravu takes away. Shown on the page and in the PDF. */
export const PITCH_SHARES = {
  chase: 0.7, // reminders in one tap, Today list says who to call
  receipts: 1, // receipts go by themselves
  receiptMins: 3, // minutes to write one receipt by hand
  bills: 0.7, // photo of the bill instead of writing it down
  electricity: 0.8, // split by days stayed, added to rent
  joinMins: 20, // minutes of paperwork per new tenant
  join: 0.75, // tenants fill their own details and ID photo; register prints itself
  unpaid: 0.5, // dues are never forgotten, settlement sheet at move-out
  leak: 0.8, // caretakers record cash in their name; owner confirms handover
  elecLost: 0.8, // every room's bill reaches every tenant's dues
  vacancy: 0.25, // QR at the gate and empty beds shared to WhatsApp groups
} as const;

export type PitchLineKey = "chase" | "receipts" | "bills" | "electricity" | "join" | "unpaid" | "leak" | "elecLost" | "vacancy";
export type PitchLine = { key: PitchLineKey; hours: number; rupees: number };
export type PitchResult = {
  occupied: number;
  rentRoll: number;
  lines: PitchLine[];
  hours: number; // hours saved a month
  timeValue: number; // those hours in rupees
  money: number; // rupees recovered or saved a month
  perMonth: number; // money + timeValue
  perYear: number;
};

const num = (v: unknown, max: number): number => {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(/[,₹\s]/g, ""));
  return Number.isFinite(n) ? Math.min(Math.max(n, 0), max) : 0;
};

/** Clean whatever came from a form (strings, blanks, negatives, huge numbers) into usable inputs. */
export function cleanPitchInputs(raw: Partial<Record<keyof PitchInputs, unknown>>): PitchInputs {
  const out = {} as PitchInputs;
  for (const k of Object.keys(PITCH_DEFAULTS) as (keyof PitchInputs)[]) {
    out[k] = raw[k] === undefined || raw[k] === "" ? PITCH_DEFAULTS[k] : num(raw[k], PITCH_MAX[k]);
  }
  return out;
}

const r1 = (n: number) => Math.round(n * 10) / 10;

export function computePitch(i: PitchInputs): PitchResult {
  const s = PITCH_SHARES;
  const occupied = Math.round((i.beds * i.occupancy) / 100);
  const rentRoll = occupied * i.rent;
  const lines: PitchLine[] = [
    { key: "chase", hours: r1(i.chaseHours * s.chase), rupees: 0 },
    { key: "receipts", hours: r1((occupied * s.receiptMins * s.receipts) / 60), rupees: 0 },
    { key: "bills", hours: r1((i.bills * i.minsPerBill * s.bills) / 60), rupees: 0 },
    { key: "electricity", hours: r1((i.rooms * i.minsPerRoom * s.electricity) / 60), rupees: 0 },
    { key: "join", hours: r1((i.leavers * s.joinMins * s.join) / 60), rupees: 0 },
    { key: "unpaid", hours: 0, rupees: Math.round((rentRoll * i.unpaidPct * s.unpaid) / 100) },
    { key: "leak", hours: 0, rupees: Math.round((rentRoll * i.cashPct * i.leakPct * s.leak) / 10000) },
    { key: "elecLost", hours: 0, rupees: Math.round(i.elecLost * s.elecLost) },
    { key: "vacancy", hours: 0, rupees: Math.round(i.leavers * i.emptyDays * s.vacancy * (i.rent / 30)) },
  ];
  const hours = r1(lines.reduce((a, l) => a + l.hours, 0));
  const timeValue = Math.round(hours * i.hourValue);
  const money = lines.reduce((a, l) => a + l.rupees, 0);
  const perMonth = money + timeValue;
  return { occupied, rentRoll, lines, hours, timeValue, money, perMonth, perYear: perMonth * 12 };
}

/** Problems PG owners commonly name; ticked in the calculator and kept with the pitch. */
export const PAINS = [
  "chase",
  "alreadyPaid",
  "cash",
  "receipts",
  "electricity",
  "bills",
  "vacancy",
  "police",
  "deposit",
  "repairs",
  "staff",
  "records",
  "food",
] as const;
export type Pain = (typeof PAINS)[number];

export const INTEREST = ["HOT", "MAYBE", "NO"] as const;
