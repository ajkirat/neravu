import { describe, expect, it } from "vitest";
import { isValidUpiId, upiLink } from "./upi";

describe("upi", () => {
  it("validates UPI ids", () => {
    expect(isValidUpiId("lakshmi@okhdfcbank")).toBe(true);
    expect(isValidUpiId("9876500000@ybl")).toBe(true);
    expect(isValidUpiId("no-at-sign")).toBe(false);
    expect(isValidUpiId("a@b")).toBe(false);
    expect(isValidUpiId("bad id@bank")).toBe(false);
  });
  it("builds a upi:// link with encoded fields", () => {
    const link = upiLink({ upiId: "a.b@okaxis", name: "Sunrise PG", amount: 7500, note: "Rent Nov 2026" });
    expect(link).toBe("upi://pay?pa=a.b%40okaxis&pn=Sunrise%20PG&am=7500&cu=INR&tn=Rent%20Nov%202026");
  });
});
