import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { jpegsToPdf } from "./pdf";

describe("jpegsToPdf", () => {
  it("writes a well-formed PDF with one page per picture and a correct cross-reference table", async () => {
    const jpeg = await sharp({ create: { width: 120, height: 170, channels: 3, background: "#0f6b62" } }).jpeg().toBuffer();
    const pdf = jpegsToPdf([{ jpeg, width: 120, height: 170 }, { jpeg, width: 120, height: 170 }], "Test (report)");
    const text = pdf.toString("binary");
    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text.trimEnd().endsWith("%%EOF")).toBe(true);
    expect(text).toContain("/Count 2");
    // every xref offset points at the start of its object
    const start = Number(/startxref\n(\d+)/.exec(text)![1]);
    const rows = text.slice(start).split("\n").slice(3).filter((l) => / 00000 n $/.test(l));
    rows.forEach((row, i) => expect(text.slice(Number(row.slice(0, 10)), Number(row.slice(0, 10)) + 12)).toMatch(new RegExp(`^${i + 1} 0 obj`)));
  });
});
