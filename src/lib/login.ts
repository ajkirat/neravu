/** How names are compared at sign-in: case, extra spaces and dots don't matter. */
export function normName(s: string): string {
  return s.toLowerCase().replace(/[.]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Does the name typed at sign-in match the saved name? The full name or just the first name both count,
 * so "Lakshmi", "lakshmi rao" and "LAKSHMI  RAO" all match "Lakshmi Rao". Part of a word does not ("Lak").
 */
export function nameMatches(typed: string, saved: string): boolean {
  const a = normName(typed);
  const b = normName(saved);
  if (a.length < 2 || !b) return false;
  return a === b || a === b.split(" ")[0];
}
