import { FormEvent, useState } from "react";
import { actions, useDB } from "../store";
import { Badge, Button, Card, Empty, Field, Input, Modal, PageHeader, Select } from "../components/ui";
import { fmtDate } from "../utils";
import type { ComplaintStatus } from "../types";

const tone = { open: "red", in_progress: "amber", resolved: "green" } as const;
const label = { open: "Open", in_progress: "In progress", resolved: "Resolved" } as const;

export default function Complaints() {
  const db = useDB();
  const [open, setOpen] = useState(false);
  const active = db.tenants.filter(t => t.status !== "vacated");
  const rows = [...db.complaints].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget), g = (k: string) => f.get(k) as string;
    const t = db.tenants.find(x => x.id === g("tenantId"))!;
    actions.addComplaint({ tenantId: t.id, propertyId: t.propertyId, title: g("title"), category: g("category"), description: g("description") });
    setOpen(false);
  };

  return (
    <>
      <PageHeader title="Complaints" subtitle="Log and resolve tenant issues"
        action={<Button onClick={() => setOpen(true)} disabled={!active.length}>+ Log complaint</Button>} />
      {rows.length === 0 ? <Card><Empty text="No complaints. Nice!" /></Card> : (
        <div className="space-y-3">
          {rows.map(c => (
            <Card key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium">{c.title} <Badge tone={tone[c.status]}>{label[c.status]}</Badge></p>
                <p className="text-sm text-slate-500">{db.tenants.find(t => t.id === c.tenantId)?.name} · {c.category} · {fmtDate(c.createdAt)}</p>
                {c.description && <p className="mt-1 text-sm">{c.description}</p>}
              </div>
              <select className="rounded-lg border border-slate-300 px-2 py-1 text-sm" value={c.status}
                onChange={e => actions.setComplaintStatus(c.id, e.target.value as ComplaintStatus)}>
                {Object.entries(label).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Card>
          ))}
        </div>
      )}
      {open && (
        <Modal title="Log complaint" onClose={() => setOpen(false)}>
          <form onSubmit={submit} className="space-y-3">
            <Field label="Tenant"><Select name="tenantId">{active.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></Field>
            <Field label="Category"><Select name="category">{["Electrical", "Plumbing", "Internet", "Food", "Cleaning", "Other"].map(c => <option key={c}>{c}</option>)}</Select></Field>
            <Field label="Title"><Input name="title" required /></Field>
            <Field label="Details"><Input name="description" /></Field>
            <Button type="submit" className="w-full">Save</Button>
          </form>
        </Modal>
      )}
    </>
  );
}
