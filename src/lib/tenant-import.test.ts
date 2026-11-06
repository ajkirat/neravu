import { describe, expect, it } from "vitest";
import { normDate, parseImportCsv, rowsFromAi, sanitizeRow } from "./tenant-import";

describe("parseImportCsv", () => {
  it("maps common column names and tidies values", () => {
    const csv = "﻿Tenant Name,Mobile,Room No,Bed,Monthly Rent,Joining Date,Advance,Balance\n" +
      'Ravi Kumar,98450 11122,101,a,"₹8,500",05/09/2026,17000,4500\n' +
      "Sita,9845011123,102,,7000,,,\n\n";
    const { rows, missing } = parseImportCsv(csv);
    expect(missing).toEqual([]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ name: "Ravi Kumar", phone: "98450 11122", room: "101", bed: "A", rent: "8500", moveIn: "2026-09-05", deposit: "17000", pending: "4500" });
    expect(rows[1]).toMatchObject({ name: "Sita", bed: "", rent: "7000", moveIn: "" });
  });
  it("reports missing must-have columns", () => {
    expect(parseImportCsv("Name,Rent\nA,1").missing).toEqual(["phone", "room"]);
  });
});

describe("normDate", () => {
  it("reads Indian and ISO dates, rejects nonsense", () => {
    expect(normDate("5/9/26")).toBe("2026-09-05");
    expect(normDate("2026-09-05")).toBe("2026-09-05");
    expect(normDate("31/02/2026")).toBe("");
    expect(normDate("next week")).toBe("");
  });
});

describe("rows from the photo reader", () => {
  it("keeps only sane values", () => {
    const rows = rowsFromAi({ rows: [{ name: "  Ravi ", phone: "9845011122", room: 101, rent: -5, due_day: 40, pending: "abc" }, { name: "", phone: "" }] });
    expect(rows).toEqual([sanitizeRow({ name: "Ravi", phone: "9845011122", room: "101" })]);
    expect(rowsFromAi("junk")).toEqual([]);
  });
});
