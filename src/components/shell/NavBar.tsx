"use client";

import Link from "next/link";
import { useSyncExternalStore, type ReactNode } from "react";
import { IconButton } from "@/components/ui/IconButton";
import { Kbd } from "@/components/ui/Kbd";
import type { Locale } from "@/i18n/config";
import { CommandMenuHost, OPEN_COMMAND_EVENT, type CommandLabels } from "./CommandMenuHost";
import { Logo } from "./Logo";
import { MobileNav } from "./MobileNav";
import type { NavId } from "./nav";
import { NavLinks } from "./NavLinks";
import { SettingsMenu, type SettingsLabels } from "./SettingsMenu";

export type NavBarLabels = {
  home: string;
  navLabel: string;
  nav: Record<NavId, string>;
  menu: string;
  closeMenu: string;
  search: string;
  searchHint: string;
};

type NavBarProps = {
  lang: Locale;
  labels: NavBarLabels;
  settings: SettingsLabels;
  commandLabels: CommandLabels;
  /** Extra controls, shown before Settings. */
  children?: ReactNode;
};

const subscribe = () => () => {};
const isApplePlatform = () => /Mac|iPhone|iPad/.test(navigator.platform);

/** The floating bar: logo, the labs, search, settings, and on phones the menu button. */
export function NavBar({ lang, labels, settings, commandLabels, children }: NavBarProps) {
  const apple = useSyncExternalStore(subscribe, isApplePlatform, () => false);
  const shortcut = apple ? "⌘K" : "Ctrl K";

  return (
    <div className="pointer-events-auto mx-auto mt-2 flex h-12 w-max max-w-[calc(100%-2rem)] items-center gap-2 rounded-2xl bg-paper/90 px-2 shadow-md backdrop-blur-xl">
      <Link href={`/${lang}`} className="flex min-h-11 shrink-0 items-center rounded-lg px-2 text-ink no-underline motion-fade hover:bg-hover">
        {/* The wordmark is a drawing: it keeps its face in every language. */}
        <Logo height={23} />
        <span className="sr-only">{labels.home}</span>
      </Link>
      <nav aria-label={labels.navLabel} className="hidden min-w-0 lg:block">
        <NavLinks lang={lang} labels={labels.nav} layout="bar" />
      </nav>
      <div className="flex items-center gap-2">
        <IconButton
          icon="search"
          label={labels.search}
          title={labels.searchHint}
          shortcut={shortcut}
          onClick={() => window.dispatchEvent(new CustomEvent(OPEN_COMMAND_EVENT))}
        />
        <span aria-hidden="true" className="hidden xl:block">
          <Kbd>{shortcut}</Kbd>
        </span>
        {children}
        <div className="hidden lg:block">
          <SettingsMenu lang={lang} labels={settings} />
        </div>
        <div className="lg:hidden">
          <MobileNav
            lang={lang}
            labels={{ nav: labels.nav, menu: labels.menu, closeMenu: labels.closeMenu, navLabel: labels.navLabel, settings }}
          />
        </div>
      </div>
      <CommandMenuHost lang={lang} labels={commandLabels} />
    </div>
  );
}
