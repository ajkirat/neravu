import Link from "next/link";
import { requireOwner } from "@/lib/auth";
import { vacantBeds } from "@/lib/beds";
import { toDateInput, today } from "@/lib/dates";
import { ID_TYPES, PAYMENT_METHODS, methodLabel } from "@/lib/format";
import { ActionForm } from "@/components/action-form";
import { BedPicker } from "@/components/bed-picker";
import { Card, EmptyState, Field, PageHeader } from "@/components/ui";
import { createTenant } from "@/app/actions/tenants";

export const metadata = { title: "Add tenant" };

export default async function NewTenantPage({
  searchParams,
}: {
  searchParams: Promise<{ bed?: string; property?: string }>;
}) {
  const { bed, property } = await searchParams;
  const owner = await requireOwner();
  const beds = await vacantBeds(owner.id);
  const defaultBed = bed ?? beds.find((b) => b.propertyId === property)?.id;

  return (
    <>
      <PageHeader
        back={{ href: "/tenants", label: "Tenants" }}
        title="Add a tenant"
        subtitle="Onboard a tenant to a vacant bed. Rent starts billing from the move-in date."
      />
      {beds.length === 0 ? (
        <EmptyState
          title="No vacant beds"
          body="Add a property and rooms first, or free up a bed by moving a tenant out."
          action={
            <Link href="/properties" className="btn-primary">
              Go to properties
            </Link>
          }
        />
      ) : (
        <ActionForm action={createTenant} submitLabel="Add tenant" className="space-y-6">
          <Card title="Tenant details">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name">
                <input className="input" name="name" required />
              </Field>
              <Field label="Mobile">
                <input className="input" name="phone" type="tel" placeholder="98xxxxxxxx" required />
              </Field>
              <Field label="Email">
                <input className="input" name="email" type="email" />
              </Field>
              <Field label="Occupation / college">
                <input className="input" name="occupation" />
              </Field>
              <Field label="ID proof">
                <select className="input" name="idType" defaultValue="Aadhaar">
                  {ID_TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field label="ID number">
                <input className="input" name="idNumber" />
              </Field>
              <Field label="Emergency contact name">
                <input className="input" name="emergencyName" />
              </Field>
              <Field label="Emergency contact phone">
                <input className="input" name="emergencyPhone" type="tel" />
              </Field>
            </div>
          </Card>
          <Card title="Stay and rent">
            <div className="space-y-4">
              <BedPicker beds={beds} defaultBed={defaultBed} />
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Move-in date">
                  <input
                    className="input"
                    type="date"
                    name="moveInDate"
                    defaultValue={toDateInput(today())}
                    required
                  />
                </Field>
                <Field label="Rent due day" hint="Day of the month (1-28). Defaults to the move-in day.">
                  <input className="input" name="rentDueDay" inputMode="numeric" placeholder="e.g. 5" />
                </Field>
                <Field label="Security deposit (₹)">
                  <input className="input" name="deposit" inputMode="numeric" placeholder="0" />
                </Field>
              </div>
              <div className="grid gap-4 rounded-xl bg-canvas p-4 sm:grid-cols-2">
                <Field
                  label="Amount collected today (₹)"
                  hint="Optional. First month's rent and deposit received at move-in."
                >
                  <input className="input" name="paidNow" inputMode="numeric" placeholder="0" />
                </Field>
                <Field label="Paid via">
                  <select className="input" name="method" defaultValue="UPI">
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {methodLabel[m]}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Notes">
                <textarea className="input" name="notes" rows={2} />
              </Field>
            </div>
          </Card>
        </ActionForm>
      )}
    </>
  );
}
