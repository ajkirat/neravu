import { FormEvent, useState } from "react";
import { actions, useDB } from "../store";
import { Button, Card, Empty, Field, Input, Modal, PageHeader, Select, Stat, Table, Td } from "../components/ui";
import { fmtDate, inr, monthKey, today } from "../utils";
import { EXPENSE_CATEGORIES } from "../types";

export default function Expenses() {
  const db = useDB();
  const [open, setOpen] = useState(false);
  const rows = [...db.expenses].sort((a, b) => b.date.localeCompare(a.date));
  const thisMonth = rows.filter(e => e.date.startsWith(monthKey())).reduce((s, e) => s + e.amount, 0);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget), g = (k: string) => f.get(k) as string;
    actions.addExpense({ propertyId: g("propertyId"), category: g("category"), amount: +g("amount"), date: g("date"), note: g("note") });
    setOpen(false);
  };

  return (
    <>
      <PageHeader title="Expenses" subtitle="Track electricity, food, maintenance and more"
        action={<Button onClick={() => setOpen(true)} disabled={!db.properties.length}>+ Add expense</Button>} />
      <div className="mb-4 max-w-xs"><Stat label="This month" value={inr(thisMonth)} /></div>
      <Card>
        {rows.length === 0 ? <Empty text="No expenses recorded." /> : (
          <Table head={["Date", "Property", "Category", "Note", "Amount", ""]}>
            {rows.map(e => (
              <tr key={e.id}><Td>{fmtDate(e.date)}</Td><Td>{db.properties.find(p => p.id === e.propertyId)?.name}</Td>
                <Td>{e.category}</Td><Td>{e.note}</Td><Td className="font-medium">{inr(e.amount)}</Td>
                <Td><button className="text-xs text-red-500" onClick={() => actions.deleteExpense(e.id)}>Delete</button></Td></tr>
            ))}
          </Table>
        )}
      </Card>
      {open && (
        <Modal title="Add expense" onClose={() => setOpen(false)}>
          <form onSubmit={submit} className="space-y-3">
            <Field label="Property"><Select name="propertyId">{db.properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
            <Field label="Category"><Select name="category">{EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}</Select></Field>
            <Field label="Amount (₹)"><Input name="amount" type="number" min={1} required /></Field>
            <Field label="Date"><Input name="date" type="date" defaultValue={today()} required /></Field>
            <Field label="Note"><Input name="note" /></Field>
            <Button type="submit" className="w-full">Save</Button>
          </form>
        </Modal>
      )}
    </>
  );
}
