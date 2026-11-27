import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { notFound } from "next/navigation";

import "../globals.css";
import { getDictionary } from "@/lib/i18n";
import { hasLocale, LOCALES } from "@/lib/locales";

// Vietnamese needs its own font subset for diacritics.
const inter = Inter({ variable: "--font-inter", subsets: ["latin", "vietnamese"] });

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: dict.app.title, description: dict.app.tagline };
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  return (
    <html lang={lang} className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
