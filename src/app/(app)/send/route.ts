import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireActor } from "@/lib/auth";
import { summarizeLedger } from "@/lib/billing";
import { reminderLink } from "@/lib/format";
import { asLang } from "@/lib/i18n";
import { billMessage } from "@/lib/monthly-bill";
import { payTokens } from "@/lib/paylink";
import { today } from "@/lib/dates";
import { appOrigin } from "@/lib/url";

/**
 * One-tap send from the Today list: records that the message went out (so the list and the reminder
 * ladder know), then opens WhatsApp with the text ready. Owner or caretaker.
 */
export async function GET(req: Request) {
  const { owner } = await requireActor();
  const u = new URL(req.url);
  const kind = u.searchParams.get("k");
  const tenantId = u.searchParams.get("t") ?? "";
  if (kind === "BILL") {
    const m = await billMessage(owner.id, tenantId, asLang(owner.language));
    if (!m) redirect("/dashboard");
    await db.reminderLog.create({ data: { ownerId: owner.id, tenantId, kind: "BILL", status: "SENT", amount: m.amount, detail: "one-tap" } });
    redirect(m.url);
  }
  if (kind === "REMIND") {
    const tn = await db.tenant.findFirst({
      where: { id: tenantId, ownerId: owner.id },
      select: { id: true, name: true, phone: true, language: true, property: { select: { name: true } }, charges: { select: { amount: true, dueDate: true } }, payments: { select: { amount: true } } },
    });
    if (!tn) redirect("/dashboard");
    const s = summarizeLedger(tn.charges, tn.payments, today());
    const token = (await payTokens(owner.id, [tn.id])).get(tn.id);
    await db.reminderLog.create({ data: { ownerId: owner.id, tenantId, kind: "OVERDUE", status: "SENT", amount: s.outstanding, detail: "one-tap" } });
    await db.tenant.update({ where: { id: tn.id }, data: { lastRemindedAt: new Date() } });
    redirect(
      reminderLink({
        phone: tn.phone,
        tenantName: tn.name,
        amount: s.outstanding,
        propertyName: owner.businessName ?? tn.property.name,
        since: s.oldestUnpaid,
        lang: asLang(tn.language ?? owner.language),
        payUrl: token ? `${await appOrigin()}/pay/${token}` : undefined,
      }),
    );
  }
  redirect("/dashboard");
}
