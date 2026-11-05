"use client";

import { useTransition } from "react";
import { deleteLead, setLeadFollowUp, setLeadStatus } from "@/app/actions/leads";
import { LEAD_STATUSES, leadStatusLabel } from "@/lib/leads";

export function LeadControls({ id, status, followUp }: { id: string; status: string; followUp: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="date"
        className="input !w-auto"
        aria-label="Follow-up date"
        defaultValue={followUp}
        disabled={pending}
        onChange={(e) => start(() => setLeadFollowUp(id, e.target.value))}
      />
      <select
        className="input !w-auto"
        aria-label="Status"
        defaultValue={status}
        disabled={pending}
        onChange={(e) => start(() => setLeadStatus(id, e.target.value))}
      >
        {LEAD_STATUSES.map((s) => (
          <option key={s} value={s}>
            {leadStatusLabel[s]}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="btn-danger btn-sm"
        disabled={pending}
        onClick={() => window.confirm("Delete this lead?") && start(() => deleteLead(id))}
      >
        Delete
      </button>
    </div>
  );
}
