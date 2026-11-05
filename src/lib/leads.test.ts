import { describe, expect, it } from "vitest";
import { cleanEnquiry, followUpDue, isOpenLead } from "./leads";

const day = (s: string) => new Date(`${s}T00:00:00Z`);

describe("leads", () => {
  it("treats won and lost leads as closed", () => {
    expect(isOpenLead("NEW")).toBe(true);
    expect(isOpenLead("VISIT")).toBe(true);
    expect(isOpenLead("WON")).toBe(false);
    expect(isOpenLead("LOST")).toBe(false);
  });
  it("flags only open leads with a due follow-up", () => {
    const asOf = day("2026-11-10");
    expect(followUpDue({ status: "NEW", followUpOn: day("2026-11-10") }, asOf)).toBe(true);
    expect(followUpDue({ status: "NEW", followUpOn: day("2026-11-11") }, asOf)).toBe(false);
    expect(followUpDue({ status: "NEW", followUpOn: null }, asOf)).toBe(false);
    expect(followUpDue({ status: "WON", followUpOn: day("2026-11-01") }, asOf)).toBe(false);
  });
  it("validates and trims enquiries", () => {
    expect(cleanEnquiry({ name: " ", phone: "9876543210", note: "" })).toEqual({ error: "Please enter your name." });
    expect(cleanEnquiry({ name: "A", phone: "abc", note: "" })).toEqual({ error: "Please enter a valid phone number." });
    const ok = cleanEnquiry({ name: "  Asha ", phone: " +91 98765 43210 ", note: "x".repeat(600) });
    expect("value" in ok && ok.value.name).toBe("Asha");
    expect("value" in ok && ok.value.note.length).toBe(500);
  });
});
