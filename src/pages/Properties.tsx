import { FormEvent, useState } from "react";
import { actions, useDB } from "../store";
import { Badge, Button, Card, Empty, Field, Input, Modal, PageHeader } from "../components/ui";
import { inr } from "../utils";

export default function Properties() {
  const db = useDB();
  const [modal, setModal] = useState<"property" | string | null>(null);

  const addProperty = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    actions.addProperty({ name: f.get("name") as string, address: f.get("address") as string, city: f.get("city") as string });
    setModal(null);
  };
  const addRoom = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    actions.addRoom({ propertyId: modal!, name: f.get("name") as string, floor: +f.get("floor")!, capacity: +f.get("capacity")!, rent: +f.get("rent")!, deposit: +f.get("deposit")! });
    setModal(null);
  };

  return (
    <>
      <PageHeader title="Properties & Rooms" subtitle="Manage your PG buildings, rooms and bed occupancy"
        action={<Button onClick={() => setModal("property")}>+ Add property</Button>} />
      {db.properties.length === 0 && <Card><Empty text="Add your first property to get started." /></Card>}
      <div className="space-y-6">
        {db.properties.map(p => {
          const rooms = db.rooms.filter(r => r.propertyId === p.id);
          return (
            <Card key={p.id} className="p-4">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div><h2 className="font-semibold">{p.name}</h2><p className="text-sm text-slate-500">{p.address}, {p.city}</p></div>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setModal(p.id)}>+ Add room</Button>
                  <Button variant="danger" onClick={() => confirm(`Delete ${p.name} and its rooms?`) && actions.deleteProperty(p.id)}>Delete</Button>
                </div>
              </div>
              {rooms.length === 0 ? <Empty text="No rooms yet." /> : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {rooms.map(r => {
                    const occupants = db.tenants.filter(t => t.roomId === r.id && t.status !== "vacated");
                    const free = r.capacity - occupants.length;
                    return (
                      <div key={r.id} className="rounded-lg border border-slate-200 p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Room {r.name} <span className="text-xs text-slate-400">· Floor {r.floor}</span></span>
                          <Badge tone={free > 0 ? "green" : "slate"}>{free > 0 ? `${free} vacant` : "Full"}</Badge>
                        </div>
                        <p className="text-sm text-slate-500">{r.capacity}-sharing · {inr(r.rent)}/bed · deposit {inr(r.deposit)}</p>
                        <div className="mt-2 flex gap-1">
                          {Array.from({ length: r.capacity }, (_, k) => (
                            <span key={k} title={occupants[k]?.name ?? "Vacant"}
                              className={`h-5 flex-1 rounded ${occupants[k] ? "bg-brand-500" : "bg-slate-200"}`} />
                          ))}
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{occupants.map(o => o.name).join(", ") || "Empty"}</p>
                        {occupants.length === 0 && (
                          <button className="mt-1 text-xs text-red-500" onClick={() => actions.deleteRoom(r.id)}>Remove room</button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {modal === "property" && (
        <Modal title="Add property" onClose={() => setModal(null)}>
          <form onSubmit={addProperty} className="space-y-3">
            <Field label="Name"><Input name="name" required /></Field>
            <Field label="Address"><Input name="address" required /></Field>
            <Field label="City"><Input name="city" required /></Field>
            <Button type="submit" className="w-full">Save</Button>
          </form>
        </Modal>
      )}
      {modal && modal !== "property" && (
        <Modal title="Add room" onClose={() => setModal(null)}>
          <form onSubmit={addRoom} className="grid grid-cols-2 gap-3">
            <Field label="Room no."><Input name="name" required /></Field>
            <Field label="Floor"><Input name="floor" type="number" defaultValue={1} required /></Field>
            <Field label="Beds (sharing)"><Input name="capacity" type="number" min={1} defaultValue={2} required /></Field>
            <Field label="Rent per bed (₹)"><Input name="rent" type="number" min={0} required /></Field>
            <Field label="Deposit per bed (₹)"><Input name="deposit" type="number" min={0} required /></Field>
            <div className="col-span-2"><Button type="submit" className="w-full">Save</Button></div>
          </form>
        </Modal>
      )}
    </>
  );
}
