import { describe, expect, it } from "vitest";
import { isBankDomain, matchCredit, readCreditAlert, readGmailForwarding } from "./bank-alert";

describe("readCreditAlert", () => {
  it("reads typical UPI credit alerts", () => {
    const a = readCreditAlert("Dear Customer, Rs.8500.37 has been credited to your account **1234 by VPA ravi.k@okhdfcbank RAVI KUMAR on 06-11-26. Your UPI transaction reference number is 412345678901. Avl Bal Rs.55,210.12");
    expect(a).toEqual({ amountPaise: 850037, utr: "412345678901", payer: "ravi.k@okhdfcbank", last4: "1234" });
    const b = readCreditAlert("Your A/c XX5678 is credited with INR 7,000.52 on 05/11/2026 by UPI Ref No 512398765432 from sita@ybl. Available balance INR 1,02,340.00");
    expect(b).toMatchObject({ amountPaise: 700052, utr: "512398765432", payer: "sita@ybl", last4: "5678" });
    const c = readCreditAlert("ICICI Bank Acct XX901 credited with ₹9,140.05 on 06-Nov-26; RAVI credited. UPI:612300011122.");
    expect(c?.amountPaise).toBe(914005);
    expect(c?.utr).toBe("612300011122");
  });
  it("ignores debits, OTPs and noise", () => {
    expect(readCreditAlert("Rs 500.00 debited from A/c XX1234 for UPI txn to shop@okaxis. Ref 412345678901")).toBeNull();
    expect(readCreditAlert("Your OTP for login is 123456")).toBeNull();
    expect(readCreditAlert("Monthly statement attached")).toBeNull();
    expect(readCreditAlert("")).toBeNull();
  });
  it("never takes the balance as the amount", () => {
    expect(readCreditAlert("Avl Bal Rs 90,000.00. Rs 8,500.37 credited to your a/c XX1234, UPI ref 412345678901")?.amountPaise).toBe(850037);
  });
});

describe("bank domains", () => {
  it("accepts bank sub-domains and nothing else", () => {
    expect(isBankDomain("alerts.hdfcbank.net")).toBe(true);
    expect(isBankDomain("sbi.co.in")).toBe(true);
    expect(isBankDomain("hdfcbank.net.evil.com")).toBe(false);
    expect(isBankDomain("gmail.com")).toBe(false);
    expect(isBankDomain("mybank.example", ["mybank.example"])).toBe(true);
  });
});

describe("matchCredit", () => {
  const ts = [{ id: "a", payCode: 37 }, { id: "b", payCode: 52 }, { id: "c", payCode: 52 }];
  it("matches only one clear paise tag", () => {
    expect(matchCredit(850037, ts)?.id).toBe("a");
    expect(matchCredit(700052, ts)).toBeNull(); // two tenants share 52
    expect(matchCredit(850000, ts)).toBeNull(); // round amount: owner decides
  });
});

describe("Gmail forwarding confirmation", () => {
  it("finds the link", () => {
    expect(readGmailForwarding("(#123) Gmail Forwarding Confirmation - Receive Mail from owner@gmail.com", "To allow, click https://mail-settings.google.com/mail/vf-abc123 Confirmation code: 98765432")).toContain("https://mail-settings.google.com/mail/vf-abc123");
    expect(readGmailForwarding("Hello", "nothing")).toBeNull();
  });
});
