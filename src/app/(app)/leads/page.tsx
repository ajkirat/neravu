import Link from "next/link";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { today, toDateInput } from "@/lib/dates";
import { fmtDate, whatsappNumber } from "@/lib/format";
import { followUpDue, isOpenLead, leadStatusLabel } from "@/lib/leads";
import { createLead } from "@/app/actions/leads";
import { ActionForm } from "@/components/action-form";
import { LeadControls } from "@/components/lead-controls";
import { Badge, Card, EmptyState, Field, PageHeader, Stat } from "@/components/ui";

export const metadata = { title: "Leads" };

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const sp = await searchParams;
  const owner = await requireOwner();
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
        title="Leads"
        subtitle="Enquiries from your property QR codes, plus anyone you add by hand."
        actions={
          <Link href={showAll ? "/leads" : "/leads?show=all"} className="btn-secondary">
            {showAll ? "Show open only" : "Show all"}
          </Link>
        }
      />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Open leads" value={all.filter((l) => isOpenLead(l.status)).length} />
        <Stat label="New" value={all.filter((l) => l.status === "NEW").length} tone="good" />
        <Stat label="Follow-ups due" value={dueCount} tone={dueCount ? "warn" : "default"} />
        <Stat label="Won" value={all.filter((l) => l.status === "WON").length} />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {leads.length === 0 ? (
            <EmptyState
              title="No leads yet"
              body="Open a property and print its enquiry QR code. Anyone who scans it lands here."
            />
          ) : (
            leads.map((l) => (
              <Card key={l.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {l.name}{" "}
                      <Badge tone={l.status === "WON" ? "green" : l.status === "LOST" ? "gray" : "amber"}>
                        {leadStatusLabel[l.status] ?? l.status}
                      </Badge>{" "}
                      {l.source === "QR" && <Badge tone="green">QR</Badge>}
                    </p>
                    <p className="text-sm text-muted">
                      <a href={`tel:${l.phone}`} className="hover:underline">
                        {l.phone}
                      </a>{" "}
                      · {l.property?.name ?? "Any property"} · {fmtDate(l.createdAt)}
                    </p>
                    {l.note && <p className="mt-1 text-sm">{l.note}</p>}
                    {followUpDue(l, asOf) && (
                      <p className="mt-1 text-xs font-medium text-red-700">Follow up due {fmtDate(l.followUpOn)}</p>
                    )}
                  </div>
                  <a
                    className="btn-accent btn-sm"
                    target="_blank"
                    rel="noreferrer"
                    href={`https://wa.me/${whatsappNumber(l.phone)}?text=${encodeURIComponent(
                      `Hi ${l.name.split(" ")[0]}, thanks for your enquiry about ${owner.businessName ?? l.property?.name ?? "our PG"}. When would you like to visit?`,
                    )}`}
                  >
                    WhatsApp
                  </a>
                </div>
                <div className="mt-3 border-t border-line pt-3">
                  <LeadControls id={l.id} status={l.status} followUp={l.followUpOn ? toDateInput(l.followUpOn) : ""} />
                </div>
              </Card>
            ))
          )}
        </div>
        <Card title="Add a lead">
          <ActionForm action={createLead} submitLabel="Add lead" resetOnSuccess>
            <Field label="Name">
              <input name="name" className="input" required maxLength={80} />
            </Field>
            <Field label="Phone">
              <input name="phone" type="tel" className="input" required />
            </Field>
            <Field label="Interested in">
              <select name="propertyId" className="input" defaultValue="">
                <option value="">Any property</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Note">
              <input name="note" className="input" maxLength={500} />
            </Field>
            <Field label="Follow up on">
              <input name="followUpOn" type="date" className="input" />
            </Field>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
