"use client";

import { useState, useTransition } from "react";
import { sendRemindersNow, sendTestMessage } from "@/app/actions/auto-reminders";
import { useT } from "@/lib/i18n/client";

export function AutoReminderButtons({ planned, connected }: { planned: number; connected: boolean }) {
  const t = useT();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok?: string; error?: string }>();
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-primary"
          disabled={pending || !connected || planned === 0}
          onClick={() => window.confirm(t("autoSendNowConfirm", { n: planned })) && start(async () => setMsg(await sendRemindersNow()))}
        >
          {t("autoSendNow")}
        </button>
        <button type="button" className="btn-secondary" disabled={pending || !connected} onClick={() => start(async () => setMsg(await sendTestMessage()))}>
          {t("autoTest")}
        </button>
      </div>
      {msg?.ok && <p role="status" className="text-sm text-brand-700">{msg.ok}</p>}
      {msg?.error && <p role="alert" className="text-sm text-red-700">{msg.error}</p>}
    </div>
  );
}
