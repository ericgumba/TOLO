import type { Metadata } from "next";
import Link from "next/link";
import { AdBanner } from "@/app/components/ad-banner";
import { HomeBanner } from "@/app/components/home-banner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tolo",
  description: "Learning app MVP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <HomeBanner />
        <AdBanner placement="top" />
        <div className="mx-auto flex w-full max-w-[90rem] flex-1 gap-6 px-4 xl:items-start">
          <div className="min-w-0 flex-1">{children}</div>
          <div className="hidden w-72 shrink-0 xl:block">
            <div className="sticky top-32">
              <AdBanner placement="right" />
            </div>
          </div>
        </div>
        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto flex w-full max-w-[90rem] items-center justify-center gap-4 px-6 py-4 text-sm text-slate-600">
            <Link className="hover:text-slate-900 hover:underline" href="/terms">
              Terms
            </Link>
            <span aria-hidden="true" className="text-slate-300">
              |
            </span>
            <Link className="hover:text-slate-900 hover:underline" href="/privacy">
              Privacy
            </Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
