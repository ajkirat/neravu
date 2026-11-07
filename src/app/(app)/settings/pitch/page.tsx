import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import type { MsgKey } from "@/lib/i18n";
import { fmtDate, rupees } from "@/lib/format";
import { cleanPitchInputs, computePitch, customPainText, isCustomPain } from "@/lib/pitch";
import { Badge, FoldCard, PageHeader } from "@/components/ui";
import { PitchCalculator } from "@/components/pitch-calculator";
import { ActionButton } from "@/components/today-actions";
import { deletePitch } from "@/app/actions/pitch";

export const metadata = { title: "Pitch to a PG owner" };

const POINTS = [1, 2, 3, 4, 5, 6, 7, 8];

export default async function PitchPage() {
  const owner = await requireOwner();
  const { t, lang } = await getT();
  const saved = await db.pitch.findMany({ where: { ownerId: owner.id }, orderBy: { createdAt: "desc" }, take: 30 });
  // Problems owners named that are not in the fixed list, most often named first: offered as options.
  const earlier = await db.pitch.findMany({ where: { ownerId: owner.id }, select: { pains: true }, orderBy: { createdAt: "desc" }, take: 500 });
  const counts = new Map<string, { text: string; n: number }>();
  for (const p of earlier) for (const x of p.pains.filter(isCustomPain)) {
    const text = customPainText(x);
    const c = counts.get(text.toLowerCase());
    counts.set(text.toLowerCase(), { text: c?.text ?? text, n: (c?.n ?? 0) + 1 });
  }
  const extraPains = [...counts.values()].sort((a, b) => b.n - a.n).slice(0, 24).map((c) => c.text);

  return (
    <>
      <PageHeader back={{ href: "/settings", label: t("settingsTitle") }} title={t("pitchTitle")} subtitle={t("pitchSub")} />
      <div className="space-y-6">
        {/* What to say: open by default, fold away once you know it. */}
        <FoldCard title={t("pitchSayTitle")} open>
          <div className="space-y-4 px-4 pb-5 sm:px-5">
            <p className="text-base font-medium text-brand-900">{t("pitchSayOpen")}</p>
            <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {POINTS.map((n) => (
                <li key={n} className="rounded-xl bg-brand-50 p-3">
                  <p className="font-semibold text-brand-700">{t(`pitchP${n}t` as MsgKey)}</p>
                  <p className="mt-1 text-sm text-brand-900">{t(`pitchP${n}b` as MsgKey)}</p>
                </li>
              ))}
            </ol>
            <p className="rounded-xl bg-marigold-100 px-4 py-3 font-semibold text-brand-900">{t("pitchSayAsk")}</p>
          </div>
        </FoldCard>

        <div>
          <h2 className="text-lg font-bold text-brand-900">{t("pitchCalcTitle")}</h2>
          <p className="mb-3 text-sm text-muted">{t("pitchCalcHint")}</p>
          <PitchCalculator extraPains={extraPains} />
        </div>

        <section className="card p-4 sm:p-5">
          <h2 className="mb-3 text-lg font-bold text-brand-900">{t("pitchListTitle")}</h2>
          {saved.length === 0 ? (
            <p className="text-sm text-muted">{t("pitchListEmpty")}</p>
          ) : (
            <ul className="divide-y divide-line" data-testid="pitch-list">
              {saved.map((p) => {
                const r = computePitch(cleanPitchInputs(p.inputs as Record<string, unknown>));
                return (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-brand-900">
                        {p.prospectName}
                        {p.pgName ? ` · ${p.pgName}` : ""}{" "}
                        {p.interest && <Badge tone={p.interest === "HOT" ? "green" : p.interest === "MAYBE" ? "amber" : "gray"}>{t(`interest_${p.interest}` as MsgKey)}</Badge>}
                      </p>
                      <p className="text-sm text-muted">
                        {[p.city, fmtDate(p.createdAt, lang), t("pitchPerYearShort", { amt: rupees(r.perYear) }), t("pitchPainsN", { n: p.pains.length }), p.wouldPay ? `${rupees(p.wouldPay)}/mo` : null].filter(Boolean).join(" · ")}
                      </p>
                      {p.pains.length > 0 && (
                        <p className="mt-0.5 text-sm break-words text-brand-900">
                          {p.pains.map((x) => (isCustomPain(x) ? customPainText(x) : t(`pain_${x}` as MsgKey))).join(" · ")}
                        </p>
                      )}
                      {p.otherPains && <p className="mt-0.5 text-sm break-words text-brand-900">“{p.otherPains}”</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <a className="btn-secondary btn-sm" href={`/settings/pitch/${p.id}/pdf?download=1`}>
                        {t("pitchPdf")}
                      </a>
                      <ActionButton action={deletePitch.bind(null, p.id)} label={t("delete")} className="text-sm text-muted hover:text-red-700 hover:underline" confirm={t("pitchDeleteConfirm")} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
