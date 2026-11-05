import { daysInMonth, diffDays, utcDate } from "./dates";

export type RentPeriod = { period: string; dueDate: Date };

/**
 * Rent periods that have fallen due for a tenant up to `asOf` (inclusive).
 *
 * The first month's rent is due on the move-in date. Every later month is due
 * on `dueDay` of that month (clamped to the month's length). No rent is billed
 * for a month whose due date is after the move-out date.
 */
export function duePeriods(opts: {
  moveIn: Date;
  moveOut?: Date | null;
  dueDay: number;
  asOf: Date;
}): RentPeriod[] {
  const { moveIn, moveOut, dueDay, asOf } = opts;
  const out: RentPeriod[] = [];
  const stop = moveOut && moveOut < asOf ? moveOut : asOf;
  let y = moveIn.getUTCFullYear();
  let m = moveIn.getUTCMonth();
  for (let i = 0; i < 600; i++) {
    const due =
      i === 0 ? moveIn : utcDate(y, m, Math.min(dueDay, daysInMonth(y, m)));
    if (due > stop) break;
    // Moving out on/before the due date means that month is not billed.
    if (i > 0 && moveOut && due >= moveOut) break;
    out.push({ period: `${y}-${String(m + 1).padStart(2, "0")}`, dueDate: due });
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
  }
  return out;
}

/** The next rent due date strictly after `asOf`. */
export function nextDueDate(opts: {
  moveIn: Date;
  dueDay: number;
  asOf: Date;
}): Date {
  const { moveIn, dueDay, asOf } = opts;
  if (moveIn > asOf) return moveIn;
  let y = asOf.getUTCFullYear();
  let m = asOf.getUTCMonth();
  for (let i = 0; i < 3; i++) {
    const due = utcDate(y, m, Math.min(dueDay, daysInMonth(y, m)));
    if (due > asOf && due > moveIn) return due;
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
  }
  return utcDate(y, m, Math.min(dueDay, daysInMonth(y, m)));
}

export type LedgerCharge = { amount: number; dueDate: Date };
export type LedgerPayment = { amount: number };

export type LedgerSummary = {
  /** Total of charges due on or before `asOf`. */
  charged: number;
  paid: number;
  /** Amount still owed (0 when fully paid). */
  outstanding: number;
  /** Payments received beyond what is due (advance). */
  advance: number;
  /** Due date of the oldest charge not fully covered by payments. */
  oldestUnpaid: Date | null;
  /** Days since the oldest unpaid charge fell due. */
  overdueDays: number;
};

/**
 * Summarise a tenant ledger. Payments are applied to the oldest charges first,
 * which is how owners usually think about "pending since".
 */
export function summarizeLedger(
  charges: LedgerCharge[],
  payments: LedgerPayment[],
  asOf: Date,
): LedgerSummary {
  const due = charges
    .filter((c) => c.dueDate <= asOf)
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  const charged = due.reduce((s, c) => s + c.amount, 0);
  const paid = payments.reduce((s, p) => s + p.amount, 0);
  let pool = paid;
  let oldestUnpaid: Date | null = null;
  for (const c of due) {
    if (pool >= c.amount) {
      pool -= c.amount;
    } else {
      oldestUnpaid = c.dueDate;
      break;
    }
  }
  const outstanding = Math.max(0, charged - paid);
  return {
    charged,
    paid,
    outstanding,
    advance: Math.max(0, paid - charged),
    oldestUnpaid: outstanding > 0 ? oldestUnpaid : null,
    overdueDays:
      outstanding > 0 && oldestUnpaid ? Math.max(0, diffDays(asOf, oldestUnpaid)) : 0,
  };
}
