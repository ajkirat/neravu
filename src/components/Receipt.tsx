import { useDB } from "../store";
import { Button, Modal } from "./ui";
import { fmtDate, inr, monthLabel, whatsappLink } from "../utils";

export function Receipt({ invoiceId, index, onClose }: { invoiceId: string; index: number; onClose: () => void }) {
  const { invoices, tenants, rooms, properties, settings } = useDB();
  const inv = invoices.find(i => i.id === invoiceId);
  const pay = inv?.payments[index];
  const tenant = tenants.find(t => t.id === inv?.tenantId);
  if (!inv || !pay || !tenant) return null;
  const room = rooms.find(r => r.id === tenant.roomId);
  const prop = properties.find(p => p.id === tenant.propertyId);
  const no = `${inv.month.replace("-", "")}-${inv.id.slice(0, 4).toUpperCase()}-${index + 1}`;
  const text = `Receipt ${no}: ${inr(pay.amount)} received from ${tenant.name} for ${monthLabel(inv.month)} rent on ${fmtDate(pay.date)} (${pay.mode}). – ${settings.pgName}`;

  return (
    <Modal title="Rent receipt" onClose={onClose}>
      <div className="print-area rounded-lg border border-slate-200 p-5 text-sm">
        <div className="mb-4 flex items-start justify-between">
          <div><p className="text-lg font-semibold">{settings.pgName}</p><p className="text-slate-500">{prop?.address}, {prop?.city}</p>
            {settings.ownerPhone && <p className="text-slate-500">{settings.ownerPhone}</p>}</div>
          <div className="text-right"><p className="font-semibold">RECEIPT</p><p className="text-slate-500">#{no}</p><p className="text-slate-500">{fmtDate(pay.date)}</p></div>
        </div>
        <dl className="grid grid-cols-2 gap-y-2">
          <dt className="text-slate-500">Received from</dt><dd>{tenant.name}</dd>
          <dt className="text-slate-500">Room</dt><dd>{room?.name}</dd>
          <dt className="text-slate-500">For</dt><dd>Rent – {monthLabel(inv.month)}</dd>
          <dt className="text-slate-500">Payment mode</dt><dd>{pay.mode}</dd>
          <dt className="text-slate-500">Amount received</dt><dd className="text-base font-semibold">{inr(pay.amount)}</dd>
        </dl>
        <p className="mt-4 text-xs text-slate-400">This is a computer-generated receipt.</p>
      </div>
      <div className="no-print mt-4 flex gap-2">
        <Button onClick={() => window.print()}>Print / Save PDF</Button>
        <Button variant="ghost" onClick={() => window.open(whatsappLink(tenant, text), "_blank")}>Share on WhatsApp</Button>
      </div>
    </Modal>
  );
}
