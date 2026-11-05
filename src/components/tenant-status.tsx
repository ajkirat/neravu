import { Badge } from "@/components/ui";
import { getT } from "@/lib/i18n/server";

export async function TenantStatusBadge({ status }: { status: string }) {
  const { t } = await getT();
  if (status === "NOTICE") return <Badge tone="amber">{t("statusNotice")}</Badge>;
  if (status === "MOVED_OUT") return <Badge>{t("statusMovedOut")}</Badge>;
  return <Badge tone="green">{t("statusActive")}</Badge>;
}
