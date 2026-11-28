import type { Metadata } from "next";
import { Be_Vietnam_Pro, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${body.variable} ${figures.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <header className="border-b border-seam">
          <div className="mx-auto flex h-14 w-full max-w-[90rem] items-center px-4 sm:px-8">
            <Link href="/" className="font-semibold tracking-wide">
              Job Radar
            </Link>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
