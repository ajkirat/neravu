import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "./csv";

describe("csvCell", () => {
  it("writes plain text and numbers as they are", () => {
    expect(csvCell("Asha")).toBe("Asha");
    expect(csvCell(8500)).toBe("8500");
    expect(csvCell(-300)).toBe("-300");
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
  });
  it("quotes commas, quotes and new lines", () => {
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell("line1\nline2")).toBe('"line1\nline2"');
  });
  it("defuses spreadsheet formulas in text", () => {
    expect(csvCell("=HYPERLINK(\"http://evil\")")).toBe('"\'=HYPERLINK(""http://evil"")"');
    expect(csvCell("+91 98765 43210")).toBe("'+91 98765 43210");
    expect(csvCell("@cmd")).toBe("'@cmd");
    expect(csvCell("-5 deposit")).toBe("'-5 deposit");
  });
  it("writes dates as yyyy-mm-dd and keeps Kannada and Telugu intact", () => {
    expect(csvCell(new Date("2026-11-05T00:00:00Z"))).toBe("2026-11-05");
    expect(csvCell("ಹಾಲು, తెలుగు")).toBe('"ಹಾಲು, తెలుగు"');
  });
});

describe("toCsv", () => {
  it("adds a byte-order mark, a header and CRLF line ends", () => {
    const out = toCsv(["Name", "Amount"], [["Asha", 100], ["B, C", -50]]);
    expect(out.startsWith("﻿")).toBe(true);
    expect(out).toBe('﻿Name,Amount\r\nAsha,100\r\n"B, C",-50\r\n');
  });
});
