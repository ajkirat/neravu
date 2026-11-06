import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { dkimSign } from "mailauth";
import { checkEmail, isGenuineBankEmail } from "./bank-email";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 1024 });
const pub = publicKey.export({ type: "spki", format: "der" }).toString("base64");
const resolver = async (name: string, rr: string) => {
  if (rr === "TXT" && name === "s1._domainkey.alerts.hdfcbank.net") return [[`v=DKIM1; k=rsa; p=${pub}`]];
  const e = new Error("not found") as Error & { code: string };
  e.code = "ENOTFOUND";
  throw e;
};

const message = (from: string, body: string) =>
  [`From: HDFC Bank <${from}>`, "To: pay-abc@in.neravu.app", "Subject: Credit alert", "Message-ID: <m1@alerts.hdfcbank.net>", "Date: Fri, 06 Nov 2026 10:42:00 +0530", "Content-Type: text/plain; charset=utf-8", "", body, ""].join("\r\n");

async function signed(raw: string, domain = "alerts.hdfcbank.net") {
  const r = await dkimSign(raw, { signatureData: [{ signingDomain: domain, selector: "s1", privateKey: privateKey.export({ type: "pkcs1", format: "pem" }).toString(), canonicalization: "relaxed/relaxed" }] } as never);
  return r.signatures + raw;
}

describe("checkEmail", () => {
  it("accepts a correctly signed bank alert", async () => {
    const raw = await signed(message("alerts@alerts.hdfcbank.net", "Rs.8500.37 credited to a/c **1234 UPI ref 412345678901"));
    const e = await checkEmail(raw, resolver);
    expect(e.signedBy).toBe("alerts.hdfcbank.net");
    expect(isGenuineBankEmail(e)).toBe(true);
    expect(e.text).toContain("8500.37");
  });
  it("rejects a tampered amount", async () => {
    const raw = (await signed(message("alerts@alerts.hdfcbank.net", "Rs.8500.37 credited to a/c **1234"))).replace("8500.37", "9500.37");
    expect(isGenuineBankEmail(await checkEmail(raw, resolver))).toBe(false);
  });
  it("rejects an unsigned email that only claims to be from the bank", async () => {
    const raw = message("alerts@alerts.hdfcbank.net", "Rs.8500.37 credited");
    expect(isGenuineBankEmail(await checkEmail(raw, resolver))).toBe(false);
  });
});
