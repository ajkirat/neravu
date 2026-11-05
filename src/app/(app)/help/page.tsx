import { getT } from "@/lib/i18n/server";
import { Card, PageHeader } from "@/components/ui";

export const metadata = { title: "Help" };

export default async function HelpPage() {
  const { t } = await getT();
  const steps = [
    [t("help1Title"), t("help1Body")],
    [t("help2Title"), t("help2Body")],
    [t("help3Title"), t("help3Body")],
    [t("help4Title"), t("help4Body")],
    [t("help5Title"), t("help5Body")],
    [t("installTitle"), t("installBody")],
  ];
  return (
    <>
      <PageHeader title={t("helpTitle")} subtitle={t("helpSub")} />
      <div className="grid max-w-3xl gap-3">
        {steps.map(([title, body], i) => (
          <Card key={title}>
            <div className="flex gap-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-marigold-100 text-base font-bold text-marigold-700">
                {i + 1}
              </span>
              <div>
                <p className="text-base font-semibold text-brand-900">{title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{body}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
