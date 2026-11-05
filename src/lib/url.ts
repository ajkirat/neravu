import "server-only";
import { headers } from "next/headers";

/** The public origin of this deployment, used in links sent to tenants. */
export async function appOrigin(): Promise<string> {
  const fixed = process.env.APP_URL;
  if (fixed) return fixed.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
