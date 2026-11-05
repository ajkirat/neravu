import { requireOwner } from "@/lib/auth";
import { saveSettings } from "@/app/actions/settings";
import { ActionForm } from "@/components/action-form";
import { Card, Field, PageHeader } from "@/components/ui";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const owner = await requireOwner();
  return (
    <>
      <PageHeader title="Settings" subtitle="Your details and how tenants pay you." />
      <div className="max-w-xl">
        <Card>
          <ActionForm action={saveSettings} submitLabel="Save settings">
            <Field label="Your name">
              <input name="name" className="input" required defaultValue={owner.name} />
            </Field>
            <Field label="Mobile number">
              <input name="phone" type="tel" className="input" defaultValue={owner.phone ?? ""} />
            </Field>
            <Field label="PG / business name" hint="Shown to tenants on pay pages and the enquiry form.">
              <input name="businessName" className="input" defaultValue={owner.businessName ?? ""} />
            </Field>
            <Field
              label="UPI ID for rent"
              hint="Tenants pay straight to this UPI ID (for example name@okbank). Leave empty to turn off online pay links."
            >
              <input name="upiId" className="input" defaultValue={owner.upiId ?? ""} placeholder="name@bank" />
            </Field>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
