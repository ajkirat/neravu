"use client";

import { useState, useTransition } from "react";
import { applyAllBills } from "@/app/actions/electricity";
import { useT } from "@/lib/i18n/client";

export function ElectricityApplyAll({ propertyId, period, pending }: { propertyId: string; period: string; pending: number }) {
  const t = useT();
  const [busy, run] = useTransition();
  const [msg, setMsg] = useState<{ ok?: string; error?: string }>();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        className="btn-primary"
        disabled={busy || pending === 0}
        onClick={() => window.confirm(t("elecApplyAllConfirm", { n: pending })) && run(async () => setMsg(await applyAllBills(propertyId, period)))}
      >
        {t("elecApplyAll")}
      </button>
      {msg?.ok && <span role="status" className="text-sm text-brand-700">{msg.ok}</span>}
      {msg?.error && <span role="alert" className="text-sm text-red-700">{msg.error}</span>}
    </div>
  );
}
