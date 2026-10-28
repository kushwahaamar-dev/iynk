import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Noto_Sans_Devanagari } from "next/font/google";
import { notFound } from "next/navigation";
import { SiteFooter, SiteHeader } from "@/components/shell";
import { SkipLink } from "@/components/ui/SkipLink";
import { I18nProvider } from "@/i18n/client";
import { LOCALES, htmlLang, isLocale } from "@/i18n/config";
import { siteUrl } from "@/i18n/seo";
import { getMessages, getT } from "@/i18n/server";
import { PAPER_DARK, PAPER_LIGHT } from "@/lib/theme-colors";
import { SettingsBootScript, SettingsSync } from "@/lib/settings/theme";
import "../globals.css";

// `subsets` only picks the preloaded files. Devanagari is fetched only by
// pages with Hindi text; Chinese uses platform fonts (styles/type.css).
const sans = Geist({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });
const devanagari = Noto_Sans_Devanagari({ subsets: ["devanagari"], variable: "--font-devanagari", preload: false, display: "swap" });
const fontVariables = [sans, mono, devanagari].map((font) => font.variable).join(" ");

// Every route under this layout is fully static, and an unknown slug is a
// real 404 from the first request.
export const ensureStatic = "navigation";

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: PAPER_LIGHT },
    { media: "(prefers-color-scheme: dark)", color: PAPER_DARK },
  ],
  colorScheme: "light dark",
};

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = await getT(lang, "common");
  const name = t("site.name");
  const title = `${name} · ${t("site.tagline")}`;
  const description = t("site.description");
  return {
    metadataBase: siteUrl(),
    title: { template: `%s · ${name}`, default: title },
    description,
    applicationName: name,
    // A link shared in a chat or on Devpost shows the product, not a bare URL.
    openGraph: { type: "website", siteName: name, title, description, locale: htmlLang(lang) },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function LangLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const [t, common] = await Promise.all([getT(lang, "common"), getMessages(lang, "common")]);
  // Activity keeps the previous language's layout in the DOM after a switch,
  // so the skip target carries the language to stay unique.
  const mainId = `main-${lang}`;

  return (
    <html lang={htmlLang(lang)} dir="ltr" className={fontVariables} suppressHydrationWarning>
      <head>
        <SettingsBootScript />
      </head>
      <body className="flex flex-col">
        <I18nProvider locale={lang} messages={common.client}>
          <SettingsSync />
          <SkipLink label={t("a11y.skipToContent")} target={mainId} />
          <SiteHeader lang={lang} />
          <main id={mainId} tabIndex={-1} className="flex-1 outline-none">
            {children}
          </main>
          <SiteFooter lang={lang} />
        </I18nProvider>
      </body>
    </html>
  );
}
