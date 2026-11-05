import { describe, expect, it } from "vitest";
import { hashToken, looksLikeToken, newRawToken } from "./token-utils";

describe("token utils", () => {
  it("makes unique 64-hex tokens", () => {
    const a = newRawToken(), b = newRawToken();
    expect(looksLikeToken(a)).toBe(true);
    expect(a).not.toBe(b);
  });
  it("hashes deterministically and never returns the raw token", () => {
    const raw = newRawToken();
    expect(hashToken(raw)).toBe(hashToken(raw));
    expect(hashToken(raw)).not.toBe(raw);
    expect(hashToken(raw)).toHaveLength(64);
  });
  it("rejects malformed tokens", () => {
    expect(looksLikeToken("nope")).toBe(false);
    expect(looksLikeToken("g".repeat(64))).toBe(false);
  });
});
