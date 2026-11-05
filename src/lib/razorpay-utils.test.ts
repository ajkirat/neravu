import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { mapMethod, parsePaidEvent, verifySignature } from "./razorpay-utils";

const sign = (body: string, secret: string) => createHmac("sha256", secret).update(body).digest("hex");

describe("verifySignature", () => {
  it("accepts a correct signature and rejects everything else", () => {
    const body = '{"event":"payment_link.paid"}';
    expect(verifySignature(body, sign(body, "s3cret"), "s3cret")).toBe(true);
    expect(verifySignature(body, sign(body, "other"), "s3cret")).toBe(false);
    expect(verifySignature(body + " ", sign(body, "s3cret"), "s3cret")).toBe(false);
    expect(verifySignature(body, null, "s3cret")).toBe(false);
    expect(verifySignature(body, "abc", "s3cret")).toBe(false);
    expect(verifySignature(body, sign(body, ""), "")).toBe(false);
  });
});

describe("parsePaidEvent", () => {
  const ok = (over: object = {}) => ({
    event: "payment_link.paid",
    payload: {
      payment_link: { entity: { notes: { tenantId: "ten_1" } } },
      payment: { entity: { id: "pay_ABC123", amount: 850050, method: "upi" } },
    },
    ...over,
  });
  it("reads a paid event", () => {
    expect(parsePaidEvent(ok())).toEqual({ paymentId: "pay_ABC123", tenantId: "ten_1", amountRupees: 8501, method: "UPI" });
  });
  it("ignores other events and malformed payloads", () => {
    expect(parsePaidEvent(ok({ event: "payment.failed" }))).toBeNull();
    expect(parsePaidEvent(null)).toBeNull();
    expect(parsePaidEvent({})).toBeNull();
    expect(parsePaidEvent(ok({ payload: { payment: { entity: { id: "pay_X", amount: 100 } } } }))).toBeNull();
    expect(parsePaidEvent({ event: "payment_link.paid", payload: { payment: { entity: { id: "bad id", amount: 100 } }, payment_link: { entity: { notes: { tenantId: "t" } } } } })).toBeNull();
    expect(parsePaidEvent({ event: "payment_link.paid", payload: { payment: { entity: { id: "pay_1", amount: -5 } }, payment_link: { entity: { notes: { tenantId: "t" } } } } })).toBeNull();
  });
});

describe("mapMethod", () => {
  it("maps Razorpay methods", () => {
    expect(mapMethod("upi")).toBe("UPI");
    expect(mapMethod("card")).toBe("CARD");
    expect(mapMethod("netbanking")).toBe("BANK");
    expect(mapMethod("wallet")).toBe("OTHER");
    expect(mapMethod(undefined)).toBe("OTHER");
  });
});
