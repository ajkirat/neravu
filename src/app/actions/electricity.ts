"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { today } from "@/lib/dates";
import { amountFromReadings, electricityDescription, periodSpan, splitByDays, stayDays } from "@/lib/electricity";
import { getT } from "@/lib/i18n/server";
import type { FormState } from "@/components/action-form";

const num = (fd: FormData, key: string): number | null => {
  const raw = String(fd.get(key) ?? "").replace(/[,₹\s]/g, "");
  if (raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

/** Everyone who had a bed in this room, with the days they stayed in the month. */
async function stayers(ownerId: string, roomId: string, period: string) {
  const tenants = await db.tenant.findMany({
    where: { ownerId, bed: { roomId } },
    select: { id: true, name: true, moveInDate: true, moveOutDate: true },
  });
  return tenants.map((t) => ({ id: t.id, name: t.name, days: stayDays({ id: t.id, moveIn: t.moveInDate, moveOut: t.moveOutDate }, period) }));
}

async function ownedRoom(ownerId: string, roomId: string) {
  return db.room.findFirst({ where: { id: roomId, property: { ownerId } }, select: { id: true, number: true, propertyId: true } });
}

export async function saveBill(roomId: string, period: string, _: FormState, fd: FormData): Promise<FormState> {
  const owner = await requireOwner();
  const { t } = await getT();
  const room = await ownedRoom(owner.id, roomId);
  if (!room || !periodSpan(period)) return { error: t("errPropertyNotFound") };
  const prev = num(fd, "prev");
  const curr = num(fd, "curr");
  const rate = num(fd, "rate");
  if (prev !== null && curr !== null && curr < prev) return { error: t("elecBadReadings") };
  const typed = num(fd, "amount");
  const amount = typed !== null ? Math.round(typed) : amountFromReadings(prev, curr, rate);
  if (amount === null || amount <= 0) return { error: t("elecNeedAmount") };
  const existing = await db.electricityBill.findUnique({ where: { roomId_period: { roomId, period } } });
  if (existing?.appliedAt) return { error: t("elecAlreadyApplied") };
  await db.electricityBill.upsert({
    where: { roomId_period: { roomId, period } },
    create: { ownerId: owner.id, roomId, period, prevReading: prev, currReading: curr, rate, amount },
    update: { prevReading: prev, currReading: curr, rate, amount },
  });
  revalidatePath("/electricity");
  return { ok: t("elecSaved"), at: Date.now() };
}

async function applyOne(ownerId: string, billId: string): Promise<{ people: number } | { error: "applied" | "nobody" | "missing" }> {
  const bill = await db.electricityBill.findFirst({ where: { id: billId, ownerId }, include: { room: { select: { id: true, number: true } } } });
  if (!bill) return { error: "missing" };
  if (bill.appliedAt) return { error: "applied" };
  const people = await stayers(ownerId, bill.roomId, bill.period);
  const shares = splitByDays(bill.amount, people);
  if (!shares.length) return { error: "nobody" };
  const totalDays = shares.reduce((s, x) => s + x.days, 0);
  const due = today();
  await db.$transaction([
    ...shares
      .filter((s) => s.share > 0)
      .map((s) =>
        db.charge.create({
          data: {
            tenantId: s.id,
            type: "ELECTRICITY",
            period: null,
            description: electricityDescription(bill.period, bill.room.number, s.days, totalDays),
            amount: s.share,
            dueDate: due,
            billId: bill.id,
          },
        }),
      ),
    db.electricityBill.update({ where: { id: bill.id }, data: { appliedAt: new Date() } }),
  ]);
  return { people: shares.filter((s) => s.share > 0).length };
}

export async function applyBill(billId: string): Promise<{ ok?: string; error?: string }> {
  const owner = await requireOwner();
  const { t } = await getT();
  const r = await applyOne(owner.id, billId);
  revalidatePath("/", "layout");
  if ("people" in r) return { ok: t("elecApplied", { n: r.people }) };
  return { error: r.error === "applied" ? t("elecAlreadyApplied") : r.error === "nobody" ? t("elecNoStayers") : t("errPropertyNotFound") };
}

export async function applyAllBills(propertyId: string, period: string): Promise<{ ok?: string; error?: string }> {
  const owner = await requireOwner();
  const { t } = await getT();
  const bills = await db.electricityBill.findMany({ where: { ownerId: owner.id, period, appliedAt: null, room: { propertyId } }, select: { id: true } });
  if (!bills.length) return { error: t("elecNothing") };
  let done = 0;
  for (const b of bills) {
    const r = await applyOne(owner.id, b.id);
    if ("people" in r) done += 1;
  }
  revalidatePath("/", "layout");
  return done ? { ok: t("elecAllDone", { n: done }) } : { error: t("elecNoStayers") };
}

/** Take the bill back out of the tenants' dues. The bill itself stays so it can be fixed and added again. */
export async function undoBill(billId: string): Promise<{ ok?: string; error?: string }> {
  const owner = await requireOwner();
  const { t } = await getT();
  const bill = await db.electricityBill.findFirst({ where: { id: billId, ownerId: owner.id } });
  if (!bill) return { error: t("errPropertyNotFound") };
  await db.$transaction([db.charge.deleteMany({ where: { billId } }), db.electricityBill.update({ where: { id: billId }, data: { appliedAt: null } })]);
  revalidatePath("/", "layout");
  return { ok: t("elecUndone") };
}

export async function deleteBill(billId: string): Promise<{ ok?: string; error?: string }> {
  const owner = await requireOwner();
  const { t } = await getT();
  const bill = await db.electricityBill.findFirst({ where: { id: billId, ownerId: owner.id } });
  if (!bill) return { error: t("errPropertyNotFound") };
  if (bill.appliedAt) return { error: t("elecAlreadyApplied") };
  await db.electricityBill.delete({ where: { id: billId } });
  revalidatePath("/electricity");
  return { ok: t("deletedOk") };
}
