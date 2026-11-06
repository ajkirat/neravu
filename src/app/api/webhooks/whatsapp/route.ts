import { handleInbound } from "@/lib/wa-bills";
import { parseWebhook, verifySignature } from "@/lib/wa-inbound";

// Reading a bill can take ~30 seconds.
export const maxDuration = 60;

/** Meta calls this once when you connect the webhook, to check the verify token. */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const token = process.env.WHATSAPP_VERIFY_TOKEN;
  if (token && u.searchParams.get("hub.mode") === "subscribe" && u.searchParams.get("hub.verify_token") === token) {
    return new Response(u.searchParams.get("hub.challenge") ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

/** Incoming WhatsApp messages: bill photos and Yes/No answers from caretakers and owners. */
export async function POST(req: Request) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) {
    console.error("WhatsApp webhook: WHATSAPP_APP_SECRET is not set, ignoring message");
    return new Response("Not configured", { status: 503 });
  }
  const raw = await req.text();
  if (raw.length > 512 * 1024 || !verifySignature(raw, req.headers.get("x-hub-signature-256"), secret)) {
    return new Response("Bad signature", { status: 401 });
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }
  const messages = parseWebhook(body).slice(0, 20);
  console.log(`WhatsApp webhook: ${messages.length} message(s): ${messages.map((m) => m.kind).join(", ") || "none"}`);
  // Handled before answering Meta, not in the background: background work is not reliable on Vercel.
  // If it takes long, Meta may resend; each message id is only processed once.
  for (const m of messages) {
    try {
      await handleInbound(m);
    } catch (e) {
      console.error("WhatsApp webhook: failed to handle a message:", (e as Error).message);
    }
  }
  return new Response("OK", { status: 200 });
}
