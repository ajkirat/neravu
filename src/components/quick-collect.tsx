"use client";

import { useState, useTransition } from "react";
import { collectFull } from "@/app/actions/payments";
import { useT } from "@/lib/i18n/client";

/** Big one-tap buttons: mark everything this tenant owes as received in cash or by UPI. */
export function QuickCollect({ tenantId, name, amount }: { tenantId: string; name: string; amount: string }) {
  const t = useT();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok?: string; error?: string }>();
  const go = (method: "CASH" | "UPI") => {
    const label = method === "CASH" ? t("cash") : t("upi");
    if (!window.confirm(t("confirmPaid", { name, amt: amount, method: label }))) return;
    start(async () => setMsg(await collectFull(tenantId, method)));
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" className="btn-primary btn-sm" disabled={pending} onClick={() => go("CASH")}>
        💵 {t("paidCash")}
      </button>
      <button type="button" className="btn-secondary btn-sm" disabled={pending} onClick={() => go("UPI")}>
        📱 {t("paidUpi")}
      </button>
      {msg?.error && <span role="alert" className="text-xs text-red-700">{msg.error}</span>}
      {msg?.ok && <span role="status" className="text-xs text-brand-700">{msg.ok}</span>}
    </div>
  );
}
