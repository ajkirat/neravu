import "server-only";

// Each owner uses their OWN Razorpay account, so money goes straight to them, never through Neravu.
const base = () => process.env.RAZORPAY_API_BASE ?? "https://api.razorpay.com";
const basic = (id: string, secret: string) => "Basic " + Buffer.from(`${id}:${secret}`).toString("base64");

export class RazorpayError extends Error {
  constructor(public code: "auth" | "failed") {
    super(code);
  }
}

async function call(path: string, creds: { keyId: string; keySecret: string }, init?: RequestInit) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 15_000);
  try {
    return await fetch(`${base()}${path}`, {
      ...init,
      signal: ctl.signal,
      headers: { Authorization: basic(creds.keyId, creds.keySecret), "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
  } catch {
    throw new RazorpayError("failed");
  } finally {
    clearTimeout(timer);
  }
}

/** Live check that the keys really belong to a working Razorpay account. */
export async function testCredentials(creds: { keyId: string; keySecret: string }): Promise<"ok" | "auth" | "failed"> {
  try {
    const res = await call("/v1/payment_links?count=1", creds);
    if (res.ok) return "ok";
    return res.status === 401 || res.status === 403 ? "auth" : "failed";
  } catch {
    return "failed";
  }
}

/** One-off payment link for a fixed amount. `notes.tenantId` comes back on the webhook. */
export async function createPaymentLink(
  creds: { keyId: string; keySecret: string },
  o: { amountRupees: number; tenantId: string; name: string; phone: string; description: string; callbackUrl: string },
): Promise<{ url: string }> {
  const digits = o.phone.replace(/\D/g, "");
  const res = await call("/v1/payment_links", creds, {
    method: "POST",
    body: JSON.stringify({
      amount: o.amountRupees * 100,
      currency: "INR",
      accept_partial: false,
      reference_id: `nv_${o.tenantId.slice(0, 20)}_${Date.now().toString(36)}`,
      description: o.description.slice(0, 250),
      customer: { name: o.name.slice(0, 100), ...(digits.length >= 10 ? { contact: digits.length === 10 ? `+91${digits}` : `+${digits}` } : {}) },
      notify: { sms: false, email: false },
      reminder_enable: false,
      notes: { tenantId: o.tenantId },
      callback_url: o.callbackUrl,
      callback_method: "get",
    }),
  });
  if (res.status === 401 || res.status === 403) throw new RazorpayError("auth");
  if (!res.ok) throw new RazorpayError("failed");
  const json = (await res.json()) as { short_url?: unknown };
  const url = json.short_url;
  // Only https links are sent to tenants (a test server may use http when RAZORPAY_API_BASE is overridden).
  const allowed = typeof url === "string" && (url.startsWith("https://") || (!!process.env.RAZORPAY_API_BASE && url.startsWith(process.env.RAZORPAY_API_BASE)));
  if (typeof url !== "string" || !allowed) throw new RazorpayError("failed");
  return { url };
}
