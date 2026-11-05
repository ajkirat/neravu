import "server-only";
import { db } from "./db";
import { hashToken, looksLikeToken, newRawToken } from "./token-utils";

export type TokenKind = "RESET" | "VERIFY";
export const TTL_MS: Record<TokenKind, number> = { RESET: 60 * 60 * 1000, VERIFY: 3 * 24 * 60 * 60 * 1000 };

/** Create a one-time token for an owner. Returns the raw value to put in the emailed link. */
export async function createToken(ownerId: string, kind: TokenKind): Promise<string> {
  const raw = newRawToken();
  await db.authToken.create({
    data: { ownerId, kind, tokenHash: hashToken(raw), expiresAt: new Date(Date.now() + TTL_MS[kind]) },
  });
  return raw;
}

/** Is this token valid right now? Does not use it up. */
export async function peekToken(raw: string, kind: TokenKind): Promise<{ ownerId: string } | null> {
  if (!looksLikeToken(raw)) return null;
  const t = await db.authToken.findUnique({ where: { tokenHash: hashToken(raw) } });
  if (!t || t.kind !== kind || t.usedAt || t.expiresAt <= new Date()) return null;
  return { ownerId: t.ownerId };
}

/** Use a token up. Returns the owner id once, then null for any later attempt. */
export async function consumeToken(raw: string, kind: TokenKind): Promise<string | null> {
  const found = await peekToken(raw, kind);
  if (!found) return null;
  const res = await db.authToken.updateMany({
    where: { tokenHash: hashToken(raw), usedAt: null },
    data: { usedAt: new Date() },
  });
  return res.count === 1 ? found.ownerId : null;
}
