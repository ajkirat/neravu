import Link from "next/link";
import { cookies } from "next/headers";
import { MORE, STAFF_MORE } from "@/lib/nav-items";
import { requireActor } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { Icon } from "@/components/nav";
import { LanguageSwitcher } from "@/components/language-switcher";
import { TextSizeToggle } from "@/components/text-size-toggle";
import { logout } from "@/app/actions/auth";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "More" };

export default async function MorePage() {
  const { t } = await getT();
  const { role } = await requireActor();
  const large = (await cookies()).get("neravu_text")?.value === "lg";
  return (
    <>
      <PageHeader title={t("moreTitle")} subtitle={t("moreSubtitle")} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {(role === "OWNER" ? MORE : STAFF_MORE).map((n) => (
          <Link key={n.href} href={n.href} className="card flex flex-col items-center gap-3 px-3 py-6 text-center text-base font-semibold hover:shadow-sm">
            <Icon d={n.icon} className="h-10 w-10 text-brand-600" />
            {t(n.key)}
          </Link>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <LanguageSwitcher />
        <TextSizeToggle large={large} />
      </div>
      <form action={logout} className="mt-6">
        <button className="btn-secondary">{t("logout")}</button>
      </form>
    </>
  );
}
