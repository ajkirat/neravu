"use client";

import { useState, useTransition } from "react";
import { deleteStaff, resetStaffPassword, setStaffActive } from "@/app/actions/staff";
import { useT } from "@/lib/i18n/client";

export function StaffControls({ id, active }: { id: string; active: boolean }) {
  const t = useT();
  const [pending, start] = useTransition();
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState<{ ok?: string; error?: string }>();
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={active ? "btn-secondary btn-sm" : "btn-primary btn-sm"} disabled={pending} onClick={() => start(() => setStaffActive(id, !active))}>
          {active ? t("staffSwitchOff") : t("staffSwitchOn")}
        </button>
        <button type="button" className="btn-danger btn-sm" disabled={pending} onClick={() => window.confirm(t("staffDeleteConfirm")) && start(() => deleteStaff(id))}>
          {t("staffDelete")}
        </button>
      </div>
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await resetStaffPassword(id, pw);
            setMsg(r);
            if (r.ok) setPw("");
          });
        }}
      >
        <input className="input !w-44 !py-1.5" type="text" autoComplete="off" aria-label={t("staffNewPw")} placeholder={t("staffNewPw")} value={pw} onChange={(e) => setPw(e.target.value)} />
        <button type="submit" className="btn-secondary btn-sm" disabled={pending || pw.length === 0}>
          {t("staffSetPw")}
        </button>
      </form>
      {msg?.ok && <p role="status" className="text-xs text-brand-700">{msg.ok}</p>}
      {msg?.error && <p role="alert" className="text-xs text-red-700">{msg.error}</p>}
    </div>
  );
}
