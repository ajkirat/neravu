import { FormEvent, useEffect, useState } from "react";
import { actions, refresh, useDB } from "../store";
import { Badge, Button, Card, Empty, Field, Input, Modal, PageHeader, Select } from "../components/ui";
import { fmtDate, today } from "../utils";
import type { Lead, LeadStatus } from "../types";

const STATUS: Record<LeadStatus, string> = { new: "New", contacted: "Contacted", visit: "Visit scheduled", won: "Won", lost: "Lost" };
const tone = { new: "blue", contacted: "amber", visit: "amber", won: "green", lost: "slate" } as const;

export default function Leads() {
  const db = useDB();
  useEffect(() => { refresh(); }, []);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("open");
  const rows = [...db.leads].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .filter(l => filter === "all" || (filter === "open" ? l.status !== "won" && l.status !== "lost" : l.status === filter));
  const dueToday = db.leads.filter(l => l.followUp && l.followUp <= today() && l.status !== "won" && l.status !== "lost").length;

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget), g = (k: string) => f.get(k) as string;
    actions.addLead({ name: g("name"), phone: g("phone"), note: g("note"), propertyId: g("propertyId") || undefined, followUp: g("followUp") || undefined });
    setOpen(false);
  };
  const wa = (l: Lead) => window.open(`https://wa.me/${l.phone.replace(/\D/g, "").replace(/^(\d{10})$/, "91$1")}?text=${encodeURIComponent(`Hi ${l.name}, thanks for your enquiry about ${db.settings.pgName}. When would you like to visit?`)}`, "_blank");

  return (
    <>
      <PageHeader title="Leads" subtitle={dueToday ? `${dueToday} follow-up(s) due` : "Enquiries from your QR code and manual entries"}
        action={<div className="flex gap-2">
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="open">Open</option><option value="all">All</option>
            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <Button onClick={() => setOpen(true)}>+ Add lead</Button></div>} />
      {rows.length === 0 ? <Card><Empty text="No leads here. Print a property QR code from Properties to start collecting enquiries." /></Card> : (
        <div className="space-y-3">
          {rows.map(l => (
            <Card key={l.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="font-medium">{l.name} <Badge tone={tone[l.status]}>{STATUS[l.status]}</Badge> {l.source === "qr" && <Badge tone="blue">QR</Badge>}</p>
                <p className="text-sm text-slate-500">{l.phone} · {db.properties.find(p => p.id === l.propertyId)?.name ?? "Any property"} · {fmtDate(l.createdAt)}</p>
                {l.note && <p className="mt-1 text-sm">{l.note}</p>}
                {l.followUp && <p className={`text-xs ${l.followUp <= today() && l.status !== "won" && l.status !== "lost" ? "text-red-600" : "text-slate-500"}`}>Follow up: {fmtDate(l.followUp)}</p>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Input type="date" value={l.followUp ?? ""} onChange={e => actions.updateLead(l.id, { followUp: e.target.value || undefined })} />
                <select className="rounded-lg border border-slate-300 px-2 py-2 text-sm" value={l.status}
                  onChange={e => actions.updateLead(l.id, { status: e.target.value as LeadStatus })}>
                  {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                <Button variant="ghost" onClick={() => wa(l)}>WhatsApp</Button>
                <button className="text-xs text-red-500" onClick={() => confirm("Delete this lead?") && actions.deleteLead(l.id)}>Delete</button>
              </div>
            </Card>
          ))}
        </div>
      )}
      {open && (
        <Modal title="Add lead" onClose={() => setOpen(false)}>
          <form onSubmit={submit} className="space-y-3">
            <Field label="Name"><Input name="name" required /></Field>
            <Field label="Phone"><Input name="phone" required pattern="[0-9+ \-]{7,20}" /></Field>
            <Field label="Interested in"><Select name="propertyId"><option value="">Any property</option>
              {db.properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
            <Field label="Note"><Input name="note" /></Field>
            <Field label="Follow-up date"><Input name="followUp" type="date" /></Field>
            <Button type="submit" className="w-full">Save</Button>
          </form>
        </Modal>
      )}
    </>
  );
}
