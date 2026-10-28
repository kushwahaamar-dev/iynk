import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import { Logo } from "@/components/shell/Logo";
import { LOCALES, LOCALE_NAMES } from "@/i18n/config";
import { SettingsBootScript } from "@/lib/settings/theme";
import "./globals.css";

// No language is known here: the copy is English and each language is named in its own words.
// The page bypasses the layouts, so it reads the saved theme with the same boot script the language layout uses.
const sans = Geist({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: "Page not found · iynk",
  description: "This page does not exist.",
};

export default function GlobalNotFound() {
  return (
    <html lang="en" className={sans.variable} suppressHydrationWarning>
      <head>
        <SettingsBootScript />
      </head>
      <body className="flex min-h-dvh items-center justify-center px-4 py-12">
        <main className="w-full max-w-md rounded-2xl bg-sunken p-8 text-center">
          <Logo height={28} className="mx-auto text-ink" />
          <p className="kicker mt-8 tabular-nums">404</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance">Page not found</h1>
          <p className="mt-4 text-base text-pretty text-muted">Choose a language to continue.</p>
          <ul className="mt-8 grid grid-cols-2 gap-3">
            {LOCALES.map((locale) => (
              <li key={locale}>
                <Link
                  href={`/${locale}`}
                  lang={locale}
                  className="flex min-h-11 items-center justify-center rounded-lg bg-paper px-3 py-2 text-base font-semibold text-ink no-underline motion-fade hover:bg-hover"
                >
                  {LOCALE_NAMES[locale]}
                </Link>
              </li>
            ))}
          </ul>
        </main>
      </body>
    </html>
  );
}
