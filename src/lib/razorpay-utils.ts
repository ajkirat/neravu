import { createHmac, timingSafeEqual } from "node:crypto";

/** Razorpay signs the raw webhook body with HMAC-SHA256 using the webhook secret. */
export function verifySignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature || !secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature.trim());
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Razorpay's payment method -> the methods Neravu records. */
export function mapMethod(method: unknown): "UPI" | "CARD" | "BANK" | "OTHER" {
  switch (method) {
    case "upi":
      return "UPI";
    case "card":
      return "CARD";
    case "netbanking":
      return "BANK";
    default:
      return "OTHER";
  }
}

export type PaidEvent = { paymentId: string; tenantId: string; amountRupees: number; method: "UPI" | "CARD" | "BANK" | "OTHER" };

/** Pull what we need out of a `payment_link.paid` webhook. Returns null for anything else or anything malformed. */
export function parsePaidEvent(body: unknown): PaidEvent | null {
  const b = body as {
    event?: unknown;
    payload?: { payment?: { entity?: Record<string, unknown> }; payment_link?: { entity?: Record<string, unknown> } };
  };
  if (!b || b.event !== "payment_link.paid") return null;
  const pay = b.payload?.payment?.entity;
  const link = b.payload?.payment_link?.entity;
  const paymentId = typeof pay?.id === "string" ? pay.id : null;
  const paise = typeof pay?.amount === "number" ? pay.amount : null;
  const notes = (link?.notes ?? pay?.notes) as Record<string, unknown> | undefined;
  const tenantId = typeof notes?.tenantId === "string" ? notes.tenantId : null;
  if (!paymentId || !/^pay_[A-Za-z0-9]+$/.test(paymentId) || paise === null || !tenantId) return null;
  if (!Number.isFinite(paise) || paise <= 0 || paise > 10_000_000_00) return null;
  return { paymentId, tenantId, amountRupees: Math.round(paise / 100), method: mapMethod(pay?.method) };
}
