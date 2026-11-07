import { createHmac, timingSafeEqual } from "node:crypto";
import { ID_TYPES } from "./format";

/**
 * Tidy an ID number read from a photo, by type. Returns null when it does not look like that kind of
 * ID at all, so a misread is never saved as if it were real.
 */
export function normalizeIdNumber(type: string | null, raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.toUpperCase().replace(/[^A-Z0-9X]/g, "");
  if (type === "Aadhaar") {
    // 12 digits, or masked like XXXXXXXX1234.
    if (!/^[0-9X]{8}[0-9]{4}$/.test(s)) return null;
    return `${s.slice(0, 4)} ${s.slice(4, 8)} ${s.slice(8)}`;
  }
  if (type === "PAN") return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(s) ? s : null;
  if (type === "Passport") return /^[A-Z][0-9]{7}$/.test(s) ? s : null;
  if (type === "Voter ID") return /^[A-Z]{3}[0-9]{7}$/.test(s) ? s : null;
  // Driving licences and others vary by state / country: keep letters and digits, sensible length.
  return s.length >= 5 && s.length <= 20 ? s : null;
}

export const asIdType = (t: unknown): string | null => (typeof t === "string" && (ID_TYPES as readonly string[]).includes(t) ? t : null);

function secret(): string {
  return process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 16 ? process.env.AUTH_SECRET : "neravu-dev-only-secret-do-not-use";
}

/** What the server read from a photo, signed, so the form can carry it to the save step unchanged. */
export function signIdRead(photoSha: string, type: string | null, number: string | null): string {
  return createHmac("sha256", secret()).update(`id|${photoSha}|${type ?? ""}|${number ?? ""}`).digest("hex");
}

export function verifyIdRead(photoSha: string, type: string | null, number: string | null, sig: string): boolean {
  const want = Buffer.from(signIdRead(photoSha, type, number), "hex");
  const got = Buffer.from(/^[0-9a-f]{64}$/.test(sig) ? sig : "", "hex");
  return got.length === want.length && timingSafeEqual(got, want);
}
