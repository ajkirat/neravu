import { describe, expect, it } from "vitest";
import { pickPayCode, taggedAmount, taggedRupees } from "./paycode";

describe("pay codes", () => {
  it("picks the lowest free code", () => {
    expect(pickPayCode([])).toBe(1);
    expect(pickPayCode([1, 2, null, 4])).toBe(3);
    expect(pickPayCode(Array.from({ length: 99 }, (_, i) => i + 1))).toBeNull();
  });
  it("formats the tagged amount", () => {
    expect(taggedAmount(8500, 37)).toBe("8500.37");
    expect(taggedAmount(8500, 5)).toBe("8500.05");
    expect(taggedAmount(8500, null)).toBe("8500.00");
    expect(taggedRupees(18500, 7)).toBe("₹18,500.07");
  });
});
