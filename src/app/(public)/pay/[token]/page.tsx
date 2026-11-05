import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { summarizeLedger } from "@/lib/billing";
import { syncRentCharges } from "@/lib/ledger";
import { today } from "@/lib/dates";
import { fmtDate, rupees } from "@/lib/format";
import { qrDataUrl } from "@/lib/qr";
import { upiLink } from "@/lib/upi";
import { claimPayment } from "@/app/actions/paylink";
import { ActionForm } from "@/components/action-form";
import { Card } from "@/components/ui";

export const metadata = { title: "Pay rent", robots: { index: false, follow: false } };

export default async function PayPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{32}$/.test(token)) notFound();
  const tenant = await db.tenant.findUnique({
    where: { payToken: token },
    select: {
      id: true,
      ownerId: true,
      name: true,
      payClaimedAt: true,
      owner: { select: { upiId: true, businessName: true, name: true } },
      property: { select: { name: true } },
    },
  });
  if (!tenant) notFound();
  await syncRentCharges(tenant.ownerId, tenant.id);
  const ledger = await db.tenant.findUnique({
    where: { id: tenant.id },
    select: { charges: { select: { amount: true, dueDate: true } }, payments: { select: { amount: true } } },
  });
  const s = summarizeLedger(ledger?.charges ?? [], ledger?.payments ?? [], today());
  const payee = tenant.owner.businessName ?? tenant.property.name;
  const first = tenant.name.split(" ")[0];
  const upiId = tenant.owner.upiId;

  if (s.outstanding <= 0) {
    return (
      <Card>
        <p className="text-lg font-semibold text-brand-900">All paid, {first} ✓</p>
        <p className="mt-1 text-sm text-muted">You have nothing pending with {payee}. Thank you!</p>
      </Card>
    );
  }
  if (!upiId) {
    return (
      <Card>
        <p className="text-lg font-semibold text-brand-900">
          {first}, you owe {rupees(s.outstanding)}
        </p>
        <p className="mt-1 text-sm text-muted">Please pay {payee} directly. Online payment isn&apos;t set up yet.</p>
      </Card>
    );
  }
  const link = upiLink({ upiId, name: payee, amount: s.outstanding, note: `Rent ${first}` });
  const qr = await qrDataUrl(link, 320);

  return (
    <Card className="text-center">
      <p className="text-sm text-muted">{payee}</p>
      <h1 className="mt-1 text-lg font-semibold text-brand-900">Hi {first}, your pending amount</h1>
      <p className="my-3 text-4xl font-bold tracking-tight text-brand-900">{rupees(s.outstanding)}</p>
      {s.oldestUnpaid && (
        <p className="text-xs text-muted">
          Pending since {fmtDate(s.oldestUnpaid)}
        </p>
      )}
      <a href={link} className="btn-primary mt-4 w-full justify-center">
        Pay with UPI app
      </a>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qr} alt="UPI QR code" className="mx-auto mt-4 h-48 w-48" />
      <p className="mt-1 text-xs text-muted">or scan with any UPI app · {upiId}</p>
      <div className="mt-5 border-t border-line pt-4">
        {tenant.payClaimedAt ? (
          <p className="text-sm text-brand-700">
            Thanks! You told us you paid on {fmtDate(tenant.payClaimedAt)}. The owner will confirm it.
          </p>
        ) : (
          <ActionForm action={claimPayment.bind(null, token)} submitLabel="I’ve paid" submitClassName="btn-secondary w-full justify-center" className="space-y-2" />
        )}
      </div>
    </Card>
  );
}
