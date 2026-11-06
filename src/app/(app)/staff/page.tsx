import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { addStaff, confirmCashHandover } from "@/app/actions/staff";
import { cashWithStaff } from "@/lib/cash";
import { rupees } from "@/lib/format";
import { ActionForm } from "@/components/action-form";
import { StaffControls } from "@/components/staff-controls";
import { FoldCard, Badge, Card, EmptyState, Field, PageHeader } from "@/components/ui";

export const metadata = { title: "Caretakers" };

export default async function StaffPage() {
  const owner = await requireOwner();
  const { t, lang } = await getT();
  const [people, cash] = await Promise.all([
    db.staff.findMany({ where: { ownerId: owner.id }, orderBy: { createdAt: "asc" } }),
    cashWithStaff(owner.id),
  ]);
  const seenAt = new Date().toISOString();
  return (
    <>
      <PageHeader title={t("staffTitle")} subtitle={t("staffSub")} />
      <p className="mb-6 max-w-3xl rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-700">{t("staffCan")}</p>
      <div className="space-y-4">
        {people.length > 0 && (
          <Card title={t("cashTitle")} padded={false}>
            {cash.length === 0 ? (
              <p className="px-4 py-4 text-sm text-muted sm:px-5">{t("cashNone")}</p>
            ) : (
              <ul className="divide-y divide-line">
                {cash.map((c) => (
                  <li key={c.staffId} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
                    <p className="text-base font-semibold text-brand-900">{t("cashWith", { name: c.name, amt: rupees(c.amount), n: c.count })}</p>
                    <ActionForm
                      action={async () => {
                        "use server";
                        await confirmCashHandover(c.staffId, seenAt);
                        return undefined;
                      }}
                      submitLabel={t("cashReceivedBtn", { amt: rupees(c.amount) })}
                      className="inline"
                      confirm={t("cashReceivedConfirm", { amt: rupees(c.amount), name: c.name })}
                    />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
        <FoldCard title={"+ " + t("staffAddTitle")} open={people.length === 0}>
          <ActionForm action={addStaff} submitLabel={t("staffAddBtn")} cols resetOnSuccess>
            <Field label={t("staffName")}>
              <input className="input" name="name" required maxLength={80} />
            </Field>
            <Field label={t("staffPhone")}>
              <input className="input" name="phone" type="tel" required inputMode="numeric" />
            </Field>
            <Field label={t("staffPassword")} hint={t("staffPasswordHint")}>
              <input className="input" name="password" type="text" required minLength={6} autoComplete="off" />
            </Field>
          </ActionForm>
        </FoldCard>
        <div className="space-y-3">
          {people.length === 0 ? (
            <EmptyState title={t("staffNone")} />
          ) : (
            people.map((s) => (
              <Card key={s.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">
                      {s.name} <Badge tone={s.active ? "green" : "gray"}>{s.active ? t("staffActive") : t("staffOffBadge")}</Badge>
                    </p>
                    <p className="text-sm text-muted">{s.phone}</p>
                    <p className="text-xs text-muted">{s.lastLoginAt ? t("staffLast", { date: fmtDate(s.lastLoginAt, lang) }) : t("staffNever")}</p>
                    {s.active && <p className="mt-1 text-xs text-muted">{t("staffSwitchOffNote")}</p>}
                  </div>
                  <StaffControls id={s.id} active={s.active} />
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </>
  );
}
