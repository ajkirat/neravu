import { createHash, randomBytes } from "node:crypto";

/** A random URL-safe token (sent to the user) and its hash (stored). */
export const newRawToken = () => randomBytes(32).toString("hex");
export const hashToken = (raw: string) => createHash("sha256").update(raw).digest("hex");
export const looksLikeToken = (raw: string) => /^[a-f0-9]{64}$/.test(raw);
