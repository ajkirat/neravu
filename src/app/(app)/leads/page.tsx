import Link from "next/link";
import { db } from "@/lib/db";
import { requireActor } from "@/lib/auth";
import { today, toDateInput } from "@/lib/dates";
import { fmtDate, whatsappNumber } from "@/lib/format";
import { followUpDue, isOpenLead } from "@/lib/leads";
import type { MsgKey } from "@/lib/i18n";
import { createLead } from "@/app/actions/leads";
import { getT } from "@/lib/i18n/server";
import { appOrigin } from "@/lib/url";
import { VoiceInput } from "@/components/voice-input";
import { ActionForm } from "@/components/action-form";
import { LeadControls } from "@/components/lead-controls";
import { Badge, Card, EmptyState, Field, PageHeader, Stat } from "@/components/ui";

export const metadata = { title: "Leads" };

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const sp = await searchParams;
  const { owner, role } = await requireActor();
  const origin = await appOrigin();
  const { t, lang } = await getT();
  const showAll = sp.show === "all";
  const [all, properties] = await Promise.all([
    db.lead.findMany({
      where: { ownerId: owner.id },
      include: { property: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.property.findMany({ where: { ownerId: owner.id }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const asOf = today();
  const leads = showAll ? all : all.filter((l) => isOpenLead(l.status));
  const dueCount = all.filter((l) => followUpDue(l, asOf)).length;

  return (
    <>
      <PageHeader
        title={t("leadsTitle")}
        subtitle={t("leadsSub")}
        actions={
          <Link href={showAll ? "/leads" : "/leads?show=all"} className="btn-secondary">
            {showAll ? t("showOpen") : t("showAll")}
          </Link>
        }
      />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label={t("openLeads")} value={all.filter((l) => isOpenLead(l.status)).length} />
        <Stat label={t("newLeads")} value={all.filter((l) => l.status === "NEW").length} tone="good" />
        <Stat label={t("followUpsDue")} value={dueCount} tone={dueCount ? "warn" : "default"} />
        <Stat label={t("won")} value={all.filter((l) => l.status === "WON").length} />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {leads.length === 0 ? (
            <EmptyState
              title={t("noLeads")}
              body={t("noLeadsBody")}
            />
          ) : (
            leads.map((l) => (
              <Card key={l.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {l.name}{" "}
                      <Badge tone={l.status === "WON" ? "green" : l.status === "LOST" ? "gray" : "amber"}>
                        {t(`lead_${l.status}` as MsgKey)}
                      </Badge>{" "}
                      {l.source === "QR" && <Badge tone="green">{t("qrBadge")}</Badge>}{" "}
                      {l.want === "CALLBACK" && <Badge tone="red">{t("wantCallbackBadge")}</Badge>}
                      {l.want === "INFO" && <Badge>{t("wantInfoBadge")}</Badge>}
                    </p>
                    <p className="text-sm text-muted">
                      <a href={`tel:${l.phone}`} className="hover:underline">
                        {l.phone}
                      </a>{" "}
                      · {l.property?.name ?? t("anyProperty")} · {fmtDate(l.createdAt, lang)}
                    </p>
                    {l.note && <p className="mt-1 text-sm">{l.note}</p>}
                    {followUpDue(l, asOf) && (
                      <p className="mt-1 text-xs font-medium text-red-700">{t("followUpDueOn", { date: fmtDate(l.followUpOn, lang) })}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a className="btn-secondary btn-sm" href={`tel:${l.phone}`}>
                      {t("call")}
                    </a>
                    <a
                      className="btn-accent btn-sm"
                      target="_blank"
                      rel="noreferrer"
                      href={`https://wa.me/${whatsappNumber(l.phone)}?text=${encodeURIComponent(
                        t("leadMsg", { name: l.name.split(" ")[0], pg: owner.businessName ?? l.property?.name ?? "PG" }),
                      )}`}
                    >
                      {t("whatsapp")}
                    </a>
                    {properties.length > 0 && (
                      <a
                        className="btn-secondary btn-sm"
                        target="_blank"
                        rel="noreferrer"
                        href={`https://wa.me/${whatsappNumber(l.phone)}?text=${encodeURIComponent(
                          t("joinWaMsg", {
                            pg: owner.businessName ?? l.property?.name ?? properties[0].name,
                            url: `${origin}/join/${l.propertyId ?? properties[0].id}`,
                          }),
                        )}`}
                      >
                        {t("leadSendJoin")}
                      </a>
                    )}
                    {role === "OWNER" && isOpenLead(l.status) && (
                      <Link href={`/tenants/new?lead=${l.id}`} className="btn-primary btn-sm">
                        {t("leadMoveIn")}
                      </Link>
                    )}
                  </div>
                </div>
                <div className="mt-3 border-t border-line pt-3">
                  <LeadControls id={l.id} status={l.status} followUp={l.followUpOn ? toDateInput(l.followUpOn) : ""} canDelete={role === "OWNER"} />
                </div>
              </Card>
            ))
          )}
        </div>
        <Card title={t("addLead")}>
          <ActionForm action={createLead} submitLabel={t("addLeadBtn")} resetOnSuccess>
            <Field label={t("name")}>
              <input name="name" className="input" required maxLength={80} />
            </Field>
            <Field label={t("phone")}>
              <input name="phone" type="tel" className="input" required />
            </Field>
            <Field label={t("interestedIn")}>
              <select name="propertyId" className="input" defaultValue="">
                <option value="">{t("anyProperty")}</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("note")}>
              <VoiceInput name="note" maxLength={500} />
            </Field>
            <Field label={t("followUpOn")}>
              <input name="followUpOn" type="date" className="input" />
            </Field>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
