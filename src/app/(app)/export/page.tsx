import { getT } from "@/lib/i18n/server";
import { requireOwner } from "@/lib/auth";
import type { MsgKey } from "@/lib/i18n";
import { Card, PageHeader } from "@/components/ui";

export const metadata = { title: "Download data" };

const KINDS = ["tenants", "payments", "charges", "expenses", "rooms", "leads", "complaints", "backup"] as const;

export default async function ExportPage() {
  await requireOwner();
  const { t } = await getT();
  return (
    <>
      <PageHeader title={t("exportTitle")} subtitle={t("exportSub")} />
      <p className="mb-6 max-w-3xl rounded-lg bg-marigold-100 px-4 py-3 text-sm text-marigold-700">{t("exportWarn")}</p>
      <div className="grid max-w-4xl gap-3 sm:grid-cols-2">
        {KINDS.map((k) => (
          <Card key={k}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-brand-900">{t(`exp_${k}` as MsgKey)}</p>
                <p className="mt-0.5 text-sm text-muted">{t(`exp_${k}_d` as MsgKey)}</p>
              </div>
              <a href={`/export/${k}`} download className="btn-secondary btn-sm shrink-0">
                {t("exportBtn")}
              </a>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
