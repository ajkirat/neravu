// Cloudflare Email Worker for Neravu "bank alert emails" (Option C).
// Cloudflare → your domain → Email → Email Routing: add a catch-all (or pay-*) rule "Send to a Worker" → this worker.
// Worker settings → Variables: NERAVU_URL = https://<your-neravu-site>, INBOUND_EMAIL_SECRET = same value as in Vercel.
export default {
  async email(message, env) {
    const raw = await new Response(message.raw).text();
    const res = await fetch(`${env.NERAVU_URL}/api/inbound/bank-email`, {
      method: "POST",
      headers: { "x-neravu-secret": env.INBOUND_EMAIL_SECRET, "x-neravu-to": message.to, "content-type": "message/rfc822" },
      body: raw,
    });
    if (!res.ok) message.setReject(`Neravu returned ${res.status}`);
  },
};
