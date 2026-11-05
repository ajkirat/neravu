import { db } from "@/lib/db";
import { requireActor } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import type { MsgKey } from "@/lib/i18n";
import { createComplaint } from "@/app/actions/complaints";
import { ActionForm } from "@/components/action-form";
import { ComplaintControls } from "@/components/complaint-controls";
import { VoiceInput } from "@/components/voice-input";
import { Badge, Card, EmptyState, Field, PageHeader } from "@/components/ui";

export const metadata = { title: "Complaints" };

export default async function ComplaintsPage() {
  const { owner, role } = await requireActor();
  const { t, lang } = await getT();
  const [complaints, tenants] = await Promise.all([
    db.complaint.findMany({
      where: { ownerId: owner.id },
      include: { tenant: { select: { name: true } }, property: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.tenant.findMany({
      where: { ownerId: owner.id, status: { in: ["ACTIVE", "NOTICE"] } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const open = (c: { status: string }) => c.status !== "RESOLVED";
  const sorted = [...complaints.filter(open), ...complaints.filter((c) => !open(c))];

  return (
    <>
      <PageHeader title={t("complaintsTitle")} subtitle={t("complaintsSub")} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {sorted.length === 0 ? (
            <EmptyState title={t("noComplaints")} />
          ) : (
            sorted.map((c) => (
              <Card key={c.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {c.title}{" "}
                      <Badge tone={c.status === "RESOLVED" ? "green" : c.status === "IN_PROGRESS" ? "amber" : "red"}>
                        {t(`cmp_${c.status}` as MsgKey)}
                      </Badge>
                    </p>
                    <p className="text-sm text-muted">
                      {[c.tenant?.name, c.property?.name, fmtDate(c.createdAt, lang)].filter(Boolean).join(" · ")}
                    </p>
                    {c.details && <p className="mt-1 text-sm">{c.details}</p>}
                  </div>
                  <ComplaintControls id={c.id} status={c.status} canDelete={role === "OWNER"} />
                </div>
              </Card>
            ))
          )}
        </div>
        <Card title={t("logComplaint")}>
          <ActionForm action={createComplaint} submitLabel={t("save")} resetOnSuccess>
            <Field label={t("complaintTitleLabel")}>
              <VoiceInput name="title" required maxLength={200} />
            </Field>
            <Field label={t("complaintDetails")}>
              <VoiceInput name="details" maxLength={1000} />
            </Field>
            <Field label={t("whichTenant")}>
              <select name="tenantId" className="input" defaultValue="">
                <option value="">{t("anyone")}</option>
                {tenants.map((tn) => (
                  <option key={tn.id} value={tn.id}>
                    {tn.name}
                  </option>
                ))}
              </select>
            </Field>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
