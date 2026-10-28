import type { ReactNode } from "react";
import type { Locale } from "@/i18n/config";
import { getT } from "@/i18n/server";
import type { CommandLabels } from "./CommandMenuHost";
import { NAV, type NavId } from "./nav";
import { NavBar } from "./NavBar";
import type { SettingsLabels } from "./SettingsMenu";

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

  const commandLabels: CommandLabels = {
    title: t("command.title"),
    placeholder: t("command.placeholder"),
    empty: t("command.empty"),
    groups: {
      pages: t("command.groups.pages"),
      actions: t("command.groups.actions"),
      theme: t("command.groups.theme"),
      language: t("command.groups.language"),
    },
    nav,
    keys: t("command.keys"),
    sound: { on: t("command.sound.on"), off: t("command.sound.off") },
    motion: { on: t("command.motion.on"), off: t("command.motion.off") },
    theme: { system: t("theme.system"), light: t("theme.light"), dark: t("theme.dark") },
  };

  return (
    <header className="pointer-events-none sticky top-0 z-header h-(--header-h)">
      <NavBar
        lang={lang}
        labels={{
          home: t("brand.home"),
          navLabel: t("nav.label"),
          nav,
          menu: t("nav.menu"),
          closeMenu: t("nav.closeMenu"),
          search: t("nav.search"),
          searchHint: t("nav.searchHint"),
        }}
        settings={settings}
        commandLabels={commandLabels}
      >
        {actions}
      </NavBar>
    </header>
  );
}
