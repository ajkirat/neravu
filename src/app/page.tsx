import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { currentActor } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import type { MsgKey } from "@/lib/i18n";

// The one-page "what Neravu does", in the visitor's language. Also what you show an owner on your phone.
const FEATURES: [string, MsgKey, MsgKey][] = [
  ["🔔", "lpF1t", "lpF1b"],
  ["🧾", "lpF2t", "lpF2b"],
  ["📷", "lpF3t", "lpF3b"],
  ["⚡", "lpF4t", "lpF4b"],
  ["📱", "lpF5t", "lpF5b"],
  ["🧑‍🔧", "lpF6t", "lpF6b"],
  ["👮", "lpF7t", "lpF7b"],
  ["🤝", "lpF8t", "lpF8b"],
];

export default async function Home() {
  if (await currentActor()) redirect("/dashboard");
  const { t } = await getT();
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
        <Logo />
        <div className="flex flex-wrap items-center gap-2">
          <LanguageSwitcher />
          <Link href="/login" className="btn-secondary">
            {t("lpLogin")}
          </Link>
        </div>
      </header>
      <main>
        <section className="mx-auto max-w-6xl px-4 pt-6 pb-10 sm:px-5 md:pt-16 md:pb-16">
          <p className="mb-3 inline-block rounded-full bg-marigold-100 px-3 py-1 text-sm font-semibold text-marigold-700">{t("lpTag")}</p>
          <h1 className="max-w-3xl text-3xl leading-tight font-bold tracking-tight text-brand-900 md:text-6xl">{t("lpTitle")}</h1>
          <p className="mt-4 max-w-xl text-lg text-muted">{t("lpSub")}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/signup" className="btn-primary px-6 py-3 text-base">
              {t("lpStart")}
            </Link>
          </div>
        </section>
        <section className="border-t border-line bg-white">
          <div className="mx-auto max-w-6xl px-4 py-10 sm:px-5 md:py-14">
            <h2 className="mb-5 text-xl font-bold text-brand-900 md:text-2xl">{t("lpWhat")}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map(([icon, title, body]) => (
                <div key={title} className="rounded-2xl border border-line p-4 sm:p-5">
                  <p className="text-3xl" aria-hidden>
                    {icon}
                  </p>
                  <h3 className="mt-2 text-base font-semibold text-brand-900">{t(title)}</h3>
                  <p className="mt-1 text-sm text-muted">{t(body)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-5 md:py-14">
          <h2 className="mb-5 text-xl font-bold text-brand-900 md:text-2xl">{t("lpHow")}</h2>
          <ol className="grid gap-3 md:grid-cols-3">
            {(["lpS1", "lpS2", "lpS3"] as MsgKey[]).map((k, i) => (
              <li key={k} className="card flex items-start gap-3 p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-marigold-100 text-base font-bold text-marigold-700">{i + 1}</span>
                <span className="text-base">{t(k)}</span>
              </li>
            ))}
          </ol>
          <div className="mt-6">
            <Link href="/signup" className="btn-primary px-6 py-3 text-base">
              {t("lpStart")}
            </Link>
          </div>
        </section>
      </main>
      <footer className="mx-auto flex max-w-6xl flex-wrap gap-4 px-4 py-8 text-sm text-muted sm:px-5">
        <span>© {new Date().getFullYear()} Neravu</span>
        <Link href="/privacy" className="underline">
          {t("lpPrivacy")}
        </Link>
      </footer>
    </div>
  );
}
