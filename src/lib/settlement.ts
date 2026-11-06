/** Deductions an owner commonly takes from a deposit at move-out. */
export const DEDUCTION_REASONS = ["DAMAGE", "CLEANING", "NOTICE", "KEYS", "OTHER"] as const;
export type DeductionReason = (typeof DEDUCTION_REASONS)[number];

export type Settlement = {
  deposit: number;
  /** What the tenant still owes today: unpaid rent, electricity, deductions. */
  dues: number;
  /** Paid in advance beyond what is due. */
  credit: number;
  /** What the owner gives back. */
  refund: number;
  /** What the tenant must still pay, when dues are more than the deposit. */
  owes: number;
};

/**
 * Deposit settlement at move-out. The deposit is money the owner holds, so it is set against
 * everything still owed. A refund the owner records (a negative payment) brings this to zero.
 */
export function settle(o: { deposit: number; outstanding: number; advance: number }): Settlement {
  const deposit = Math.max(0, Math.round(o.deposit));
  const net = deposit + o.advance - o.outstanding;
  return { deposit, dues: o.outstanding, credit: o.advance, refund: Math.max(0, net), owes: Math.max(0, -net) };
}

/** Description stored on a deduction charge: the reason, plus the owner's note if any. */
export function deductionDescription(reason: DeductionReason, label: string, note: string | null): string {
  return note ? `${label}: ${note}`.slice(0, 200) : label;
}

export type OpenCharge = { id: string; type: string; description: string; period: string | null; dueDate: Date; amount: number; open: number };

/** Charges not yet covered by payments, oldest first (payments pay the oldest charges first). */
export function openCharges<C extends { id: string; type: string; description: string; period: string | null; dueDate: Date; amount: number }>(
  charges: C[],
  paid: number,
  asOf: Date,
): (C & { open: number })[] {
  let pool = paid;
  const out: (C & { open: number })[] = [];
  for (const c of [...charges].filter((c) => c.dueDate <= asOf).sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())) {
    if (c.amount <= 0) continue;
    const used = Math.min(pool, c.amount);
    pool -= Math.max(0, used);
    const open = c.amount - Math.max(0, used);
    if (open > 0) out.push({ ...c, open });
  }
  return out;
}
