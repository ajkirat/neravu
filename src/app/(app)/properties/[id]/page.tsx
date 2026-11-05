import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { rupees } from "@/lib/format";
import { syncRentCharges, tenantBalances } from "@/lib/ledger";
import { ActionForm } from "@/components/action-form";
import { Badge, Card, EmptyState, Field, PageHeader, Stat } from "@/components/ui";
import {
  createRoom,
  deleteProperty,
  deleteRoom,
  updateProperty,
  updateRoom,
} from "@/app/actions/properties";

export default async function PropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owner = await requireOwner();
  const property = await db.property.findFirst({
    where: { id, ownerId: owner.id },
    include: {
      rooms: {
        include: {
          beds: {
            orderBy: { label: "asc" },
            include: {
              tenants: {
                where: { status: { in: ["ACTIVE", "NOTICE"] } },
                select: { id: true, name: true, status: true },
              },
            },
          },
        },
      },
    },
  });
  if (!property) notFound();
  await syncRentCharges(owner.id);
  const balances = await tenantBalances(owner.id, {
    propertyId: id,
    status: { in: ["ACTIVE", "NOTICE"] },
  });

  const rooms = [...property.rooms].sort((a, b) =>
    a.number.localeCompare(b.number, undefined, { numeric: true }),
  );
  const beds = rooms.flatMap((r) => r.beds);
  const occupied = beds.filter((b) => b.tenants.length).length;
  const potential = rooms.reduce((s, r) => s + r.rent * r.beds.length, 0);
  const dues = [...balances.values()].reduce((s, b) => s + b.outstanding, 0);

  return (
    <>
      <PageHeader
        back={{ href: "/properties", label: "Properties" }}
        title={property.name}
        subtitle={[property.address, property.city].filter(Boolean).join(", ") || undefined}
        actions={
          <>
            <Link href={`/properties/${property.id}/qr`} className="btn-secondary">
              Enquiry QR code
            </Link>
            <Link href={`/tenants/new?property=${property.id}`} className="btn-primary">
              Add tenant
            </Link>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Beds" value={beds.length} hint={`${rooms.length} rooms`} />
        <Stat label="Occupied" value={occupied} hint={`${beds.length - occupied} vacant`} tone="good" />
        <Stat label="Full-house rent" value={rupees(potential)} hint="per month" />
        <Stat label="Pending dues" value={rupees(dues)} tone={dues ? "warn" : "default"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {rooms.length === 0 && (
            <EmptyState
              title="No rooms yet"
              body="Add rooms with their sharing type. Beds are created for you automatically."
            />
          )}
          {rooms.map((room) => (
            <div key={room.id} className="card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-brand-900">Room {room.number}</h3>
                  <p className="text-xs text-muted">
                    {room.floor ? `Floor ${room.floor} · ` : ""}
                    {room.sharing === 1 ? "Single" : `${room.sharing}-sharing`} · {rupees(room.rent)}
                    /bed
                  </p>
                </div>
                <details className="group relative">
                  <summary className="btn-secondary btn-sm cursor-pointer list-none">Edit</summary>
                  <div className="absolute right-0 z-10 mt-2 w-72 rounded-xl border border-line bg-white p-4 shadow-lg">
                    <ActionForm action={updateRoom.bind(null, room.id)} submitLabel="Save room">
                      <RoomFields room={room} />
                    </ActionForm>
                    <div className="mt-3 border-t border-line pt-3">
                      <ActionForm
                        action={deleteRoom.bind(null, room.id)}
                        submitLabel="Delete room"
                        submitClassName="btn-danger btn-sm"
                        confirm={`Delete room ${room.number}?`}
                      />
                    </div>
                  </div>
                </details>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {room.beds.map((bed) => {
                  const t = bed.tenants[0];
                  if (!t) {
                    return (
                      <Link
                        key={bed.id}
                        href={`/tenants/new?bed=${bed.id}`}
                        className="flex items-center justify-between rounded-lg border border-dashed border-brand-200 px-3 py-2 text-sm text-brand-600 hover:bg-brand-50"
                      >
                        <span>
                          <span className="font-semibold">Bed {bed.label}</span> · Vacant
                        </span>
                        <span className="text-xs font-medium">+ Add tenant</span>
                      </Link>
                    );
                  }
                  const bal = balances.get(t.id);
                  return (
                    <Link
                      key={bed.id}
                      href={`/tenants/${t.id}`}
                      className="flex items-center justify-between gap-2 rounded-lg bg-canvas px-3 py-2 text-sm hover:bg-brand-50"
                    >
                      <span className="truncate">
                        <span className="font-semibold">Bed {bed.label}</span> · {t.name}
                      </span>
                      <span className="flex shrink-0 gap-1">
                        {t.status === "NOTICE" && <Badge tone="amber">Notice</Badge>}
                        {bal && bal.outstanding > 0 && (
                          <Badge tone="red">{rupees(bal.outstanding)} due</Badge>
                        )}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-6">
          <Card title="Add a room">
            <ActionForm action={createRoom.bind(null, property.id)} submitLabel="Add room" resetOnSuccess>
              <RoomFields />
            </ActionForm>
          </Card>
          <Card title="Property details">
            <ActionForm action={updateProperty.bind(null, property.id)} submitLabel="Save">
              <Field label="Name">
                <input className="input" name="name" defaultValue={property.name} required />
              </Field>
              <Field label="Address">
                <input className="input" name="address" defaultValue={property.address ?? ""} />
              </Field>
              <Field label="City">
                <input className="input" name="city" defaultValue={property.city ?? ""} />
              </Field>
            </ActionForm>
            <div className="mt-4 border-t border-line pt-4">
              <ActionForm
                action={deleteProperty.bind(null, property.id)}
                submitLabel="Delete property"
                submitClassName="btn-danger btn-sm"
                confirm="Delete this property, its rooms and its history? This cannot be undone."
              />
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

function RoomFields({
  room,
}: {
  room?: { number: string; floor: string | null; sharing: number; rent: number };
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Room no.">
          <input className="input" name="number" defaultValue={room?.number} placeholder="101" required />
        </Field>
        <Field label="Floor">
          <input className="input" name="floor" defaultValue={room?.floor ?? ""} placeholder="1" />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Beds">
          <select className="input" name="sharing" defaultValue={room?.sharing ?? 2}>
            {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n === 1 ? "1 (single)" : `${n} sharing`}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Rent / bed (₹)">
          <input
            className="input"
            name="rent"
            inputMode="numeric"
            defaultValue={room?.rent}
            placeholder="8000"
            required
          />
        </Field>
      </div>
    </>
  );
}
