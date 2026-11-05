"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { syncRentCharges } from "@/lib/ledger";
import { summarizeLedger } from "@/lib/billing";
import { today } from "@/lib/dates";
import { tooMany } from "@/lib/throttle";
import type { FormState } from "@/components/action-form";

/** Public: a tenant taps "I've paid" on their pay page. The owner still confirms by recording the payment. */
export async function claimPayment(token: string, _: FormState): Promise<FormState> {
  if (!/^[a-f0-9]{32}$/.test(token)) return { error: "This link is not valid." };
  if (await tooMany("claim", 10, 60 * 60 * 1000)) return { error: "Too many attempts. Please try again later." };
  const t = await db.tenant.findUnique({
    where: { payToken: token },
    select: { id: true, ownerId: true },
  });
  if (!t) return { error: "This link is not valid." };
  await syncRentCharges(t.ownerId, t.id);
  const full = await db.tenant.findUnique({
    where: { id: t.id },
    select: { charges: { select: { amount: true, dueDate: true } }, payments: { select: { amount: true } } },
  });
  const s = summarizeLedger(full?.charges ?? [], full?.payments ?? [], today());
  if (s.outstanding <= 0) return { ok: "Nothing is pending. Thank you!", at: Date.now() };
  await db.tenant.update({ where: { id: t.id }, data: { payClaimedAt: new Date() } });
  revalidatePath("/", "layout");
  return { ok: "Thanks! The owner will confirm your payment shortly.", at: Date.now() };
}
