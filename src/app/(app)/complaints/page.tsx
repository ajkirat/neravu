import { db } from "@/lib/db";
import { requireActor } from "@/lib/auth";
import { fmtDate, whatsappNumber } from "@/lib/format";
import { asLang, makeT } from "@/lib/i18n";
import { getT } from "@/lib/i18n/server";
import type { MsgKey } from "@/lib/i18n";
import { createComplaint } from "@/app/actions/complaints";
import { ActionForm } from "@/components/action-form";
import { ComplaintControls } from "@/components/complaint-controls";
import { VoiceInput } from "@/components/voice-input";
import { FoldCard, Badge, Card, EmptyState, Field, PageHeader } from "@/components/ui";

export const metadata = { title: "Complaints" };

export default async function ComplaintsPage() {
  const { owner, role } = await requireActor();
  const { t, lang } = await getT();
  const [complaints, tenants] = await Promise.all([
    db.complaint.findMany({
      where: { ownerId: owner.id },
      // Not the photo itself: that is loaded only when someone opens it.
      select: {
        id: true,
        title: true,
        details: true,
        status: true,
        source: true,
        photoMime: true,
        createdAt: true,
        tenant: { select: { name: true, phone: true, language: true } },
        property: { select: { name: true } },
      },
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
      <div className="space-y-4">
        <FoldCard title={"+ " + t("logComplaint")} open={sorted.length === 0}>
          <ActionForm action={createComplaint} submitLabel={t("save")} cols resetOnSuccess>
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
        </FoldCard>
        <div className="space-y-3">
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
                    <p className="mt-1 flex flex-wrap items-center gap-3 text-sm">
                      {c.source === "TENANT" && <Badge tone="green">{t("cmpFromTenant")}</Badge>}
                      {c.photoMime && (
                        <a href={`/complaints/${c.id}/photo`} target="_blank" rel="noreferrer" className="text-brand-600 underline">
                          {t("cmpPhoto")}
                        </a>
                      )}
                      {c.status === "RESOLVED" && c.tenant?.phone && (
                        <a
                          className="text-brand-600 underline"
                          target="_blank"
                          rel="noreferrer"
                          href={`https://wa.me/${whatsappNumber(c.tenant.phone)}?text=${encodeURIComponent(
                            makeT(asLang(c.tenant.language ?? lang))("cmpFixedMsg", { name: c.tenant.name.split(" ")[0], what: c.title }),
                          )}`}
                        >
                          {t("cmpTellFixed")}
                        </a>
                      )}
                    </p>
                  </div>
                  <ComplaintControls id={c.id} status={c.status} canDelete={role === "OWNER"} />
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </>
  );
}
