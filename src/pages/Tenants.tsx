import { FormEvent, useState } from "react";
import { actions, useDB } from "../store";
import { Badge, Button, Card, Empty, Field, Input, Modal, PageHeader, Select, Table, Td } from "../components/ui";
import { fmtDate, inr, today } from "../utils";
import { AgreementModal, LedgerModal, SettlementModal } from "../components/TenantDocs";
import type { Tenant } from "../types";

export default function Tenants() {
  const db = useDB();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("active");
  const [adding, setAdding] = useState(false);
  const [doc, setDoc] = useState<{ kind: "ledger" | "agreement" | "checkout"; t: Tenant } | null>(null);
  const [propId, setPropId] = useState(db.properties[0]?.id ?? "");

  const rows = db.tenants.filter(t =>
    (filter === "all" || (filter === "active" ? t.status !== "vacated" : t.status === "vacated")) &&
    (t.name + t.phone).toLowerCase().includes(q.toLowerCase()));

  const roomsWithSpace = db.rooms.filter(r => r.propertyId === propId &&
    db.tenants.filter(t => t.roomId === r.id && t.status !== "vacated").length < r.capacity);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget), g = (k: string) => f.get(k) as string;
    const room = db.rooms.find(r => r.id === g("roomId"))!;
    actions.addTenant({
      name: g("name"), phone: g("phone"), email: g("email"), propertyId: room.propertyId, roomId: room.id,
      rent: +g("rent"), deposit: +g("deposit"), joinDate: g("joinDate"), kyc: "pending",
      idType: g("idType"), idNumber: g("idNumber"), emergencyContact: g("emergencyContact"),
    });
    setAdding(false);
  };

  return (
    <>
      <PageHeader title="Tenants" subtitle="Onboarding, KYC and move-outs"
        action={<Button onClick={() => setAdding(true)} disabled={db.rooms.length === 0}>+ Add tenant</Button>} />
      <Card>
        <div className="flex flex-wrap gap-3 p-4">
          <input className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Search name or phone"
            value={q} onChange={e => setQ(e.target.value)} />
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="active">Current</option><option value="vacated">Past tenants</option><option value="all">All</option>
          </select>
        </div>
        {rows.length === 0 ? <Empty text="No tenants found." /> : (
          <Table head={["Name", "Contact", "Room", "Rent", "Joined", "KYC", "Status", ""]}>
            {rows.map(t => {
              const room = db.rooms.find(r => r.id === t.roomId);
              const prop = db.properties.find(p => p.id === t.propertyId);
              return (
                <tr key={t.id}>
                  <Td className="font-medium">{t.name}</Td>
                  <Td>{t.phone}<div className="text-xs text-slate-400">{t.email}</div></Td>
                  <Td>{prop?.name.split("–").pop()?.trim()} · {room?.name}</Td>
                  <Td>{inr(t.rent)}</Td><Td>{fmtDate(t.joinDate)}</Td>
                  <Td><button onClick={() => actions.updateTenant(t.id, { kyc: t.kyc === "verified" ? "pending" : "verified" })}>
                    <Badge tone={t.kyc === "verified" ? "green" : "amber"}>{t.kyc}</Badge></button></Td>
                  <Td><Badge tone={t.status === "active" ? "green" : t.status === "notice" ? "amber" : "slate"}>{t.status === "notice" ? "on notice" : t.status}</Badge></Td>
                  <Td className="space-x-2 whitespace-nowrap text-xs">
                    {t.status === "active" && <button className="text-amber-600" onClick={() => actions.updateTenant(t.id, { status: "notice" })}>Notice</button>}
                    {t.status === "notice" && <button className="text-slate-500" onClick={() => actions.updateTenant(t.id, { status: "active" })}>Cancel notice</button>}
                    <button className="text-brand-600" onClick={() => setDoc({ kind: "ledger", t })}>Ledger</button>
                    <button className="text-brand-600" onClick={() => setDoc({ kind: "agreement", t })}>Agreement</button>
                    {t.status !== "vacated" && <button className="text-red-600" onClick={() => setDoc({ kind: "checkout", t })}>Check out</button>}
                    {t.status === "vacated" && <span className="text-slate-400">left {t.vacatedDate && fmtDate(t.vacatedDate)}</span>}
                  </Td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>

      {doc?.kind === "ledger" && <LedgerModal tenant={doc.t} onClose={() => setDoc(null)} />}
      {doc?.kind === "agreement" && <AgreementModal tenant={doc.t} onClose={() => setDoc(null)} />}
      {doc?.kind === "checkout" && <SettlementModal tenant={doc.t} onClose={() => setDoc(null)} />}
      {adding && (
        <Modal title="Add tenant" onClose={() => setAdding(false)}>
          <form onSubmit={submit} className="grid grid-cols-2 gap-3">
            <Field label="Full name"><Input name="name" required /></Field>
            <Field label="Phone"><Input name="phone" required pattern="[0-9+ -]{10,15}" /></Field>
            <Field label="Email"><Input name="email" type="email" /></Field>
            <Field label="Join date"><Input name="joinDate" type="date" defaultValue={today()} required /></Field>
            <Field label="Property">
              <Select value={propId} onChange={e => setPropId(e.target.value)}>
                {db.properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select></Field>
            <Field label="Room (with vacancy)">
              <Select name="roomId" required key={propId}>
                {roomsWithSpace.map(r => <option key={r.id} value={r.id}>Room {r.name} ({r.capacity}-sharing)</option>)}
              </Select></Field>
            <Field label="Rent (₹)"><Input name="rent" type="number" required defaultValue={roomsWithSpace[0]?.rent} key={"r" + propId} /></Field>
            <Field label="Deposit (₹)"><Input name="deposit" type="number" required defaultValue={roomsWithSpace[0]?.deposit} key={"d" + propId} /></Field>
            <Field label="ID type"><Select name="idType"><option>Aadhaar</option><option>PAN</option><option>Passport</option><option>Driving licence</option></Select></Field>
            <Field label="ID number"><Input name="idNumber" required /></Field>
            <div className="col-span-2"><Field label="Emergency contact"><Input name="emergencyContact" /></Field></div>
            <div className="col-span-2"><Button type="submit" className="w-full" disabled={roomsWithSpace.length === 0}>
              {roomsWithSpace.length === 0 ? "No vacant beds in this property" : "Save tenant"}</Button></div>
          </form>
        </Modal>
      )}
    </>
  );
}
