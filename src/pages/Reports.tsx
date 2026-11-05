import { useDB } from "../store";
import { Button, Card, PageHeader, Table, Td } from "../components/ui";
import { dueAmount, downloadCsv, inr, monthKey, monthLabel, paidAmount, shiftMonth } from "../utils";

export default function Reports() {
  const db = useDB();
  const months = Array.from({ length: 6 }, (_, i) => shiftMonth(monthKey(), i - 5));
  const data = months.map(m => {
    const inv = db.invoices.filter(i => i.month === m);
    const income = inv.reduce((s, i) => s + paidAmount(i), 0);
    const dues = inv.reduce((s, i) => s + dueAmount(i), 0);
    const exp = db.expenses.filter(e => e.date.startsWith(m)).reduce((s, e) => s + e.amount, 0);
    return { m, income, dues, exp, profit: income - exp };
  });
  const max = Math.max(1, ...data.flatMap(d => [d.income, d.exp]));

  const byProp = db.properties.map(p => {
    const beds = db.rooms.filter(r => r.propertyId === p.id).reduce((s, r) => s + r.capacity, 0);
    const occ = db.tenants.filter(t => t.propertyId === p.id && t.status !== "vacated").length;
    return { name: p.name, beds, occ };
  });

  return (
    <>
      <PageHeader title="Reports" subtitle="Last 6 months"
        action={<Button variant="ghost" onClick={() => downloadCsv("neravu-report.csv",
          [["Month", "Collected", "Pending", "Expenses", "Profit"], ...data.map(d => [monthLabel(d.m), d.income, d.dues, d.exp, d.profit])])}>Export CSV</Button>} />
      <Card className="mb-6 p-4">
        <h2 className="mb-4 font-semibold">Income vs expenses</h2>
        <div className="flex h-48 items-end gap-4">
          {data.map(d => (
            <div key={d.m} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex h-40 w-full items-end justify-center gap-1">
                <div className="w-1/3 rounded-t bg-emerald-500" style={{ height: `${(d.income / max) * 100}%` }} title={`Income ${inr(d.income)}`} />
                <div className="w-1/3 rounded-t bg-rose-400" style={{ height: `${(d.exp / max) * 100}%` }} title={`Expenses ${inr(d.exp)}`} />
              </div>
              <span className="text-xs text-slate-500">{monthLabel(d.m).slice(0, 3)}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500"><span className="text-emerald-600">■</span> Income &nbsp; <span className="text-rose-500">■</span> Expenses</p>
      </Card>
      <Card className="mb-6">
        <Table head={["Month", "Collected", "Pending", "Expenses", "Profit"]}>
          {data.map(d => <tr key={d.m}><Td>{monthLabel(d.m)}</Td><Td>{inr(d.income)}</Td><Td>{inr(d.dues)}</Td><Td>{inr(d.exp)}</Td>
            <Td className={d.profit >= 0 ? "text-emerald-600" : "text-red-600"}>{inr(d.profit)}</Td></tr>)}
        </Table>
      </Card>
      <Card>
        <Table head={["Property", "Beds", "Occupied", "Occupancy"]}>
          {byProp.map(p => <tr key={p.name}><Td>{p.name}</Td><Td>{p.beds}</Td><Td>{p.occ}</Td>
            <Td>{p.beds ? Math.round((p.occ / p.beds) * 100) : 0}%</Td></tr>)}
        </Table>
      </Card>
    </>
  );
}
