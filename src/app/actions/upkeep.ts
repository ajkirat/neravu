"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireActor, requireOwner } from "@/lib/auth";
import { parseDateInput, today } from "@/lib/dates";
import { int, optStr, str } from "@/lib/forms";
import { getT } from "@/lib/i18n/server";
import { nextAfterDone } from "@/lib/jobs";
import { rupees } from "@/lib/format";
import { CHECKLIST_PRESETS, asAssetKind, asServiceCategory, expenseCategoryFor, periodFor } from "@/lib/upkeep";
import type { FormState } from "@/components/action-form";
import type { MsgKey } from "@/lib/i18n";

const done = () => revalidatePath("/", "layout");

async function ownProperty(ownerId: string, id: string | null) {
  if (!id) return null;
  return (await db.property.findFirst({ where: { id, ownerId }, select: { id: true } }))?.id ?? undefined;
}

function serviceFields(fd: FormData) {
  const remind = int(fd, "remindDays") ?? 0;
  const cost = int(fd, "cost");
  return {
    title: str(fd, "title").slice(0, 120),
    category: asServiceCategory(str(fd, "category")),
    everyDays: int(fd, "every") ?? 0,
    vendorName: optStr(fd, "vendorName")?.slice(0, 80) ?? null,
    vendorPhone: optStr(fd, "vendorPhone")?.slice(0, 20) ?? null,
    cost: cost && cost > 0 ? Math.min(cost, 10_000_000) : null,
    remindDays: Math.min(Math.max(remind, 0), 30),
    notes: optStr(fd, "notes")?.slice(0, 300) ?? null,
  };
}

/** Owner: add a recurring service (from a preset or their own). */
export async function addService(_: FormState, fd: FormData): Promise<FormState> {
  const owner = await requireOwner();
  const { t } = await getT();
  const f = serviceFields(fd);
  if (!f.title) return { error: t("jobErrTitle") };
  if (f.everyDays < 1 || f.everyDays > 730) return { error: t("jobErrEvery") };
  const propertyId = await ownProperty(owner.id, optStr(fd, "propertyId"));
  if (propertyId === undefined) return { error: t("errPropertyNotFound") };
  await db.recurringJob.create({ data: { ...f, ownerId: owner.id, propertyId, nextDue: parseDateInput(str(fd, "nextDue")) ?? today() } });
  done();
  return { ok: t("svcAdded"), at: Date.now() };
}

/** Owner: change a service (vendor, cost, how often, next date...). */
export async function updateService(id: string, _: FormState, fd: FormData): Promise<FormState> {
  const owner = await requireOwner();
  const { t } = await getT();
  const f = serviceFields(fd);
  if (!f.title) return { error: t("jobErrTitle") };
  if (f.everyDays < 1 || f.everyDays > 730) return { error: t("jobErrEvery") };
  const propertyId = await ownProperty(owner.id, optStr(fd, "propertyId"));
  if (propertyId === undefined) return { error: t("errPropertyNotFound") };
  const nextDue = parseDateInput(str(fd, "nextDue"));
  const r = await db.recurringJob.updateMany({ where: { id, ownerId: owner.id }, data: { ...f, propertyId, ...(nextDue ? { nextDue } : {}) } });
  if (!r.count) return { error: t("claimGone") };
  done();
  return { ok: t("svcSaved"), at: Date.now() };
}

/**
 * Owner or caretaker: the service was done today. Logs it (who, cost, note), moves the next date on and,
 * if asked, adds the cost to Expenses under the right category.
 */
export async function serviceDone(id: string, _: FormState, fd: FormData): Promise<FormState> {
  const { owner, staff } = await requireActor();
  const { t } = await getT();
  const j = await db.recurringJob.findFirst({ where: { id, ownerId: owner.id, active: true } });
  if (!j) return { error: t("claimGone") };
  const day = today();
  const cost = int(fd, "cost");
  const amount = cost && cost > 0 ? Math.min(cost, 10_000_000) : null;
  const note = optStr(fd, "note")?.slice(0, 300) ?? null;
  const by = staff?.name ?? null;
  let expenseId: string | null = null;
  if (amount && fd.get("addExpense") === "on") {
    const e = await db.expense.create({
      data: {
        ownerId: owner.id,
        propertyId: j.propertyId,
        category: expenseCategoryFor(j.category, j.title),
        amount,
        spentOn: day,
        vendor: j.vendorName,
        note: note ? `${j.title} · ${note}` : j.title,
        addedByName: by,
        addedByStaffId: staff?.id ?? null,
      },
    });
    expenseId = e.id;
  }
  await db.$transaction([
    db.serviceLog.create({ data: { ownerId: owner.id, jobId: j.id, doneOn: day, byName: by, cost: amount, note, expenseId } }),
    db.recurringJob.update({ where: { id: j.id }, data: { lastDone: day, lastDoneBy: by, nextDue: nextAfterDone(day, j.everyDays) } }),
  ]);
  done();
  return { ok: expenseId && amount ? t("svcDoneExpense", { amt: rupees(amount) }) : t("jobDoneOk"), at: Date.now() };
}

// ---------- Checklists ----------

/** Owner: add one of the ready checklists, in the owner's language. */
export async function addChecklistPreset(key: string, propertyId: string | null): Promise<{ ok?: string; error?: string }> {
  const owner = await requireOwner();
  const { t } = await getT();
  const p = CHECKLIST_PRESETS.find((x) => x.key === key);
  if (!p) return { error: t("claimGone") };
  const pid = await ownProperty(owner.id, propertyId);
  if (pid === undefined) return { error: t("errPropertyNotFound") };
  await db.checklist.create({ data: { ownerId: owner.id, propertyId: pid, title: t(p.key as MsgKey), frequency: p.frequency, items: p.items.map((i) => t(i as MsgKey)) } });
  done();
  return { ok: t("ckAdded") };
}

/** Owner: their own checklist, items one per line. */
export async function addChecklist(_: FormState, fd: FormData): Promise<FormState> {
  const owner = await requireOwner();
  const { t } = await getT();
  const title = str(fd, "title").slice(0, 80);
  if (!title) return { error: t("ckErrName") };
  const items = [...new Set(str(fd, "items").split(/\r?\n/).map((s) => s.trim().slice(0, 120)).filter(Boolean))].slice(0, 30);
  if (!items.length) return { error: t("ckErrItems") };
  const propertyId = await ownProperty(owner.id, optStr(fd, "propertyId"));
  if (propertyId === undefined) return { error: t("errPropertyNotFound") };
  await db.checklist.create({ data: { ownerId: owner.id, propertyId, title, frequency: str(fd, "frequency") === "WEEKLY" ? "WEEKLY" : "DAILY", items } });
  done();
  return { ok: t("ckAdded"), at: Date.now() };
}

/** Owner or caretaker: tick or untick one item for today (or this week). */
export async function tickChecklist(id: string, item: string, checked: boolean): Promise<{ ok?: string; error?: string }> {
  const { owner, staff } = await requireActor();
  const c = await db.checklist.findFirst({ where: { id, ownerId: owner.id, active: true } });
  if (!c || !c.items.includes(item)) return { error: "gone" };
  const period = periodFor(c.frequency, today());
  const by = staff?.name ?? owner.name;
  const run = await db.checklistRun.findUnique({ where: { checklistId_period: { checklistId: c.id, period } } });
  const set = new Set(run?.doneItems ?? []);
  if (checked) set.add(item);
  else set.delete(item);
  await db.checklistRun.upsert({
    where: { checklistId_period: { checklistId: c.id, period } },
    create: { checklistId: c.id, period, doneItems: [...set], byName: by },
    update: { doneItems: [...set], byName: by },
  });
  done();
  return { ok: "ok" };
}

export async function deleteChecklist(id: string): Promise<{ ok?: string; error?: string }> {
  const owner = await requireOwner();
  await db.checklist.deleteMany({ where: { id, ownerId: owner.id } });
  done();
  return { ok: "ok" };
}

// ---------- Equipment ----------

export async function addAsset(_: FormState, fd: FormData): Promise<FormState> {
  const owner = await requireOwner();
  const { t } = await getT();
  const name = str(fd, "name").slice(0, 80);
  if (!name) return { error: t("eqErrName") };
  const propertyId = await ownProperty(owner.id, optStr(fd, "propertyId"));
  if (propertyId === undefined) return { error: t("errPropertyNotFound") };
  await db.asset.create({
    data: {
      ownerId: owner.id,
      propertyId,
      name,
      kind: asAssetKind(str(fd, "kind")),
      location: optStr(fd, "location")?.slice(0, 80) ?? null,
      boughtOn: parseDateInput(str(fd, "boughtOn")),
      warrantyUntil: parseDateInput(str(fd, "warrantyUntil")),
      amcUntil: parseDateInput(str(fd, "amcUntil")),
      vendorName: optStr(fd, "vendorName")?.slice(0, 80) ?? null,
      vendorPhone: optStr(fd, "vendorPhone")?.slice(0, 20) ?? null,
      notes: optStr(fd, "notes")?.slice(0, 300) ?? null,
    },
  });
  done();
  return { ok: t("eqAdded"), at: Date.now() };
}

export async function deleteAsset(id: string): Promise<{ ok?: string; error?: string }> {
  const owner = await requireOwner();
  await db.asset.deleteMany({ where: { id, ownerId: owner.id } });
  done();
  return { ok: "ok" };
}
