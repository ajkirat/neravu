import { describe, expect, it } from "vitest";
import { payLinksOn } from "./pay-mode";

describe("payLinksOn", () => {
  it("is on for UPI only with a UPI ID", () => {
    expect(payLinksOn({ paymentMode: "UPI", upiId: "a@b", razorpayEnabled: false })).toBe(true);
    expect(payLinksOn({ paymentMode: "UPI", upiId: null, razorpayEnabled: true })).toBe(false);
  });
  it("is on for Razorpay only when it was set up and verified", () => {
    expect(payLinksOn({ paymentMode: "RAZORPAY", upiId: null, razorpayEnabled: true })).toBe(true);
    expect(payLinksOn({ paymentMode: "RAZORPAY", upiId: "a@b", razorpayEnabled: false })).toBe(false);
  });
  it("is always off when the owner collects payments themselves", () => {
    expect(payLinksOn({ paymentMode: "NONE", upiId: "a@b", razorpayEnabled: true })).toBe(false);
  });
});
