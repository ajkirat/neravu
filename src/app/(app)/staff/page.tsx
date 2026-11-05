import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { addStaff } from "@/app/actions/staff";
import { ActionForm } from "@/components/action-form";
import { StaffControls } from "@/components/staff-controls";
import { FoldCard, Badge, Card, EmptyState, Field, PageHeader } from "@/components/ui";

export const metadata = { title: "Caretakers" };

export default async function StaffPage() {
  const owner = await requireOwner();
  const { t, lang } = await getT();
  const people = await db.staff.findMany({ where: { ownerId: owner.id }, orderBy: { createdAt: "asc" } });
  return (
    <>
      <PageHeader title={t("staffTitle")} subtitle={t("staffSub")} />
      <p className="mb-6 max-w-3xl rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-700">{t("staffCan")}</p>
      <div className="space-y-4">
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
