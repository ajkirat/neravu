"use client";

import { useState, useTransition } from "react";
import { checkWhatsApp, type CheckLine } from "@/app/actions/wa-check";

export function WaCheck() {
  const [lines, setLines] = useState<CheckLine[]>();
  const [pending, start] = useTransition();
  const run = (send: boolean) => start(async () => setLines(await checkWhatsApp(send)));
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-primary" disabled={pending} onClick={() => run(false)}>
          {pending ? "Checking…" : "Check WhatsApp set-up"}
        </button>
        <button type="button" className="btn-secondary" disabled={pending} onClick={() => run(true)}>
          Check and send me a test message
        </button>
      </div>
      {lines && (
        <ul className="space-y-1.5 text-sm">
          {lines.map((l) => (
            <li key={l.label} className="flex gap-2">
              <span aria-hidden>{l.ok ? "✅" : "❌"}</span>
              <span>
                {l.label}
                {l.detail && <span className="block text-xs break-words text-muted">{l.detail}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
