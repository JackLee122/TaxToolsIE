import type { Metadata } from "next";
import "./globals.css";
import { SiteFooter } from "@/components/ui/site-footer";
import { SiteHeader } from "@/components/ui/site-header";

export const metadata: Metadata = {
  title: {
    default: "TaxToolsIE",
    template: "%s · TaxToolsIE",
  },
  description:
    "Irish Personal Tax Dashboard - calculate, reconcile and guide. Private tax estimates for PAYE employment, investments, credits and refunds.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
