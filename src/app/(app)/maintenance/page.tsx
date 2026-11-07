import Link from "next/link";
import { db } from "@/lib/db";
import { requireActor } from "@/lib/auth";
import { addDays, diffDays, toDateInput, today } from "@/lib/dates";
import { fmtDate, rupees, whatsappNumber } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import type { MsgKey } from "@/lib/i18n";
import { ASSET_KINDS, CHECKLIST_PRESETS, assetAlerts, dueState, periodFor, runState, vendorMessage } from "@/lib/upkeep";
import { addAsset, addChecklist, addChecklistPreset, deleteAsset, deleteChecklist, serviceDone, updateService, addService } from "@/app/actions/upkeep";
import { deleteJob, jobLater } from "@/app/actions/jobs";
import { ActionForm } from "@/components/action-form";
import { ActionButton } from "@/components/today-actions";
import { JobFields } from "@/components/job-presets";
import { ChecklistCard } from "@/components/checklist-card";
import { Badge, Card, EmptyState, FoldCard, PageHeader } from "@/components/ui";

export const metadata = { title: "Maintenance" };

const TABS = ["services", "checklists", "equipment"] as const;
type Tab = (typeof TABS)[number];

export default async function UpkeepPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { owner, role } = await requireActor();
  const isOwner = role === "OWNER";
  const { t, lang } = await getT();
  const tabParam = (await searchParams).tab;
  const tab: Tab = (TABS as readonly string[]).includes(tabParam ?? "") ? (tabParam as Tab) : "services";
  const asOf = today();
  const [jobs, checklists, assets, properties] = await Promise.all([
    db.recurringJob.findMany({ where: { ownerId: owner.id, active: true }, orderBy: { nextDue: "asc" } }),
    db.checklist.findMany({ where: { ownerId: owner.id, active: true }, orderBy: { createdAt: "asc" } }),
    db.asset.findMany({ where: { ownerId: owner.id }, orderBy: { name: "asc" } }),
    db.property.findMany({ where: { ownerId: owner.id }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const pg = new Map(properties.map((p) => [p.id, p.name]));
  const pgName = (id: string | null) => (id ? pg.get(id) : null) ?? owner.businessName ?? owner.name;
  const dueCount = jobs.filter((j) => dueState(j.nextDue, j.remindDays, asOf).state !== "later").length;
  const ckOpen = checklists.length;
  const eqAlerts = assets.filter((a) => assetAlerts(a, asOf).length).length;

  const tabLink = (k: Tab, label: string, n: number) => (
    <Link
      key={k}
      href={`/maintenance?tab=${k}`}
      scroll={false}
      className={`rounded-lg px-4 py-2 text-sm font-semibold whitespace-nowrap ${tab === k ? "bg-brand-600 text-white" : "bg-white text-muted ring-1 ring-line"}`}
      data-testid={`tab-${k}`}
    >
      {label}
      {n > 0 && <span className={`ml-2 rounded-full px-2 text-xs ${tab === k ? "bg-white/20" : "bg-marigold-100 text-marigold-700"}`}>{n}</span>}
    </Link>
  );

  return (
    <>
      <PageHeader title={t("upkeepTitle")} subtitle={t("upkeepSub")} />
      <div className="mb-4 flex flex-wrap gap-2">
        {tabLink("services", t("tabServices"), dueCount)}
        {tabLink("checklists", t("tabChecklists"), ckOpen)}
        {tabLink("equipment", t("tabEquipment"), eqAlerts)}
      </div>

      {tab === "services" && <Services />}
      {tab === "checklists" && <Checklists />}
      {tab === "equipment" && <Equipment />}
    </>
  );

  async function Services() {
    const logs = jobs.length
      ? await db.serviceLog.findMany({ where: { ownerId: owner.id, jobId: { in: jobs.map((j) => j.id) } }, orderBy: { doneOn: "desc" }, take: 300 })
      : [];
    const byJob = new Map<string, typeof logs>();
    for (const l of logs) byJob.set(l.jobId, [...(byJob.get(l.jobId) ?? []), l].slice(0, 5));
    return (
      <div className="space-y-4">
        {isOwner && (
          <FoldCard title={t("svcAddTitle")} open={jobs.length === 0}>
            <div className="px-4 pb-4 sm:px-5">
              <ActionForm action={addService} submitLabel={t("jobAddBtn")} cols resetOnSuccess>
                <JobFields properties={properties} defaultDate={toDateInput(asOf)} />
              </ActionForm>
            </div>
          </FoldCard>
        )}
        {jobs.length === 0 ? (
          <EmptyState title={t("svcNone")} />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {jobs.map((j) => {
              const s = dueState(j.nextDue, j.remindDays, asOf);
              const history = byJob.get(j.id) ?? [];
              const wa = j.vendorPhone
                ? `https://wa.me/${whatsappNumber(j.vendorPhone)}?text=${encodeURIComponent(vendorMessage({ vendor: j.vendorName, service: j.title, pg: pgName(j.propertyId), date: fmtDate(j.nextDue, "en") }))}`
                : null;
              return (
                <Card key={j.id}>
                  <div className="space-y-2" data-testid="service">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-base font-semibold text-brand-900">
                          {j.title}{" "}
                          {s.state === "late" && <Badge tone="red">{t("jobLate", { n: -s.days })}</Badge>}
                          {s.state === "due" && <Badge tone="red">{t("jobDueToday")}</Badge>}
                          {s.state === "soon" && <Badge tone="amber">{t("svcSoon", { n: s.days })}</Badge>}
                        </p>
                        <p className="text-sm text-muted">
                          {t(`svc_${j.category}` as MsgKey)} · {t("jobEveryN", { n: j.everyDays })} · {t("jobNext", { date: fmtDate(j.nextDue, lang) })}
                          {j.propertyId ? ` · ${pgName(j.propertyId)}` : ""}
                        </p>
                        {(j.vendorName || j.vendorPhone) && (
                          <p className="text-sm">
                            {j.vendorName}
                            {j.vendorPhone && (
                              <>
                                {" "}
                                <span className="text-muted">{j.vendorPhone}</span>{" "}
                                <a className="text-brand-600 underline" href={`tel:${j.vendorPhone}`}>{t("svcCall")}</a>{" "}
                                <a className="text-brand-600 underline" href={wa!} target="_blank" rel="noreferrer">{t("svcWaVendor")}</a>
                              </>
                            )}
                          </p>
                        )}
                        {j.lastDone && (
                          <p className="text-xs text-muted">
                            {t("jobLastDone", { date: fmtDate(j.lastDone, lang) })}
                            {j.lastDoneBy ? ` · ${j.lastDoneBy}` : ""}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-start gap-2">
                      <details className="group">
                        <summary className="btn-primary btn-sm cursor-pointer list-none [&::-webkit-details-marker]:hidden">{t("jobDoneBtn")}</summary>
                        <div className="mt-2 w-72 max-w-full rounded-xl border border-line bg-white p-3">
                          <ActionForm action={serviceDone.bind(null, j.id)} submitLabel={t("jobDoneBtn")} submitClassName="btn-primary btn-sm">
                            <label className="block">
                              <span className="label">{t("svcDoneCost")}</span>
                              <input name="cost" inputMode="numeric" className="input" defaultValue={j.cost ?? ""} />
                            </label>
                            <label className="block">
                              <span className="label">{t("note")}</span>
                              <input name="note" className="input" maxLength={300} />
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                              <input type="checkbox" name="addExpense" defaultChecked className="h-5 w-5" />
                              {t("svcAddExpense")}
                            </label>
                          </ActionForm>
                        </div>
                      </details>
                      {s.state !== "later" && <ActionButton action={jobLater.bind(null, j.id)} label={t("jobLaterBtn")} />}
                      <details>
                        <summary className="btn-secondary btn-sm cursor-pointer list-none [&::-webkit-details-marker]:hidden">{t("svcHistory")}</summary>
                        <ul className="mt-2 w-72 max-w-full space-y-1 rounded-xl border border-line bg-white p-3 text-sm">
                          {history.length === 0 && <li className="text-muted">{t("svcHistoryNone")}</li>}
                          {history.map((l) => (
                            <li key={l.id}>
                              <b>{fmtDate(l.doneOn, lang)}</b>
                              {l.byName ? ` · ${l.byName}` : ""}
                              {l.cost ? ` · ${rupees(l.cost)}` : ""}
                              {l.note ? <span className="block text-xs text-muted">{l.note}</span> : null}
                            </li>
                          ))}
                        </ul>
                      </details>
                      {isOwner && (
                        <details>
                          <summary className="btn-secondary btn-sm cursor-pointer list-none [&::-webkit-details-marker]:hidden">{t("svcEdit")}</summary>
                          <div className="mt-2 rounded-xl border border-line bg-white p-3">
                            <ActionForm action={updateService.bind(null, j.id)} submitLabel={t("save")} cols>
                              <JobFields
                                properties={properties}
                                defaultDate={toDateInput(j.nextDue)}
                                initial={{ title: j.title, category: j.category, every: j.everyDays, nextDue: toDateInput(j.nextDue), propertyId: j.propertyId, vendorName: j.vendorName, vendorPhone: j.vendorPhone, cost: j.cost, remindDays: j.remindDays }}
                              />
                            </ActionForm>
                            <div className="mt-2 border-t border-line pt-2">
                              <ActionButton action={deleteJob.bind(null, j.id)} label={t("delete")} className="text-sm text-muted hover:text-red-700 hover:underline" confirm={t("jobDeleteConfirm")} />
                            </div>
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  async function Checklists() {
    // This period's ticks, plus the last 7 periods for the history dots.
    const since = addDays(asOf, -7 * 7);
    const runs = checklists.length ? await db.checklistRun.findMany({ where: { checklistId: { in: checklists.map((c) => c.id) }, period: { gte: since } } }) : [];
    const runOf = (id: string, period: Date) => runs.find((r) => r.checklistId === id && r.period.getTime() === period.getTime());
    return (
      <div className="space-y-4">
        {checklists.length === 0 && <EmptyState title={t("ckNone")} />}
        <div className="grid gap-4 lg:grid-cols-2">
          {checklists.map((c) => {
            const weekly = c.frequency === "WEEKLY";
            const period = periodFor(c.frequency, asOf);
            const run = runOf(c.id, period);
            const past = Array.from({ length: 7 }, (_, i) => addDays(period, -(7 - i) * (weekly ? 7 : 1)));
            return (
              <Card key={c.id}>
                <div className="space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-base font-semibold text-brand-900">{c.title}</p>
                      <p className="text-sm text-muted">
                        {weekly ? t("ckThisWeek") : t("ckToday")} · {weekly ? t("ckWeekly") : t("ckDaily")}
                        {c.propertyId ? ` · ${pgName(c.propertyId)}` : ""}
                      </p>
                    </div>
                    {isOwner && <ActionButton action={deleteChecklist.bind(null, c.id)} label={t("delete")} className="text-sm text-muted hover:text-red-700 hover:underline" confirm={t("ckDeleteConfirm")} />}
                  </div>
                  <ChecklistCard id={c.id} items={c.items} done={run?.doneItems ?? []} />
                  {run?.byName && <p className="text-xs text-muted">{t("ckBy", { name: run.byName, time: run.updatedAt.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }) })}</p>}
                  <div className="flex items-center gap-2 text-xs text-muted">
                    {t("ckHistory")}:
                    {past.map((p) => {
                      const st = runState(runOf(c.id, p)?.doneItems, c.items);
                      return <span key={p.toISOString()} title={fmtDate(p, lang)} className={`inline-block h-3 w-3 rounded-full ${st === "done" ? "bg-brand-600" : st === "part" ? "bg-marigold-400" : "bg-red-300"}`} />;
                    })}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
        {isOwner && (
          <FoldCard title={t("ckAddTitle")} open={checklists.length === 0}>
            <div className="space-y-4 px-4 pb-4 sm:px-5">
              <div>
                <p className="mb-2 text-sm text-muted">{t("ckReady")}</p>
                <div className="flex flex-wrap gap-2">
                  {CHECKLIST_PRESETS.map((p) => (
                    <ActionButton key={p.key} action={addChecklistPreset.bind(null, p.key, null)} label={`+ ${t(p.key as MsgKey)}`} className="btn-secondary" />
                  ))}
                </div>
              </div>
              <div className="border-t border-line pt-4">
                <p className="mb-2 text-sm font-semibold text-brand-900">{t("ckCustom")}</p>
                <ActionForm action={addChecklist} submitLabel={t("add")} cols resetOnSuccess>
                  <label className="block">
                    <span className="label">{t("ckName")}</span>
                    <input name="title" className="input" maxLength={80} required />
                  </label>
                  <label className="block">
                    <span className="label">{t("ckFreq")}</span>
                    <select name="frequency" className="input" defaultValue="DAILY">
                      <option value="DAILY">{t("ckDaily")}</option>
                      <option value="WEEKLY">{t("ckWeekly")}</option>
                    </select>
                  </label>
                  {properties.length > 1 && (
                    <label className="block">
                      <span className="label">{t("propertyLabel")}</span>
                      <select name="propertyId" className="input" defaultValue="">
                        <option value="">{t("svcAllPgs")}</option>
                        {properties.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </label>
                  )}
                  <label className="col-span-full block">
                    <span className="label">{t("ckItems")}</span>
                    <textarea name="items" className="input" rows={5} required />
                  </label>
                </ActionForm>
              </div>
            </div>
          </FoldCard>
        )}
      </div>
    );
  }

  async function Equipment() {
    const dateChip = (d: Date | null, ends: MsgKey, ended: MsgKey) => {
      if (!d) return null;
      const days = diffDays(d, asOf);
      const tone = days < 0 ? "red" : days <= 30 ? "amber" : "green";
      return <Badge tone={tone}>{t(days < 0 ? ended : ends, { date: fmtDate(d, lang) })}</Badge>;
    };
    return (
      <div className="space-y-4">
        {assets.length === 0 ? (
          <EmptyState title={t("eqNone")} />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {assets.map((a) => (
              <Card key={a.id}>
                <div className="space-y-1" data-testid="asset">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-base font-semibold text-brand-900">
                      {a.name} <span className="text-sm font-normal text-muted">· {t(`kind_${a.kind}` as MsgKey)}</span>
                    </p>
                    {isOwner && <ActionButton action={deleteAsset.bind(null, a.id)} label={t("delete")} className="text-sm text-muted hover:text-red-700 hover:underline" confirm={t("eqDeleteConfirm")} />}
                  </div>
                  <p className="text-sm text-muted">{[a.location, a.propertyId ? pgName(a.propertyId) : null, a.boughtOn ? `${t("eqBought")}: ${fmtDate(a.boughtOn, lang)}` : null].filter(Boolean).join(" · ")}</p>
                  <div className="flex flex-wrap gap-2">
                    {dateChip(a.warrantyUntil, "eqWarrantyEnds", "eqWarrantyEnded")}
                    {dateChip(a.amcUntil, "eqAmcEnds", "eqAmcEnded")}
                  </div>
                  {(a.vendorName || a.vendorPhone) && (
                    <p className="text-sm">
                      {a.vendorName}
                      {a.vendorPhone && (
                        <>
                          {" "}
                          <span className="text-muted">{a.vendorPhone}</span>{" "}
                          <a className="text-brand-600 underline" href={`tel:${a.vendorPhone}`}>{t("svcCall")}</a>
                        </>
                      )}
                    </p>
                  )}
                  {a.notes && <p className="text-sm text-muted">{a.notes}</p>}
                </div>
              </Card>
            ))}
          </div>
        )}
        {isOwner && (
          <FoldCard title={t("eqAddTitle")} open={assets.length === 0}>
            <div className="px-4 pb-4 sm:px-5">
              <ActionForm action={addAsset} submitLabel={t("add")} cols resetOnSuccess>
                <label className="block">
                  <span className="label">{t("eqName")}</span>
                  <input name="name" className="input" maxLength={80} required placeholder="Kent RO, 2nd floor" />
                </label>
                <label className="block">
                  <span className="label">{t("eqKind")}</span>
                  <select name="kind" className="input" defaultValue="RO">
                    {ASSET_KINDS.map((k) => (
                      <option key={k} value={k}>{t(`kind_${k}` as MsgKey)}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="label">{t("eqLocation")}</span>
                  <input name="location" className="input" maxLength={80} />
                </label>
                {properties.length > 1 && (
                  <label className="block">
                    <span className="label">{t("propertyLabel")}</span>
                    <select name="propertyId" className="input" defaultValue="">
                      <option value="">{t("svcAllPgs")}</option>
                      {properties.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </label>
                )}
                <label className="block">
                  <span className="label">{t("eqBought")}</span>
                  <input name="boughtOn" type="date" className="input" />
                </label>
                <label className="block">
                  <span className="label">{t("eqWarranty")}</span>
                  <input name="warrantyUntil" type="date" className="input" />
                </label>
                <label className="block">
                  <span className="label">{t("eqAmc")}</span>
                  <input name="amcUntil" type="date" className="input" />
                </label>
                <label className="block">
                  <span className="label">{t("svcVendor")}</span>
                  <input name="vendorName" className="input" maxLength={80} />
                </label>
                <label className="block">
                  <span className="label">{t("svcVendorPhone")}</span>
                  <input name="vendorPhone" type="tel" inputMode="numeric" className="input" maxLength={20} />
                </label>
                <label className="col-span-full block">
                  <span className="label">{t("note")}</span>
                  <input name="notes" className="input" maxLength={300} />
                </label>
              </ActionForm>
            </div>
          </FoldCard>
        )}
      </div>
    );
  }
}
