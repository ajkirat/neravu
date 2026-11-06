import { after } from "next/server";
import { sendPaymentReceipt } from "@/lib/payment-receipt";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parsePaidEvent, verifySignature } from "@/lib/razorpay-utils";
import { decryptSecret } from "@/lib/secrets";
import { today } from "@/lib/dates";

/**
 * Razorpay calls this when a tenant pays a payment link. The owner puts this URL and a secret in their
 * own Razorpay dashboard. We only trust the call if the HMAC signature matches that owner's secret.
 */
export async function POST(req: Request, { params }: { params: Promise<{ ownerId: string }> }) {
  const { ownerId } = await params;
  const raw = await req.text();
  if (raw.length > 100_000) return NextResponse.json({ error: "big" }, { status: 413 });

  const owner = await db.owner.findUnique({
    where: { id: ownerId },
    select: { id: true, razorpayEnabled: true, razorpayWebhookSecretEnc: true },
  });
  const secret = owner?.razorpayEnabled ? decryptSecret(owner.razorpayWebhookSecretEnc) : null;
  if (!owner || !secret) return NextResponse.json({ error: "not configured" }, { status: 404 });
  if (!verifySignature(raw, req.headers.get("x-razorpay-signature"), secret)) {
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const paid = parsePaidEvent(body);
  if (!paid) return NextResponse.json({ ok: true, ignored: true }); // other events: acknowledge, do nothing

  // The payment must be for one of THIS owner's tenants.
  const tenant = await db.tenant.findFirst({ where: { id: paid.tenantId, ownerId: owner.id }, select: { id: true } });
  if (!tenant) return NextResponse.json({ ok: true, ignored: true });

  try {
    const created = await db.payment.create({
      data: {
        tenantId: tenant.id,
        amount: paid.amountRupees,
        paidOn: today(),
        method: paid.method,
        reference: paid.paymentId,
        note: "Razorpay",
        externalId: `rzp:${paid.paymentId}`,
      },
    });
    await db.tenant.update({ where: { id: tenant.id }, data: { payClaimedAt: null } });
    after(() => sendPaymentReceipt(created.id));
  } catch (e) {
    // A replayed webhook hits the unique externalId: that is fine, it was already recorded.
    if ((e as { code?: string }).code !== "P2002") throw e;
  }
  return NextResponse.json({ ok: true });
}
