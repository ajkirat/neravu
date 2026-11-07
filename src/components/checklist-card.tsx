"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { tickChecklist } from "@/app/actions/upkeep";
import { useT } from "@/lib/i18n/client";

/** Today's (or this week's) ticks for one checklist. Each tap saves at once, for whoever is on duty. */
export function ChecklistCard({ id, items, done: initial }: { id: string; items: string[]; done: string[] }) {
  const t = useT();
  const router = useRouter();
  const [done, setDone] = useState(() => new Set(initial));
  const [, start] = useTransition();
  const toggle = (item: string, checked: boolean) => {
    setDone((d) => {
      const n = new Set(d);
      if (checked) n.add(item);
      else n.delete(item);
      return n;
    });
    start(async () => {
      await tickChecklist(id, item, checked);
      router.refresh();
    });
  };
  const count = items.filter((i) => done.has(i)).length;
  return (
    <div className="space-y-2" data-testid="checklist">
      <div className="h-2 overflow-hidden rounded-full bg-canvas" aria-hidden>
        <div className="h-2 rounded-full bg-brand-600 transition-all" style={{ width: `${items.length ? (count / items.length) * 100 : 0}%` }} />
      </div>
      <p className="text-sm font-semibold text-brand-900" data-testid="ck-progress">
        {t("ckProgress", { done: count, total: items.length })}
      </p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item}>
            <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-line px-3 py-2 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50">
              <input type="checkbox" className="h-6 w-6 shrink-0" checked={done.has(item)} onChange={(e) => toggle(item, e.target.checked)} />
              <span className={`text-base ${done.has(item) ? "text-muted line-through" : "text-brand-900"}`}>{item}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
