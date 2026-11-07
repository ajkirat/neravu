import { describe, expect, it } from "vitest";
import { cleanJoin, phoneKey } from "./join";

const ok = {
  name: " Ravi Kumar ",
  phone: "98450 11122",
  email: "",
  occupation: "Student",
  emergencyName: "",
  emergencyPhone: "",
  language: "kn",
};

describe("cleanJoin", () => {
  it("trims and normalises a good form", () => {
    const r = cleanJoin(ok);
    expect("value" in r && r.value).toMatchObject({ name: "Ravi Kumar", email: null, language: "kn" });
    // The ID is never typed: it comes from the photo, not from this form.
    expect("value" in r && "idNumber" in r.value).toBe(false);
  });
  it("rejects bad input with message keys", () => {
    expect(cleanJoin({ ...ok, name: "R" })).toEqual({ error: "errJoinName" });
    expect(cleanJoin({ ...ok, phone: "12345" })).toEqual({ error: "errJoinPhone" });
    expect(cleanJoin({ ...ok, email: "nope" })).toEqual({ error: "errJoinEmail" });
  });
  it("ignores unknown languages", () => {
    const r = cleanJoin({ ...ok, language: "xx" });
    expect("value" in r && r.value).toMatchObject({ language: null });
  });
});

describe("phoneKey", () => {
  it("matches with or without country code", () => {
    expect(phoneKey("+91 98450-11122")).toBe(phoneKey("9845011122"));
  });
});
