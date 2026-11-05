"use client";

import { useTransition } from "react";
import { deleteLead, setLeadFollowUp, setLeadStatus } from "@/app/actions/leads";
import { LEAD_STATUSES } from "@/lib/leads";
import { useT } from "@/lib/i18n/client";
import type { MsgKey } from "@/lib/i18n";

export function LeadControls({ id, status, followUp, canDelete = true }: { id: string; status: string; followUp: string; canDelete?: boolean }) {
  const t = useT();
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="date"
        className="input !w-auto"
        aria-label={t("followUpDate")}
        defaultValue={followUp}
        disabled={pending}
        onChange={(e) => start(() => setLeadFollowUp(id, e.target.value))}
      />
      <select
        className="input !w-auto"
        aria-label={t("statusLabel")}
        defaultValue={status}
        disabled={pending}
        onChange={(e) => start(() => setLeadStatus(id, e.target.value))}
      >
        {LEAD_STATUSES.map((s) => (
          <option key={s} value={s}>
            {t(`lead_${s}` as MsgKey)}
          </option>
        ))}
      </select>
      {canDelete && (
      <button
        type="button"
        className="btn-danger btn-sm"
        disabled={pending}
        onClick={() => window.confirm(t("deleteLeadConfirm")) && start(() => deleteLead(id))}
      >
        {t("delete")}
      </button>
      )}
    </div>
  );
}
