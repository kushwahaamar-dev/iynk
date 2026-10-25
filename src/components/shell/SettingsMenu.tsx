"use client";

import { UsageToggle } from "@/components/settings/UsageToggle";
import { IconButton } from "@/components/ui/IconButton";
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

/** Every site setting in one place: theme, language, sound, motion and the usage counts. */
export function SettingsPanel({ lang, labels }: { lang: Locale; labels: SettingsLabels }) {
  const t = useCommonT();
  const { sound, reduceMotion } = useSettings();
  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="ink-label mb-1">{labels.theme.label}</div>
        <ThemeControl labels={labels.theme} showText stretch />
      </div>
      <LanguagePicker lang={lang} label={labels.language} showLabel />
      <div className="divide-y divide-rule border-t-[1.5px] border-rule">
        <Toggle
          label={t("sound.label")}
          checked={sound}
          onChange={(on) => {
            setSetting("sound", on);
            // This click is the gesture the browser needs before it lets a page make sound.
            if (on) startSound();
            else silence();
          }}
          className="py-1"
        />
        <Toggle label={t("motion.label")} checked={reduceMotion} onChange={(on) => setSetting("reduceMotion", on)} className="py-1" />
        <UsageToggle className="pt-2" />
      </div>
    </div>
  );
}

/** The header's Settings button and its popover. */
export function SettingsMenu({ lang, labels }: { lang: Locale; labels: SettingsLabels }) {
  return (
    <Popover label={labels.settings} trigger={<IconButton icon="settings" label={labels.settings} />} className="w-[min(21rem,calc(100vw-2rem))] p-4">
      <SettingsPanel lang={lang} labels={labels} />
    </Popover>
  );
}
