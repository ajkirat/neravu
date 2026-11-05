"use client";

import { useTransition } from "react";
import { markReminded } from "@/app/actions/reminders";
import { useT } from "@/lib/i18n/client";

/** Opens WhatsApp immediately (so popup blockers allow it), then records that a reminder was sent. */
export function RemindButton({ href, tenantId, again }: { href: string; tenantId: string; again?: boolean }) {
  const t = useT();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className={again ? "btn-secondary btn-sm" : "btn-accent btn-sm"}
      disabled={pending}
      onClick={() => {
        window.open(href, "_blank", "noopener,noreferrer");
        start(() => markReminded(tenantId));
      }}
    >
      {again ? t("remindAgain") : t("whatsapp")}
    </button>
  );
}
