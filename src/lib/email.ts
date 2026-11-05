import "server-only";

export const emailEnabled = () => !!process.env.RESEND_API_KEY && !!process.env.EMAIL_FROM;

/**
 * Send a plain-text email through Resend. Returns false (and never throws) when email is not
 * configured or the provider rejects it. With no provider in development, the message is logged.
 */
export async function sendEmail(opts: { to: string; subject: string; text: string }): Promise<boolean> {
  if (!emailEnabled()) {
    if (process.env.NODE_ENV !== "production") console.log(`[email not configured] to=${opts.to}\n${opts.subject}\n${opts.text}`);
    return false;
  }
  try {
    const res = await fetch(`${process.env.RESEND_API_BASE ?? "https://api.resend.com"}/emails`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [opts.to], subject: opts.subject, text: opts.text }),
    });
    if (!res.ok) console.error(`Email provider returned ${res.status}`);
    return res.ok;
  } catch (e) {
    console.error("Email send failed:", (e as Error).message);
    return false;
  }
}
