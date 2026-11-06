import { describe, expect, it } from "vitest";
import { formatWaNumber, waNumber } from "./whatsapp-utils";

describe("formatWaNumber", () => {
  it("formats Indian, US test and other numbers", () => {
    expect(formatWaNumber("916363462003")).toBe("+91 63634 62003");
    expect(formatWaNumber("6363462003")).toBe("+91 63634 62003");
    expect(formatWaNumber("+1 (555) 147-2730")).toBe("+1 555 147 2730");
    expect(formatWaNumber("447700900123")).toBe("+447700900123");
  });
});

describe("waNumber", () => {
  it("adds 91 to 10-digit mobiles", () => {
    expect(waNumber("98450 11122")).toBe("919845011122");
    expect(waNumber("12")).toBeNull();
  });
});
