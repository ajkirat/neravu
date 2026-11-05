import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "./secrets";

describe("secrets", () => {
  it("round-trips and never stores the plaintext", () => {
    const enc = encryptSecret("rzp_secret_abc123");
    expect(enc).not.toContain("rzp_secret_abc123");
    expect(enc.startsWith("v1:")).toBe(true);
    expect(decryptSecret(enc)).toBe("rzp_secret_abc123");
  });
  it("uses a fresh nonce each time", () => {
    expect(encryptSecret("same")).not.toBe(encryptSecret("same"));
  });
  it("returns null for tampered, malformed or empty values", () => {
    const enc = encryptSecret("hello");
    const parts = enc.split(":");
    expect(decryptSecret([parts[0], parts[1], parts[2], Buffer.from("xx").toString("base64")].join(":"))).toBeNull();
    expect(decryptSecret("garbage")).toBeNull();
    expect(decryptSecret(null)).toBeNull();
    expect(decryptSecret("")).toBeNull();
  });
  it("cannot be read with a different key", () => {
    const enc = encryptSecret("hello");
    const old = process.env.ENCRYPTION_KEY;
    process.env.ENCRYPTION_KEY = "a-completely-different-key-value";
    expect(decryptSecret(enc)).toBeNull();
    if (old === undefined) delete process.env.ENCRYPTION_KEY; else process.env.ENCRYPTION_KEY = old;
  });
});
