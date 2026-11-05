import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { getLang } from "@/lib/i18n/server";
import { I18nProvider } from "@/lib/i18n/client";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Neravu · PG management", template: "%s · Neravu" },
  description: "Run your PG without the spreadsheets: beds, tenants, rent and dues in one place.",
  icons: { icon: "/icon.svg" },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Neravu", statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#0e6b64" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  const large = (await cookies()).get("neravu_text")?.value === "lg";
  return (
    <html lang={lang === "en" ? "en-IN" : lang} data-text={large ? "lg" : undefined}>
      <body>
        <I18nProvider lang={lang}>{children}</I18nProvider>
      </body>
    </html>
  );
}
