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
  const t = await getT(lang, "shell");
  const nav = Object.fromEntries(NAV.map((entry) => [entry.id, t(`nav.${entry.id}`)])) as Record<NavId, string>;
  const settings: SettingsLabels = {
    settings: t("settings.label"),
    language: t("language.label"),
    theme: { label: t("theme.label"), system: t("theme.system"), light: t("theme.light"), dark: t("theme.dark") },
  };

  return (
    <header className="sticky top-0 z-30 border-b border-rule bg-paper [background-image:var(--grain)]">
      <div className="shell-frame flex h-[57px] items-center gap-5">
        <Link href={`/${lang}`} className="-ms-2 flex min-h-11 shrink-0 items-center rounded-md px-2 text-ink no-underline">
          {/* The wordmark is a drawing: it keeps its face in every language. */}
          <Logo height={23} />
          <span className="sr-only">{t("brand.home")}</span>
        </Link>
        <span aria-hidden="true" className="hidden h-4 w-px bg-rule lg:block" />
        <nav aria-label={t("nav.label")} className="hidden min-w-0 lg:block">
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
