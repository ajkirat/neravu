import { describe, expect, it } from "vitest";
import { normalizeIdNumber, signIdRead, verifyIdRead } from "./id-number";

describe("ID numbers read from photos", () => {
  it("formats Aadhaar, including masked ones, and rejects wrong lengths", () => {
    expect(normalizeIdNumber("Aadhaar", "1234 5678 9012")).toBe("1234 5678 9012");
    expect(normalizeIdNumber("Aadhaar", "123456789012")).toBe("1234 5678 9012");
    expect(normalizeIdNumber("Aadhaar", "xxxx xxxx 9012")).toBe("XXXX XXXX 9012");
    expect(normalizeIdNumber("Aadhaar", "1234 5678")).toBeNull();
  });
  it("checks PAN, passport and voter ID shapes", () => {
    expect(normalizeIdNumber("PAN", "abcde1234f")).toBe("ABCDE1234F");
    expect(normalizeIdNumber("PAN", "ABCDE12345")).toBeNull();
    expect(normalizeIdNumber("Passport", "K1234567")).toBe("K1234567");
    expect(normalizeIdNumber("Voter ID", "ABC1234567")).toBe("ABC1234567");
    expect(normalizeIdNumber("Driving licence", "KA01 20190012345")).toBe("KA0120190012345");
    expect(normalizeIdNumber("Driving licence", "")).toBeNull();
  });
  it("signs what was read so it cannot be changed on the way", () => {
    const sig = signIdRead("abc", "Aadhaar", "1234 5678 9012");
    expect(verifyIdRead("abc", "Aadhaar", "1234 5678 9012", sig)).toBe(true);
    expect(verifyIdRead("abc", "Aadhaar", "1111 5678 9012", sig)).toBe(false);
    expect(verifyIdRead("other-photo", "Aadhaar", "1234 5678 9012", sig)).toBe(false);
    expect(verifyIdRead("abc", "Aadhaar", "1234 5678 9012", "nonsense")).toBe(false);
  });
});
