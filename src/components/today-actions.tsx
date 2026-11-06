"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/** A button that runs a server action, shows its message, and refreshes the page. */
export function ActionButton({
  action,
  label,
  className = "btn-secondary btn-sm",
  confirm,
}: {
  action: () => Promise<{ ok?: string; error?: string } | void>;
  label: string;
  className?: string;
  confirm?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok?: string; error?: string }>();
  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        className={className}
        disabled={pending}
        onClick={() => {
          if (confirm && !window.confirm(confirm)) return;
          start(async () => {
            const r = await action();
            if (r && r.error) setMsg(r);
            router.refresh();
          });
        }}
      >
        {label}
      </button>
      {msg?.error && <span className="mt-1 text-xs text-red-700">{msg.error}</span>}
    </span>
  );
}

/** "Whose is this payment?": pick a tenant for a bank credit Neravu could not match. */
export function AssignCredit({
  assign,
  tenants,
  label,
  placeholder,
}: {
  assign: (tenantId: string) => Promise<{ ok?: string; error?: string }>;
  tenants: { id: string; name: string }[];
  label: string;
  placeholder: string;
}) {
  const router = useRouter();
  const [who, setWho] = useState("");
  const [pending, start] = useTransition();
  return (
    <span className="flex flex-wrap items-center gap-2">
      <select className="input !w-auto" value={who} onChange={(e) => setWho(e.target.value)} aria-label={placeholder}>
        <option value="">{placeholder}</option>
        {tenants.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
      <button type="button" className="btn-primary btn-sm" disabled={!who || pending} onClick={() => start(async () => { await assign(who); router.refresh(); })}>
        {label}
      </button>
    </span>
  );
}
