import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Neravu · PG management", template: "%s · Neravu" },
  description: "Run your PG without the spreadsheets: beds, tenants, rent and dues in one place.",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = { themeColor: "#0e6b64" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN">
      <body>{children}</body>
    </html>
  );
}
