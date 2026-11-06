"use client";

import { useState, useTransition } from "react";
import { resendReceipt } from "@/app/actions/payments";
import { useI18n } from "@/lib/i18n/client";

/** Whether the WhatsApp receipt reached the tenant, why not, and a button to try again. */
export function ReceiptStatus({ paymentId, status }: { paymentId: number; status: string | null }) {
  const { t } = useI18n();
  const [msg, setMsg] = useState<{ ok?: string; error?: string }>();
  const [pending, start] = useTransition();
  if (!status) return null;
  const sent = status === "SENT" || !!msg?.ok;
  return (
    <div className={`rounded-xl px-4 py-3 text-sm ${sent ? "bg-brand-50 text-brand-700" : "bg-red-50 text-red-800"}`} role="status" data-testid="receipt-status">
      <p className="font-semibold">{sent ? t("receiptStatusSent") : t("receiptStatusFailed")}</p>
      {!sent && (
        <>
          <p className="mt-1 break-words">{msg?.error ?? status}</p>
          <p className="mt-1 text-xs">{t("receiptByHand")}</p>
          <button
            type="button"
            className="btn-secondary btn-sm mt-2"
            disabled={pending}
            onClick={() => start(async () => setMsg(await resendReceipt(paymentId)))}
          >
            {pending ? "…" : t("receiptTryAgain")}
          </button>
        </>
      )}
    </div>
  );
}
