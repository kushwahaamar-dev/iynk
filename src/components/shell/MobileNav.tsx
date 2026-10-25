"use client";

import { useState } from "react";
import { IconButton } from "@/components/ui/IconButton";
import { Sheet } from "@/components/ui/Sheet";
import type { Locale } from "@/i18n/config";
import type { NavId } from "./nav";
import { NavLinks } from "./NavLinks";
import { SettingsPanel, type SettingsLabels } from "./SettingsMenu";

type MobileNavProps = {
  lang: Locale;
  labels: {
    nav: Record<NavId, string>;
    menu: string;
    closeMenu: string;
    navLabel: string;
    settings: SettingsLabels;
  };
};

/** The menu under 1024 px: a drawer with the labs and every setting. */
export function MobileNav({ lang, labels }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <IconButton icon="menu" label={labels.menu} aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen(true)} className="-me-2.5" />
      <Sheet open={open} onClose={() => setOpen(false)} title={labels.menu} closeLabel={labels.closeMenu} side="end">
        <nav aria-label={labels.navLabel}>
          <NavLinks lang={lang} labels={labels.nav} layout="sheet" onNavigate={() => setOpen(false)} />
        </nav>
        <section aria-label={labels.settings.settings} className="mt-8">
          <SettingsPanel lang={lang} labels={labels.settings} />
        </section>
      </Sheet>
    </>
  );
}
