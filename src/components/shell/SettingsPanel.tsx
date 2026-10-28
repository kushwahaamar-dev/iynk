"use client";

import { OPEN_KEYS_EVENT } from "@/components/settings/KeysDialog";
import { UsageToggle } from "@/components/settings/UsageToggle";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/icons";
import { Toggle } from "@/components/ui/Toggle";
import { useCommonT } from "@/i18n/client";
import type { Locale } from "@/i18n/config";
import { setSetting } from "@/lib/settings/settings";
import { useSettings } from "@/lib/settings/hooks";
import { silence, startSound } from "@/lib/sound";
import { LanguagePicker } from "./LanguagePicker";
import type { SettingsLabels } from "./SettingsMenu";
import { ThemeControl } from "./ThemeControl";

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

