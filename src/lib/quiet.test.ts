import { describe, expect, it } from "vitest";
import { isQuietHours } from "./dates";

describe("isQuietHours", () => {
  it("is quiet at night in India and not in the day", () => {
    expect(isQuietHours(new Date("2026-11-06T16:00:00Z"), "Asia/Kolkata")).toBe(true); // 21:30 IST
    expect(isQuietHours(new Date("2026-11-06T01:00:00Z"), "Asia/Kolkata")).toBe(true); // 06:30 IST
    expect(isQuietHours(new Date("2026-11-06T03:30:00Z"), "Asia/Kolkata")).toBe(false); // 09:00 IST
  });
});
