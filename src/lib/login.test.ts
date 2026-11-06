import { describe, expect, it } from "vitest";
import { nameMatches } from "./login";
import { normPhone } from "./phone";

describe("sign-in name check", () => {
  it("accepts the full name or first name, any case and spacing", () => {
    for (const n of ["Lakshmi Rao", "lakshmi rao", "LAKSHMI   RAO ", "Lakshmi", " lakshmi"]) expect(nameMatches(n, "Lakshmi Rao")).toBe(true);
    expect(nameMatches("ramesh", "Ramesh")).toBe(true);
    expect(nameMatches("K. Suresh", "K Suresh")).toBe(true);
  });
  it("rejects other names, parts of a word and blanks", () => {
    expect(nameMatches("Rao", "Lakshmi Rao")).toBe(false);
    expect(nameMatches("Lak", "Lakshmi Rao")).toBe(false);
    expect(nameMatches("Suresh", "Ramesh")).toBe(false);
    expect(nameMatches("", "Ramesh")).toBe(false);
    expect(nameMatches("  ", "Ramesh")).toBe(false);
  });
  it("matches mobile numbers on their last 10 digits", () => {
    expect(normPhone("+91 98765 43210")).toBe("9876543210");
    expect(normPhone("09876543210")).toBe("9876543210");
    expect(normPhone("12345")).toBeNull();
  });
});
