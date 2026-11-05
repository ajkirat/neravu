import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ownerSelect, runForOwner } from "@/lib/auto-reminders";
import { whatsappConfigured } from "@/lib/whatsapp";

export const maxDuration = 300;

function authorised(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

/** Called once a day by Vercel Cron (see vercel.json). Vercel sends `Authorization: Bearer $CRON_SECRET`. */
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: "CRON_SECRET is not set" }, { status: 503 });
  if (!authorised(req)) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  if (!whatsappConfigured()) return NextResponse.json({ ok: true, skipped: "WhatsApp is not connected" });

  const owners = await db.owner.findMany({ where: { autoReminders: true }, select: ownerSelect });
  const results: Record<string, unknown> = {};
  let sent = 0;
  for (const o of owners) {
    try {
      const r = await runForOwner(o);
      sent += r.sent;
      results[o.id] = r;
    } catch (e) {
      console.error("Auto reminders failed for one owner:", (e as Error).message);
      results[o.id] = { error: "failed" };
    }
  }
  return NextResponse.json({ ok: true, owners: owners.length, sent });
}
