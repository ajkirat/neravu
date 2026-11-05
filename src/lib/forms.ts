/** Small helpers for reading FormData in server actions. */

export function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

export function optStr(fd: FormData, key: string): string | null {
  const v = str(fd, key);
  return v === "" ? null : v;
}

/** Parse a whole-rupee amount; returns null when missing or invalid. */
export function int(fd: FormData, key: string): number | null {
  const raw = str(fd, key).replace(/[,₹\s]/g, "");
  if (raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) && Number.isInteger(n) ? n : null;
}
