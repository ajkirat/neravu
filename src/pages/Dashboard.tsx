import { Link } from "react-router-dom";
import { useDB } from "../store";
import { Badge, Card, PageHeader, Stat, Table, Td, Empty } from "../components/ui";
import { dueAmount, fmtDate, inr, invoiceState, monthKey, monthLabel, paidAmount } from "../utils";

export default function Dashboard() {
  const db = useDB();
  const m = monthKey();
  const active = db.tenants.filter(t => t.status !== "vacated");
  const beds = db.rooms.reduce((s, r) => s + r.capacity, 0);
  const occ = active.length;
  const inv = db.invoices.filter(i => i.month === m);
  const collected = inv.reduce((s, i) => s + paidAmount(i), 0);
  const pending = inv.reduce((s, i) => s + dueAmount(i), 0);
  const spent = db.expenses.filter(e => e.date.startsWith(m)).reduce((s, e) => s + e.amount, 0);
  const overdue = db.invoices.filter(i => invoiceState(i) === "overdue");
  const name = (id: string) => db.tenants.find(t => t.id === id)?.name ?? "—";

  return (
    <>
      <PageHeader title="Dashboard" subtitle={`${db.settings.pgName} · ${monthLabel(m)}`} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Occupancy" value={beds ? `${Math.round((occ / beds) * 100)}%` : "—"} hint={`${occ} of ${beds} beds filled`} />
        <Stat label="Vacant beds" value={String(Math.max(beds - occ, 0))} hint={`${db.properties.length} properties`} />
        <Stat label="Collected" value={inr(collected)} tone="text-emerald-600" hint="this month" />
        <Stat label="Pending dues" value={inr(pending)} tone="text-red-600" hint={`${overdue.length} overdue invoices`} />
        <Stat label="Expenses" value={inr(spent)} hint="this month" />
        <Stat label="Net profit" value={inr(collected - spent)} tone={collected - spent >= 0 ? "text-emerald-600" : "text-red-600"} hint="collected − expenses" />
        <Stat label="KYC pending" value={String(active.filter(t => t.kyc === "pending").length)} />
        <Stat label="Leads to follow up" value={String(db.leads.filter(l => l.status === "new" || (l.followUp && l.followUp <= new Date().toISOString().slice(0, 10) && l.status !== "won" && l.status !== "lost")).length)} />
        <Stat label="Open complaints" value={String(db.complaints.filter(c => c.status !== "resolved").length)} />
      </div>

      <Card className="mt-6">
        <div className="flex items-center justify-between p-4"><h2 className="font-semibold">Overdue rent</h2>
          <Link to="/rent" className="text-sm text-brand-600">Manage →</Link></div>
        {overdue.length === 0 ? <Empty text="No overdue rent 🎉" /> : (
          <Table head={["Tenant", "Month", "Due date", "Balance", ""]}>
            {overdue.map(i => (
              <tr key={i.id}><Td>{name(i.tenantId)}</Td><Td>{monthLabel(i.month)}</Td><Td>{fmtDate(i.dueDate)}</Td>
                <Td className="font-medium text-red-600">{inr(dueAmount(i))}</Td><Td><Badge tone="red">{invoiceState(i)}</Badge></Td></tr>
            ))}
          </Table>
        )}
      </Card>
    </>
  );
}
