"use client";

import { useEffect, useState } from "react";
import { KeysDialog, OPEN_KEYS_EVENT } from "@/components/settings/KeysDialog";
import { UsageToggle } from "@/components/settings/UsageToggle";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/icons";
import { Popover } from "@/components/ui/Popover";
import { Toggle } from "@/components/ui/Toggle";
import { useCommonT } from "@/i18n/client";
import type { Locale } from "@/i18n/config";
import { setSetting } from "@/lib/settings/settings";
import { useSettings } from "@/lib/settings/hooks";
import { silence, startSound } from "@/lib/sound";
import { LanguagePicker } from "./LanguagePicker";
import { ThemeControl, type ThemeLabels } from "./ThemeControl";

export type SettingsLabels = { settings: string; language: string; theme: ThemeLabels };

/** Every site setting in one place: theme, language, sound, motion, usage counts and the way into the keys dialog. */
export function SettingsPanel({ lang, labels }: { lang: Locale; labels: SettingsLabels }) {
  const t = useCommonT();
  const { sound, reduceMotion } = useSettings();
  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="kicker mb-1">{labels.theme.label}</div>
        <ThemeControl labels={labels.theme} />
      </div>
      <LanguagePicker lang={lang} label={labels.language} showLabel />
      <div className="divide-y divide-rule border-t border-rule">
        <Toggle
          label={t("sound.label")}
          checked={sound}
          onChange={(on) => {
            setSetting("sound", on);
            // This click is the gesture the browser needs before it lets a page make sound.
            if (on) startSound();
            else silence();
          }}
        />
        <Toggle label={t("motion.label")} checked={reduceMotion} onChange={(on) => setSetting("reduceMotion", on)} />
        <UsageToggle />
      </div>
      <Button
        variant="secondary"
        size="sm"
        onClick={(event) => {
          // The popover is in the top layer and would sit over the dialog.
          event.currentTarget.closest<HTMLElement>("[popover]")?.hidePopover?.();
          window.dispatchEvent(new CustomEvent(OPEN_KEYS_EVENT));
        }}
      >
        <Icon name="key" size={20} aria-hidden="true" />
        {t("keys.open")}
      </Button>
    </div>
  );
}

/**
 * The header's Settings button and its popover. The button is quiet: a gear and the page's language code,
 * since the language picker is the first thing most people come here for.
 */
export function SettingsMenu({ lang, labels }: { lang: Locale; labels: SettingsLabels }) {
  const [keysOpen, setKeysOpen] = useState(false);
  useEffect(() => {
    const open = () => setKeysOpen(true);
    window.addEventListener(OPEN_KEYS_EVENT, open);
    return () => window.removeEventListener(OPEN_KEYS_EVENT, open);
  }, []);
  const trigger = (
    <Button variant="ghost" size="sm">
      <span className="sr-only">{labels.settings}</span>
      <Icon name="settings" size={20} aria-hidden="true" />
      <span aria-hidden="true" className="text-sm font-semibold uppercase">
        {lang}
      </span>
    </Button>
  );
  return (
    <>
      <Popover label={labels.settings} trigger={trigger} className="w-[min(21rem,calc(100vw-2rem))] p-4">
        <SettingsPanel lang={lang} labels={labels} />
      </Popover>
      <KeysDialog open={keysOpen} onClose={() => setKeysOpen(false)} />
    </>
  );
}
