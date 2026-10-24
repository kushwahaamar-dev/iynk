"use client";

import { useState } from "react";
import { IconButton } from "@/components/ui/IconButton";
import { Sheet } from "@/components/ui/Sheet";
import type { Locale } from "@/i18n/config";
import { LanguagePicker } from "./LanguagePicker";
import type { NavId } from "./nav";
import { NavLinks } from "./NavLinks";
import { ThemeControl } from "./ThemeControl";

type MobileNavProps = {
  lang: Locale;
  labels: {
    nav: Record<NavId, string>;
    menu: string;
    closeMenu: string;
    navLabel: string;
    language: string;
    theme: { label: string; system: string; light: string; dark: string };
  };
};

/** The phone menu: a drawer with the labs, the theme and the language. */
export function MobileNav({ lang, labels }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <IconButton icon="menu" label={labels.menu} aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen(true)} variant="raised" />
      <Sheet open={open} onClose={() => setOpen(false)} title={labels.menu} closeLabel={labels.closeMenu} side="end">
        <nav aria-label={labels.navLabel}>
          <NavLinks lang={lang} labels={labels.nav} layout="sheet" onNavigate={() => setOpen(false)} />
        </nav>
        <div className="mt-6 flex flex-col gap-4 border-t-2 border-rule pt-5">
          <div>
            <div className="ink-kicker mb-2">{labels.theme.label}</div>
            <ThemeControl labels={labels.theme} showText />
          </div>
          <div>
            <div className="ink-kicker mb-2">{labels.language}</div>
            <LanguagePicker lang={lang} label={labels.language} />
          </div>
        </div>
      </Sheet>
    </>
  );
}
