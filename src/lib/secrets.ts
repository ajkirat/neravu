import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

// Keys for third-party services (e.g. Razorpay) are stored encrypted. The key comes from
// ENCRYPTION_KEY, or AUTH_SECRET if that is not set. Changing it makes saved keys unreadable.
function key(): Buffer {
  const base = process.env.ENCRYPTION_KEY || process.env.AUTH_SECRET || "neravu-dev-only-secret-do-not-use";
  return scryptSync(base, "neravu-secrets-v1", 32);
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64"), c.getAuthTag().toString("base64"), ct.toString("base64")].join(":");
}

/** Returns null if the value is missing, tampered with, or was encrypted with a different key. */
export function decryptSecret(enc: string | null | undefined): string | null {
  if (!enc) return null;
  const [v, iv, tag, ct] = enc.split(":");
  if (v !== "v1" || !iv || !tag || !ct) return null;
  try {
    const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"));
    d.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([d.update(Buffer.from(ct, "base64")), d.final()]).toString("utf8");
  } catch {
    return null;
  }
}
