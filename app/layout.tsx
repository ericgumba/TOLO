import type { Metadata } from "next";
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
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}
