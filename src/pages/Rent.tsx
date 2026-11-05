import { FormEvent, useState } from "react";
import { actions, useDB } from "../store";
import { Badge, Button, Card, Empty, Field, Input, Modal, PageHeader, Select, Stat, Table, Td } from "../components/ui";
import { dueAmount, fmtDate, inr, invoiceState, monthKey, monthLabel, paidAmount, shiftMonth, today, whatsappLink } from "../utils";
import type { PayMode } from "../types";

const tone = { paid: "green", partial: "amber", overdue: "red", pending: "slate" } as const;

export default function Rent() {
  const db = useDB();
  const [month, setMonth] = useState(monthKey());
  const [paying, setPaying] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  const invoices = db.invoices.filter(i => i.month === month);
  const total = invoices.reduce((s, i) => s + i.amount, 0);
  const got = invoices.reduce((s, i) => s + paidAmount(i), 0);
  const inv = db.invoices.find(i => i.id === paying);
  const tenant = (id: string) => db.tenants.find(t => t.id === id)!;

  const generate = () => {
    const n = actions.generateInvoices(month);
    setMsg(n ? `Generated ${n} invoice(s).` : "All active tenants already have an invoice for this month.");
  };
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    actions.recordPayment(paying!, { date: f.get("date") as string, amount: +f.get("amount")!, mode: f.get("mode") as PayMode });
    setPaying(null);
  };
  const reminder = (invId: string) => {
    const i = db.invoices.find(x => x.id === invId)!;
    const text = db.settings.reminderTemplate.replace("{name}", tenant(i.tenantId).name)
      .replace("{amount}", inr(dueAmount(i))).replace("{month}", monthLabel(i.month)).replace("{pg}", db.settings.pgName);
    window.open(whatsappLink(tenant(i.tenantId), text), "_blank");
  };

  return (
    <>
      <PageHeader title="Rent & Payments" subtitle="Generate monthly rent, record payments, send reminders"
        action={<div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => setMonth(shiftMonth(month, -1))}>←</Button>
          <span className="w-36 text-center text-sm font-medium">{monthLabel(month)}</span>
          <Button variant="ghost" onClick={() => setMonth(shiftMonth(month, 1))}>→</Button>
        </div>} />
      <div className="mb-4 grid grid-cols-3 gap-4">
        <Stat label="Billed" value={inr(total)} /><Stat label="Collected" value={inr(got)} tone="text-emerald-600" />
        <Stat label="Pending" value={inr(total - got)} tone="text-red-600" />
      </div>
      <Card>
        <div className="flex items-center gap-3 p-4">
          <Button onClick={generate}>Generate invoices</Button>
          {msg && <span className="text-sm text-slate-500">{msg}</span>}
        </div>
        {invoices.length === 0 ? <Empty text="No invoices for this month yet." /> : (
          <Table head={["Tenant", "Amount", "Paid", "Balance", "Due", "Status", ""]}>
            {invoices.map(i => {
              const s = invoiceState(i);
              return (
                <tr key={i.id}>
                  <Td className="font-medium">{tenant(i.tenantId)?.name}</Td><Td>{inr(i.amount)}</Td>
                  <Td>{inr(paidAmount(i))}</Td><Td>{inr(dueAmount(i))}</Td><Td>{fmtDate(i.dueDate)}</Td>
                  <Td><Badge tone={tone[s]}>{s}</Badge></Td>
                  <Td className="space-x-2 whitespace-nowrap text-xs">
                    {s !== "paid" && <button className="text-brand-600" onClick={() => setPaying(i.id)}>Record payment</button>}
                    {s !== "paid" && <button className="text-emerald-600" onClick={() => reminder(i.id)}>WhatsApp reminder</button>}
                  </Td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>

      {inv && (
        <Modal title={`Payment – ${tenant(inv.tenantId).name}`} onClose={() => setPaying(null)}>
          <form onSubmit={submit} className="space-y-3">
            <Field label={`Amount (balance ${inr(dueAmount(inv))})`}>
              <Input name="amount" type="number" min={1} max={dueAmount(inv)} defaultValue={dueAmount(inv)} required /></Field>
            <Field label="Date"><Input name="date" type="date" defaultValue={today()} required /></Field>
            <Field label="Mode"><Select name="mode">{["UPI", "Cash", "Bank Transfer", "Card"].map(m => <option key={m}>{m}</option>)}</Select></Field>
            <Button type="submit" className="w-full">Save payment</Button>
          </form>
        </Modal>
      )}
    </>
  );
}
