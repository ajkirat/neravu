"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { summarizeLedger } from "@/lib/billing";
import { today } from "@/lib/dates";
import { int, optStr, str } from "@/lib/forms";
import { rupees } from "@/lib/format";
import { syncRentCharges } from "@/lib/ledger";
import { DEDUCTION_REASONS, deductionDescription, settle, type DeductionReason } from "@/lib/settlement";
import { getT } from "@/lib/i18n/server";
import type { MsgKey } from "@/lib/i18n";
import type { FormState } from "@/components/action-form";

async function settlementFor(ownerId: string, tenantId: string) {
  await syncRentCharges(ownerId, tenantId);
  const t = await db.tenant.findFirst({
    where: { id: tenantId, ownerId },
    include: { charges: { select: { amount: true, dueDate: true } }, payments: { select: { amount: true } } },
  });
  if (!t) return null;
  const s = summarizeLedger(t.charges, t.payments, today());
  return { tenant: t, ...settle({ deposit: t.deposit, outstanding: s.outstanding, advance: s.advance }) };
}

/** Take a deduction (damage, cleaning, short notice…) from the deposit. It becomes a charge on the tenant's account. */
export async function addDeduction(tenantId: string, _: FormState, fd: FormData): Promise<FormState> {
  const owner = await requireOwner();
  const { t } = await getT();
  const tenant = await db.tenant.findFirst({ where: { id: tenantId, ownerId: owner.id } });
  if (!tenant) return { error: t("errTenantNotFound") };
  const reason = str(fd, "reason") as DeductionReason;
  if (!DEDUCTION_REASONS.includes(reason)) return { error: t("errDeduction") };
  const amount = int(fd, "amount");
  if (!amount || amount <= 0 || amount > 10_000_000) return { error: t("errDeduction") };
  await db.charge.create({
    data: {
      tenantId,
      type: "DEDUCTION",
      period: null,
      description: deductionDescription(reason, t(`ded_${reason}` as MsgKey), optStr(fd, "note")?.slice(0, 120) ?? null),
      amount,
      dueDate: today(),
    },
  });
  revalidatePath("/", "layout");
  return { ok: t("setDeductionAdded", { amt: rupees(amount) }), at: Date.now() };
}

/** The owner paid back the refund. The amount is worked out here, not taken from the page. */
export async function payRefund(tenantId: string, _: FormState, fd: FormData): Promise<FormState> {
  const owner = await requireOwner();
  const { t } = await getT();
  const s = await settlementFor(owner.id, tenantId);
  if (!s) return { error: t("errTenantNotFound") };
  if (s.refund <= 0) return { error: t("errNoRefund") };
  const how = ["CASH", "UPI", "BANK"].includes(str(fd, "how")) ? str(fd, "how") : "CASH";
  await db.payment.create({
    data: { tenantId, amount: -s.refund, paidOn: today(), method: "REFUND", reference: how, note: "Deposit refund (move-out settlement)" },
  });
  revalidatePath("/", "layout");
  return { ok: t("setRefundDone", { amt: rupees(s.refund) }), at: Date.now() };
}
