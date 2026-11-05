"use client";

import { useTransition } from "react";
import { deleteComplaint, setComplaintStatus } from "@/app/actions/complaints";
import { useT } from "@/lib/i18n/client";
import type { MsgKey } from "@/lib/i18n";

const STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED"] as const;

export function ComplaintControls({ id, status }: { id: string; status: string }) {
  const t = useT();
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        className="input !w-auto"
        aria-label={t("statusLabel")}
        defaultValue={status}
        disabled={pending}
        onChange={(e) => start(() => setComplaintStatus(id, e.target.value))}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {t(`cmp_${s}` as MsgKey)}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="btn-danger btn-sm"
        disabled={pending}
        onClick={() => window.confirm(t("deleteComplaintConfirm")) && start(() => deleteComplaint(id))}
      >
        {t("delete")}
      </button>
    </div>
  );
}
