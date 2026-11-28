import type { Metadata } from "next";
import { Be_Vietnam_Pro, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { getProfile } from "@/lib/db";
import { NavLinks } from "./nav-links";
import { updatedAt } from "@/lib/ui";
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

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: LayoutProps<"/">) {
  const profile = getProfile();
  return (
    <html lang="vi" className={`${body.variable} ${figures.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <header className="border-b border-seam">
          <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-8 px-4 sm:px-8">
            <Link href="/" className="font-semibold tracking-wide">
              Job Radar
            </Link>
            {profile && (
              <NavLinks />
            )}
            <p className="ml-auto text-[13px] text-steel">
              {profile ? (
                <>
                  <span className="hidden sm:inline">CV cập nhật </span>
                  <span className="figure">{updatedAt(profile.updatedAt)}</span>
                </>
              ) : (
                "Chưa có CV"
              )}
            </p>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
