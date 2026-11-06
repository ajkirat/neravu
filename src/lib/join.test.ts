import { describe, expect, it } from "vitest";
import { cleanJoin, phoneKey } from "./join";

const ok = {
  name: " Ravi Kumar ",
  phone: "98450 11122",
  email: "",
  occupation: "Student",
  idType: "Aadhaar",
  idNumber: " 1234 5678 9012 ",
  emergencyName: "",
  emergencyPhone: "",
  language: "kn",
};

describe("cleanJoin", () => {
  it("trims and normalises a good form", () => {
    const r = cleanJoin(ok);
    expect("value" in r && r.value).toMatchObject({ name: "Ravi Kumar", idNumber: "1234 5678 9012", email: null, language: "kn" });
  });
  it("rejects bad input with message keys", () => {
    expect(cleanJoin({ ...ok, name: "R" })).toEqual({ error: "errJoinName" });
    expect(cleanJoin({ ...ok, phone: "12345" })).toEqual({ error: "errJoinPhone" });
    expect(cleanJoin({ ...ok, email: "nope" })).toEqual({ error: "errJoinEmail" });
    expect(cleanJoin({ ...ok, idNumber: "  " })).toEqual({ error: "errJoinId" });
  });
  it("ignores unknown id types and languages", () => {
    const r = cleanJoin({ ...ok, idType: "Hacker", language: "xx" });
    expect("value" in r && r.value).toMatchObject({ idType: null, language: null });
  });
});

describe("phoneKey", () => {
  it("matches with or without country code", () => {
    expect(phoneKey("+91 98450-11122")).toBe(phoneKey("9845011122"));
  });
});
