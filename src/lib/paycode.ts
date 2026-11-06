/** Lowest code 1..99 not used by another tenant. null when all 99 are taken (very large PGs). */
export function pickPayCode(used: Iterable<number | null | undefined>): number | null {
  const taken = new Set<number>();
  for (const u of used) if (typeof u === "number") taken.add(u);
  for (let c = 1; c <= 99; c++) if (!taken.has(c)) return c;
  return null;
}

/** "8500.37": the amount a tenant is asked to pay over UPI, rupees plus their paise tag. */
export function taggedAmount(rupees: number, paise: number | null | undefined): string {
  const p = paise && paise > 0 && paise < 100 ? paise : 0;
  return `${Math.max(0, Math.round(rupees))}.${String(p).padStart(2, "0")}`;
}

/** "₹8,500.37" for showing to people. */
export function taggedRupees(rupees: number, paise: number | null | undefined): string {
  const [r, p] = taggedAmount(rupees, paise).split(".");
  return `₹${Number(r).toLocaleString("en-IN")}.${p}`;
}
