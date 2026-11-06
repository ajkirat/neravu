import { timingSafeEqual } from "node:crypto";
import { handleBankEmail } from "@/lib/bank-inbox";

export const maxDuration = 30;

/**
 * Bank alert emails forwarded from an owner's mailbox arrive here as raw email (Option C), sent by the
 * small email worker described in the README. Protected by INBOUND_EMAIL_SECRET; each email is then
 * checked for a genuine bank signature before anything is recorded.
 */
export async function POST(req: Request) {
  const secret = process.env.INBOUND_EMAIL_SECRET;
  const given = req.headers.get("x-neravu-secret") ?? "";
  if (!secret || given.length !== secret.length || !timingSafeEqual(Buffer.from(given), Buffer.from(secret))) {
    return new Response("Forbidden", { status: 403 });
  }
  const raw = await req.text();
  if (!raw || raw.length > 2_000_000) return new Response("Bad email", { status: 400 });
  const to = req.headers.get("x-neravu-to") ?? "";
  try {
    const r = await handleBankEmail(raw, to);
    console.log(`Bank email: ${r.result}`);
    return Response.json({ ok: true, result: r.result });
  } catch (e) {
    console.error("Bank email failed:", (e as Error).message);
    return new Response("Error", { status: 500 });
  }
}
