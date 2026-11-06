import { db } from "@/lib/db";
import { requireActor } from "@/lib/auth";
import { diffDays, toDateInput, today } from "@/lib/dates";
import { fmtDate } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { addJob, deleteJob, jobDone } from "@/app/actions/jobs";
import { ActionForm } from "@/components/action-form";
import { ActionButton } from "@/components/today-actions";
import { JobFields } from "@/components/job-presets";
import { Badge, Card, EmptyState, FoldCard, PageHeader } from "@/components/ui";

export const metadata = { title: "Regular jobs" };

export default async function JobsPage() {
  const { owner, role } = await requireActor();
  const isOwner = role === "OWNER";
  const { t, lang } = await getT();
  const asOf = today();
  const [jobs, properties] = await Promise.all([
    db.recurringJob.findMany({ where: { ownerId: owner.id, active: true }, orderBy: { nextDue: "asc" } }),
    db.property.findMany({ where: { ownerId: owner.id }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const pg = new Map(properties.map((p) => [p.id, p.name]));
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader title={t("jobsTitle")} subtitle={t("jobsSub")} />
      {isOwner && (
        <FoldCard title={t("jobAddTitle")} open={jobs.length === 0}>
          <ActionForm action={addJob} submitLabel={t("jobAddBtn")} cols resetOnSuccess>
            <JobFields properties={properties} defaultDate={toDateInput(asOf)} />
          </ActionForm>
        </FoldCard>
      )}
      {jobs.length === 0 ? (
        <EmptyState title={t("jobsNone")} />
      ) : (
        <div className="space-y-2">
          {jobs.map((j) => {
            const days = diffDays(j.nextDue, asOf);
            return (
              <Card key={j.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-brand-900">
                      {j.title} {days <= 0 ? <Badge tone="red">{days < 0 ? t("jobLate", { n: -days }) : t("jobDueToday")}</Badge> : <Badge>{t("jobInDays", { n: days })}</Badge>}
                    </p>
                    <p className="text-sm text-muted">
                      {t("jobEveryN", { n: j.everyDays })} · {t("jobNext", { date: fmtDate(j.nextDue, lang) })}
                      {j.propertyId && pg.get(j.propertyId) ? ` · ${pg.get(j.propertyId)}` : ""}
                    </p>
                    {j.lastDone && <p className="text-xs text-muted">{t("jobLastDone", { date: fmtDate(j.lastDone, lang) })}{j.lastDoneBy ? ` · ${j.lastDoneBy}` : ""}</p>}
                  </div>
                  <span className="flex gap-2">
                    <ActionButton action={jobDone.bind(null, j.id)} label={t("jobDoneBtn")} className="btn-primary btn-sm" />
                    {isOwner && <ActionButton action={deleteJob.bind(null, j.id)} label={t("delete")} confirm={t("jobDeleteConfirm")} />}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
