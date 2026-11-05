import "server-only";
import { headers } from "next/headers";

// In-memory, per server instance: slows bursts on public endpoints; not a hard guarantee on serverless.
const hits = new Map<string, number[]>();

export async function tooMany(bucket: string, max: number, windowMs: number): Promise<boolean> {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear();
  return false;
}
