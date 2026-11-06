import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { billAmount, parseButton, parseWebhook, replyIntent, verifySignature } from "./wa-inbound";

const hook = (messages: unknown[]) => ({
  object: "whatsapp_business_account",
  entry: [{ changes: [{ value: { contacts: [{ wa_id: "919845011122", profile: { name: "Ramesh" } }], messages } }] }],
});

describe("parseWebhook", () => {
  it("reads image, button and text messages with the sender's name", () => {
    const got = parseWebhook(
      hook([
        { id: "a", from: "919845011122", type: "image", image: { id: "m1", mime_type: "image/jpeg" } },
        { id: "b", from: "919845011122", type: "interactive", interactive: { type: "button_reply", button_reply: { id: "exp_yes_abcdefghij12", title: "Yes" } } },
        { id: "c", from: "919845011122", type: "text", text: { body: "ಹೌದು" } },
        { id: "d", from: "919845011122", type: "sticker" },
      ]),
    );
    expect(got.map((g) => g.kind)).toEqual(["image", "button", "text", "other"]);
    expect(got[0]).toMatchObject({ mediaId: "m1", mime: "image/jpeg", name: "Ramesh", from: "919845011122" });
    expect(got[1].buttonId).toBe("exp_yes_abcdefghij12");
  });
  it("ignores delivery statuses and garbage", () => {
    expect(parseWebhook({ entry: [{ changes: [{ value: { statuses: [{ id: "x" }] } }] }] })).toEqual([]);
    expect(parseWebhook(null)).toEqual([]);
    expect(parseWebhook(hook([{ id: "x", from: "12", type: "text" }]))).toEqual([]);
  });
});

describe("replyIntent", () => {
  it("understands yes and no in several languages", () => {
    for (const y of ["Yes", "yes!", "ok", "haan", "ಹೌದು", "అవును", "👍"]) expect(replyIntent(y), y).toBe("yes");
    for (const n of ["No", "illa", "ಇಲ್ಲ", "వద్దు", "👎"]) expect(replyIntent(n), n).toBe("no");
    expect(replyIntent("what is this")).toBeNull();
    expect(replyIntent(undefined)).toBeNull();
  });
});

describe("parseButton", () => {
  it("accepts our ids only", () => {
    expect(parseButton("exp_no_abcdefghij12")).toEqual({ answer: "no", pendingId: "abcdefghij12" });
    expect(parseButton("exp_yes_../../x")).toBeNull();
    expect(parseButton(undefined)).toBeNull();
  });
});

describe("billAmount", () => {
  it("prefers the printed total, else adds the lines", () => {
    expect(billAmount({ total: 1240, items: [{ name: "a", quantity: 1, amount: 1000 }] })).toBe(1240);
    expect(billAmount({ total: null, items: [{ name: "a", quantity: 1, amount: 100 }, { name: "b", quantity: 2, amount: 50 }] })).toBe(150);
  });
});

describe("verifySignature", () => {
  it("accepts Meta's signature and rejects anything else", () => {
    const body = '{"a":1}';
    const sig = "sha256=" + createHmac("sha256", "s3cret").update(body).digest("hex");
    expect(verifySignature(body, sig, "s3cret")).toBe(true);
    expect(verifySignature(body + " ", sig, "s3cret")).toBe(false);
    expect(verifySignature(body, sig, "other")).toBe(false);
    expect(verifySignature(body, null, "s3cret")).toBe(false);
    expect(verifySignature(body, "sha256=zz", "s3cret")).toBe(false);
  });
});
