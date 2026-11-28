import type { Metadata } from "next";
import { Be_Vietnam_Pro, JetBrains_Mono } from "next/font/google";
import { getSettings } from "@/lib/settings";
import "./globals.css";

const body = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
});

const figures = JetBrains_Mono({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500"],
  variable: "--font-figures",
});

export const metadata: Metadata = {
  title: "Job Radar",
  description: "Job IT hợp với CV của bạn, ở Việt Nam và remote.",
};

// Theme comes from the settings stored in SQLite, so every request reads it.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" data-theme={getSettings().theme} className={`${body.variable} ${figures.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        {children}
      </body>
    </html>
  );
}
