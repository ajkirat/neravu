import { Card } from "@/components/ui";

export const metadata = { title: "Privacy policy" };

// Plain English on purpose: Meta and app stores link here. Keep it short and true.
export default function PrivacyPage() {
  return (
    <Card>
      <article className="space-y-4 text-sm leading-relaxed">
        <h1 className="text-lg font-semibold text-brand-900">Neravu privacy policy</h1>
        <p>
          Neravu is software that PG (paying guest) and hostel owners use to manage rooms, tenants, rent and expenses. This page
          explains what information Neravu keeps and why.
        </p>
        <h2 className="font-semibold text-brand-900">What we keep</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Owner and caretaker accounts: name, mobile number, email and a scrambled (hashed) password.</li>
          <li>Tenant details the owner enters or the tenant fills in: name, mobile, ID type and number, home address, emergency contact, rent and payments.</li>
          <li>Messages sent to the PG&apos;s WhatsApp number: bill photos and Yes/No replies, used only to add expenses.</li>
          <li>Enquiries from the PG&apos;s QR code: name, phone and the note written.</li>
        </ul>
        <h2 className="font-semibold text-brand-900">How it is used</h2>
        <p>
          Only to run the PG: rent reminders, receipts, expense records and reports. Bill photos are read by an AI service
          (Anthropic) to fill in the amount and items. Messages go through WhatsApp (Meta). We do not sell or share information
          for advertising.
        </p>
        <h2 className="font-semibold text-brand-900">Who can see it</h2>
        <p>Only the PG owner, and caretakers the owner adds (with limited access). Each owner sees only their own PG&apos;s data.</p>
        <h2 className="font-semibold text-brand-900">Deleting your data</h2>
        <p>
          Owners can download all their data and delete tenants, expenses and properties in the app. A tenant who wants their
          details removed should ask the PG owner. To delete a whole account, the owner can contact the person who runs Neravu for
          them, and the account and its data are removed.
        </p>
        <p className="text-xs text-muted">Last updated: November 2026</p>
      </article>
    </Card>
  );
}
