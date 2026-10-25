import Link from "next/link";
import type { ReactNode } from "react";
import type { Locale } from "@/i18n/config";
import { getT } from "@/i18n/server";
import { Logo } from "./Logo";
import { MobileNav } from "./MobileNav";
import { NAV, type NavId } from "./nav";
import { NavLinks } from "./NavLinks";
import { SettingsMenu, type SettingsLabels } from "./SettingsMenu";

type SiteHeaderProps = {
  lang: Locale;
  /** Extra header controls, shown before Settings. */
  actions?: ReactNode;
};

export async function SiteHeader({ lang, actions }: SiteHeaderProps) {
  const [t, common] = await Promise.all([getT(lang, "shell"), getT(lang, "common")]);
  const nav = Object.fromEntries(NAV.map((entry) => [entry.id, t(`nav.${entry.id}`)])) as Record<NavId, string>;
  const settings: SettingsLabels = {
    settings: t("settings.label"),
    language: t("language.label"),
    theme: { label: t("theme.label"), system: t("theme.system"), light: t("theme.light"), dark: t("theme.dark") },
  };

  return (
    <header className="sticky top-0 z-30 border-b-2 border-line bg-paper/95 backdrop-blur-sm supports-[backdrop-filter]:bg-paper/85">
      <div className="frame flex h-14 items-center gap-3">
        <Link href={`/${lang}`} className="-ms-1 flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-1 no-underline">
          <Logo size={34} />
          {/* The wordmark is a name: it keeps its face in every language. */}
          <span aria-hidden="true" lang="en" className="font-head text-xl font-bold leading-none tracking-tight">
            {common("site.name")}
          </span>
          <span className="sr-only">{t("brand.home")}</span>
        </Link>
        <nav aria-label={t("nav.label")} className="ms-3 hidden min-w-0 lg:block">
          <NavLinks lang={lang} labels={nav} layout="bar" />
        </nav>
        <div className="ms-auto flex items-center gap-1.5">
          {actions}
          <div className="hidden lg:block">
            <SettingsMenu lang={lang} labels={settings} />
          </div>
          <div className="lg:hidden">
            <MobileNav
              lang={lang}
              labels={{ nav, menu: t("nav.menu"), closeMenu: t("nav.closeMenu"), navLabel: t("nav.label"), settings }}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
