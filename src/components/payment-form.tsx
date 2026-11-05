import { ActionForm } from "@/components/action-form";
import { Field } from "@/components/ui";
import { recordPayment } from "@/app/actions/payments";
import { PAYMENT_METHODS, methodLabel } from "@/lib/format";
import { toDateInput, today } from "@/lib/dates";

export function PaymentForm({
  tenantId,
  tenants,
  defaultAmount,
}: {
  tenantId?: string;
  tenants?: { id: string; name: string; detail: string }[];
  defaultAmount?: number;
}) {
  return (
    <ActionForm action={recordPayment} submitLabel="Record payment" resetOnSuccess>
      {tenantId ? (
        <input type="hidden" name="tenantId" value={tenantId} />
      ) : (
        <Field label="Tenant">
          <select className="input" name="tenantId" defaultValue="" required>
            <option value="" disabled>
              Choose a tenant
            </option>
            {tenants?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} · {t.detail}
              </option>
            ))}
          </select>
        </Field>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount (₹)">
          <input
            className="input"
            name="amount"
            inputMode="numeric"
            defaultValue={defaultAmount || undefined}
            required
          />
        </Field>
        <Field label="Paid on">
          <input className="input" type="date" name="paidOn" defaultValue={toDateInput(today())} required />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Method">
          <select className="input" name="method" defaultValue="UPI">
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {methodLabel[m]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Reference">
          <input className="input" name="reference" placeholder="UTR / txn id" />
        </Field>
      </div>
      <Field label="Note">
        <input className="input" name="note" placeholder="Optional" />
      </Field>
    </ActionForm>
  );
}
