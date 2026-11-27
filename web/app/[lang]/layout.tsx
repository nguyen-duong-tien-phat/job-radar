import type { Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";
import { notFound } from "next/navigation";

import "../globals.css";
import { SiteShell } from "@/components/SiteShell";
import { getDictionary } from "@/lib/i18n";
import { hasLocale, LOCALES } from "@/lib/locales";

// Vietnamese needs its own font subset for diacritics.
const inter = Inter({ variable: "--font-inter", subsets: ["latin", "vietnamese"] });
const display = Newsreader({ variable: "--font-newsreader", subsets: ["latin", "vietnamese"] });

// Runs before first paint so the saved (or system) theme never flashes the wrong colors.
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("theme");var d=t?t==="dark":matchMedia("(prefers-color-scheme: dark)").matches;var r=document.documentElement;r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light"}catch(e){}})()`;

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
  const dict = await getDictionary(lang);

  return (
    // suppressHydrationWarning: the inline script adds the "dark" class before React hydrates.
    <html lang={lang} className={`${inter.variable} ${display.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <SiteShell lang={lang} dict={dict}>
          {children}
        </SiteShell>
      </body>
    </html>
  );
}
