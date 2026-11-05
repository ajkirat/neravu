import { FormEvent, useState } from "react";
import { actions, useDB } from "../store";
import { Badge, Button, Field, Input, Modal } from "./ui";
import { dueAmount, fmtDate, inr, invoiceState, monthLabel, paidAmount, today } from "../utils";
import type { Tenant } from "../types";

/** Owner-side view of a tenant's rent passbook. */
export function LedgerModal({ tenant, onClose }: { tenant: Tenant; onClose: () => void }) {
  const { invoices } = useDB();
  const rows = invoices.filter(i => i.tenantId === tenant.id).sort((a, b) => b.month.localeCompare(a.month));
  const billed = rows.reduce((s, i) => s + i.amount, 0), paid = rows.reduce((s, i) => s + paidAmount(i), 0);
  return (
    <Modal title={`Ledger – ${tenant.name}`} onClose={onClose}>
      <div className="mb-3 grid grid-cols-3 gap-2 text-center text-sm">
        <div className="rounded-lg bg-slate-50 p-2"><p className="text-xs text-slate-500">Billed</p><p className="font-semibold">{inr(billed)}</p></div>
        <div className="rounded-lg bg-slate-50 p-2"><p className="text-xs text-slate-500">Paid</p><p className="font-semibold text-emerald-600">{inr(paid)}</p></div>
        <div className="rounded-lg bg-slate-50 p-2"><p className="text-xs text-slate-500">Outstanding</p><p className="font-semibold text-red-600">{inr(billed - paid)}</p></div>
      </div>
      <p className="mb-2 text-sm text-slate-500">Security deposit held: <b>{inr(tenant.deposit)}</b></p>
      {rows.length === 0 ? <p className="py-4 text-center text-sm text-slate-500">No invoices yet.</p> : (
        <ul className="divide-y divide-slate-100 text-sm">
          {rows.map(i => (
            <li key={i.id} className="py-2">
              <div className="flex items-center justify-between"><span className="font-medium">{monthLabel(i.month)}</span>
                <span>{inr(i.amount)} <Badge tone={{ paid: "green", partial: "amber", overdue: "red", pending: "slate" }[invoiceState(i)] as any}>{invoiceState(i)}</Badge></span></div>
              {i.payments.map((p, k) => <p key={k} className="text-xs text-slate-500">{fmtDate(p.date)} · {p.mode} · {inr(p.amount)}</p>)}
            </li>
          ))}
        </ul>
      )}
      {tenant.settlement && (
        <p className="mt-3 rounded-lg bg-slate-50 p-2 text-sm">Settled on {fmtDate(tenant.settlement.date)} · refund {inr(tenant.settlement.refund)}</p>
      )}
    </Modal>
  );
}

/** Printable rent agreement from a standard template. Not legal advice. */
export function AgreementModal({ tenant, onClose }: { tenant: Tenant; onClose: () => void }) {
  const { settings, rooms, properties } = useDB();
  const room = rooms.find(r => r.id === tenant.roomId), prop = properties.find(p => p.id === tenant.propertyId);
  return (
    <Modal title="Rent agreement" onClose={onClose}>
      <div className="print-area space-y-3 text-sm leading-relaxed">
        <h3 className="text-center text-base font-semibold">PAYING GUEST / RENT AGREEMENT</h3>
        <p>This agreement is made on {fmtDate(today())} between <b>{settings.ownerName || settings.pgName}</b> (“Owner”, {settings.pgName}) and <b>{tenant.name}</b>
          ({tenant.idType} {tenant.idNumber}, phone {tenant.phone}) (“Occupant”).</p>
        <p>1. The Owner grants the Occupant a bed in Room {room?.name} at {prop?.address}, {prop?.city}, from {fmtDate(tenant.joinDate)}.</p>
        <p>2. Monthly rent is <b>{inr(tenant.rent)}</b>, payable on or before day {settings.dueDay} of each month.</p>
        <p>3. A refundable security deposit of <b>{inr(tenant.deposit)}</b> is paid, refundable at check-out after adjusting dues and damages.</p>
        <p>4. The Occupant shall follow house rules, keep the premises clean, and not sublet or bring unauthorised guests.</p>
        <p>5. Either party may end this agreement with 30 days’ written notice.</p>
        <div className="grid grid-cols-2 gap-8 pt-10"><p className="border-t border-slate-400 pt-1">Owner signature</p><p className="border-t border-slate-400 pt-1">Occupant signature</p></div>
        <p className="text-xs text-slate-400">Template only — have it reviewed for your state’s rules before use.</p>
      </div>
      <div className="no-print mt-4"><Button onClick={() => window.print()}>Print / Save PDF</Button></div>
    </Modal>
  );
}

/** Check-out with deposit settlement: dues and deductions are adjusted against the deposit. */
export function SettlementModal({ tenant, onClose }: { tenant: Tenant; onClose: () => void }) {
  const { invoices } = useDB();
  const dues = invoices.filter(i => i.tenantId === tenant.id).reduce((s, i) => s + dueAmount(i), 0);
  const [damages, setDamages] = useState(0), [other, setOther] = useState(0), [note, setNote] = useState("");
  const refund = tenant.deposit - dues - damages - other;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    actions.checkout(tenant.id, { date: today(), deposit: tenant.deposit, dues, damages, other, note, refund });
    onClose();
  };
  return (
    <Modal title={`Check out – ${tenant.name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3 text-sm">
        <div className="flex justify-between"><span>Security deposit</span><b>{inr(tenant.deposit)}</b></div>
        <div className="flex justify-between text-red-600"><span>Unpaid rent dues</span><b>− {inr(dues)}</b></div>
        <Field label="Damages (₹)"><Input type="number" min={0} value={damages} onChange={e => setDamages(Math.max(0, +e.target.value))} /></Field>
        <Field label="Other deductions (₹)"><Input type="number" min={0} value={other} onChange={e => setOther(Math.max(0, +e.target.value))} /></Field>
        <Field label="Note"><Input value={note} onChange={e => setNote(e.target.value)} /></Field>
        <div className="flex justify-between border-t border-slate-200 pt-3 text-base">
          <span>{refund >= 0 ? "Refund to tenant" : "Tenant still owes"}</span>
          <b className={refund >= 0 ? "text-emerald-600" : "text-red-600"}>{inr(Math.abs(refund))}</b></div>
        <Button type="submit" className="w-full">Confirm check-out</Button>
      </form>
    </Modal>
  );
}
