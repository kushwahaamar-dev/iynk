import Link from "next/link";
import type { ReactNode } from "react";
import type { Locale } from "@/i18n/config";
import { getT } from "@/i18n/server";
import { LanguagePicker } from "./LanguagePicker";
import { Logo } from "./Logo";
import { MobileNav } from "./MobileNav";
import { NAV, type NavId } from "./nav";
import { NavLinks } from "./NavLinks";
import { ThemeControl } from "./ThemeControl";

type SiteHeaderProps = {
  lang: Locale;
  /** Extra header controls, shown before the theme and language (the sound toggle goes here). */
  actions?: ReactNode;
};

export async function SiteHeader({ lang, actions }: SiteHeaderProps) {
  const [t, common] = await Promise.all([getT(lang, "shell"), getT(lang, "common")]);
  const nav = Object.fromEntries(NAV.map((entry) => [entry.id, t(`nav.${entry.id}`)])) as Record<NavId, string>;
  const theme = { label: t("theme.label"), system: t("theme.system"), light: t("theme.light"), dark: t("theme.dark") };

  return (
    <header className="sticky top-0 z-30 border-b-2 border-line bg-paper/95 backdrop-blur-sm supports-[backdrop-filter]:bg-paper/85">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link href={`/${lang}`} className="flex min-h-11 shrink-0 items-center gap-2.5 rounded-lg no-underline">
          <Logo size={38} />
          <span aria-hidden="true" className="flex flex-col leading-none">
            <span className="font-head text-xl font-bold tracking-tight">{common("site.name")}</span>
            <span className="mt-0.5 hidden font-ui text-[0.62rem] font-bold uppercase tracking-[0.16em] text-muted lg:block">
              {common("site.tagline")}
            </span>
          </span>
          <span className="sr-only">{t("brand.home")}</span>
        </Link>
        <nav aria-label={t("nav.label")} className="ms-2 hidden md:block">
          <NavLinks lang={lang} labels={nav} layout="bar" />
        </nav>
        <div className="ms-auto flex items-center gap-2">
          {actions}
          <div className="hidden items-center gap-2 md:flex">
            <ThemeControl labels={theme} />
            <LanguagePicker lang={lang} label={t("language.label")} />
          </div>
          <div className="md:hidden">
            <MobileNav
              lang={lang}
              labels={{
                nav,
                menu: t("nav.menu"),
                closeMenu: t("nav.closeMenu"),
                navLabel: t("nav.label"),
                language: t("language.label"),
                theme,
              }}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
