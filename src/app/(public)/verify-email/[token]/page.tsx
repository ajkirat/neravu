import Link from "next/link";
import { Card } from "@/components/ui";
import { verifyEmailToken } from "@/app/actions/account";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "Verify email", robots: { index: false, follow: false } };

export default async function VerifyEmailPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { t } = await getT();
  const ok = await verifyEmailToken(token);
  return (
    <Card>
      <p className={`text-base font-medium ${ok ? "text-brand-700" : "text-red-700"}`}>{ok ? t("verifyOk") : t("verifyBad")}</p>
      <Link href="/dashboard" className="btn-primary mt-4 w-full justify-center">
        {t("goToApp")}
      </Link>
    </Card>
  );
}
