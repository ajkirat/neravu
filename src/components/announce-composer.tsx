"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import { ANNOUNCEMENTS, announcementText, type Announcement } from "@/lib/announce";
import { asLang, type MsgKey } from "@/lib/i18n";
import { CopyButton } from "@/components/copy-button";

type T = { id: string; name: string; phone: string; language: string | null; propertyId: string };

const ICON: Record<Announcement, string> = { WATER: "🚱", POWER: "⚡", PEST: "🪳", TANK: "🪣", NOTICE: "📌", OWN: "✍️" };
const wa = (phone: string) => {
  const d = phone.replace(/\D/g, "");
  return d.length === 10 ? `91${d}` : d;
};

/**
 * Write once, tell everyone: pick a ready message, add when, and either copy it for the PG's WhatsApp
 * group or send it to each tenant with one tap, in that tenant's own language.
 */
export function AnnounceComposer({ properties, tenants, pgName }: { properties: { id: string; name: string }[]; tenants: T[]; pgName: string }) {
  const { t, lang } = useI18n();
  const [kind, setKind] = useState<Announcement>("WATER");
  const [when, setWhen] = useState("");
  const [note, setNote] = useState("");
  const [prop, setProp] = useState("ALL");
  const [sent, setSent] = useState<Set<string>>(new Set());
  const pgOf = (id: string) => (properties.length > 1 ? properties.find((p) => p.id === id)?.name ?? pgName : pgName);
  const groupPg = prop === "ALL" ? pgName : pgOf(prop);
  const text = useMemo(() => announcementText(kind, lang, { pg: groupPg, when, note }), [kind, lang, groupPg, when, note]);
  const people = tenants.filter((x) => prop === "ALL" || x.propertyId === prop);
  const needsWhen = kind !== "NOTICE" && kind !== "OWN";
  const chip = (on: boolean) => `rounded-xl px-3 py-2 text-sm font-semibold ${on ? "bg-brand-600 text-white" : "bg-white text-ink ring-1 ring-line"}`;

  return (
    <div className="space-y-4">
      <div className="card space-y-4 p-4 sm:p-5">
        <div>
          <p className="label">{t("annWhat")}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ANNOUNCEMENTS.map((k) => (
              <button key={k} type="button" className={chip(kind === k)} onClick={() => setKind(k)} aria-pressed={kind === k}>
                {ICON[k]} {t(`annK_${k}` as MsgKey)}
              </button>
            ))}
          </div>
        </div>
        {properties.length > 1 && (
          <label className="block">
            <span className="label">{t("annWho")}</span>
            <select className="input sm:max-w-sm" value={prop} onChange={(e) => setProp(e.target.value)}>
              <option value="ALL">{t("annAllPgs")}</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {needsWhen && (
          <label className="block">
            <span className="label">{t("annWhen")}</span>
            <input className="input sm:max-w-md" value={when} onChange={(e) => setWhen(e.target.value)} placeholder={t("annWhenPh")} maxLength={80} />
          </label>
        )}
        <label className="block">
          <span className="label">{kind === "NOTICE" || kind === "OWN" ? t("annMessage") : t("annNote")}</span>
          <textarea className="input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
        </label>
      </div>

      <div className="card p-4 sm:p-5">
        <p className="label">{t("annForGroup")}</p>
        <pre className="rounded-xl bg-canvas p-3 font-sans text-sm whitespace-pre-wrap" data-testid="ann-text">
          {text}
        </pre>
        <div className="mt-3 flex flex-wrap gap-2">
          <a className="btn-accent" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(text)}`}>
            {t("vacSendWa")}
          </a>
          <CopyButton text={text} />
        </div>
      </div>

      <div className="card p-4 sm:p-5">
        <p className="label">
          {t("annEach")} ({sent.size}/{people.length})
        </p>
        <ul className="divide-y divide-line">
          {people.map((p) => {
            const own = announcementText(kind, asLang(p.language ?? lang), { pg: pgOf(p.propertyId), when, note });
            return (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0 truncate text-base">
                  {sent.has(p.id) ? "✓ " : ""}
                  {p.name}
                </span>
                <a
                  className={sent.has(p.id) ? "btn-secondary btn-sm" : "btn-accent btn-sm"}
                  target="_blank"
                  rel="noreferrer"
                  href={`https://wa.me/${wa(p.phone)}?text=${encodeURIComponent(own)}`}
                  onClick={() => setSent((s) => new Set(s).add(p.id))}
                >
                  {t("whatsapp")}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
