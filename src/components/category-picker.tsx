"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { categoryMatches } from "@/lib/format";
import { useI18n } from "@/lib/i18n/client";

type Group = { label: string; options: { value: string; label: string }[] };

/**
 * A category list you can search. Tap the box, type a word (in English, Kannada or Telugu, or words like
 * "hotel", "current", "haalu"), then tap the category. The chosen value goes into a hidden form field.
 */
export function CategoryPicker({ name, groups, value, onChange }: { name: string; groups: Group[]; value: string; onChange: (v: string) => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const listId = useId();

  const label = groups.flatMap((g) => g.options).find((o) => o.value === value)?.label ?? value;
  const shown = useMemo(
    () => groups.map((g) => ({ ...g, options: g.options.filter((o) => categoryMatches(q, o.value, o.label)) })).filter((g) => g.options.length),
    [groups, q],
  );
  const flat = shown.flatMap((g) => g.options);

  useEffect(() => {
    if (!open) return;
    search.current?.focus();
    const away = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);

  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
    setQ("");
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") return setOpen(false);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault(); // never submit the expense form from the search box
      if (flat[active]) pick(flat[active].value);
    }
  };

  return (
    <div ref={box} className="relative">
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        className="input flex items-center justify-between gap-2 text-left"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        data-testid="category-picker"
      >
        <span className="truncate">{label}</span>
        <span aria-hidden className="text-muted">▾</span>
      </button>
      {open && (
        // On a phone the box is only half the screen wide, so the list opens as a full-width panel instead.
        <div className="fixed inset-x-3 top-16 z-50 rounded-xl border border-line bg-white p-2 shadow-xl sm:absolute sm:inset-x-auto sm:top-auto sm:left-0 sm:z-20 sm:mt-1 sm:w-full sm:shadow-lg">
          <div className="flex gap-2">
            <input
              ref={search}
              className="input"
              type="search"
              value={q}
              placeholder={t("catSearch")}
              aria-controls={listId}
              onChange={(e) => {
                setQ(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKey}
            />
            <button type="button" className="btn-secondary shrink-0 px-3 sm:hidden" aria-label={t("close")} onClick={() => setOpen(false)}>
              ✕
            </button>
          </div>
          <div id={listId} role="listbox" className="mt-2 max-h-[60vh] overflow-y-auto sm:max-h-72">
            {flat.length === 0 && <p className="px-2 py-3 text-sm text-muted">{t("catNoMatch")}</p>}
            {shown.map((g) => (
              <div key={g.label} role="group" aria-label={g.label}>
                <p className="px-2 pt-2 pb-1 text-xs font-semibold text-muted uppercase">{g.label}</p>
                {g.options.map((o) => {
                  const i = flat.indexOf(o);
                  return (
                    <button
                      key={o.value}
                      type="button"
                      role="option"
                      aria-selected={o.value === value}
                      className={`block w-full rounded-lg px-3 py-2.5 text-left text-base ${i === active ? "bg-brand-50" : ""} ${o.value === value ? "font-semibold text-brand-700" : "text-brand-900"} hover:bg-brand-50`}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => pick(o.value)}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
