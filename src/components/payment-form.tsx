import { ActionForm } from "@/components/action-form";
import { Field } from "@/components/ui";
import { recordPayment } from "@/app/actions/payments";
import { PAYMENT_METHODS, methodText } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { toDateInput, today } from "@/lib/dates";

export async function PaymentForm({
  tenantId,
  tenants,
  defaultAmount,
}: {
  tenantId?: string;
  tenants?: { id: string; name: string; detail: string }[];
  defaultAmount?: number;
}) {
  const { t } = await getT();
  return (
    <ActionForm action={recordPayment} submitLabel={t("recordPaymentBtn")} resetOnSuccess>
      {tenantId ? (
        <input type="hidden" name="tenantId" value={tenantId} />
      ) : (
        <Field label={t("tenant")}>
          <select className="input" name="tenantId" defaultValue="" required>
            <option value="" disabled>
              {t("chooseTenant")}
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
        <Field label={t("amount")}>
          <input
            className="input"
            name="amount"
            inputMode="numeric"
            defaultValue={defaultAmount || undefined}
            required
          />
        </Field>
        <Field label={t("paidOn")}>
          <input className="input" type="date" name="paidOn" defaultValue={toDateInput(today())} required />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("method")}>
          <select className="input" name="method" defaultValue="UPI">
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {methodText(t, m)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("reference")}>
          <input className="input" name="reference" placeholder={t("referencePh")} />
        </Field>
      </div>
      <Field label={t("note")}>
        <input className="input" name="note" placeholder={t("optional")} />
      </Field>
    </ActionForm>
  );
}
