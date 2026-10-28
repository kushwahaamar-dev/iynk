"use client";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/icons";
import { IconButton } from "@/components/ui/IconButton";
import { useCommonT } from "@/i18n/client";
import { setSetting } from "@/lib/settings/settings";
import { useSettings } from "@/lib/settings/hooks";
import { silence, startSound } from "@/lib/sound";

/**
 * The sound setting as one button: figure sounds and lab cues, off until pressed.
 * `compact` is the icon-only form for a workspace bar.
 */
export function SoundToggle({ className, compact = false }: { className?: string; compact?: boolean }) {
  const t = useCommonT();
  const { sound } = useSettings();
  const toggle = () => {
    setSetting("sound", !sound);
    // This click is the gesture the browser needs before it lets a page make sound.
    if (sound) silence();
    else startSound();
  };

  if (compact) {
    return (
      <IconButton
        icon={sound ? "sound-on" : "sound-off"}
        label={t("sound.label")}
        title={t(sound ? "sound.turnOff" : "sound.turnOn")}
        size="sm"
        className={className}
        aria-pressed={sound}
        data-testid="sound-toggle"
        onClick={toggle}
      />
    );
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      className={className}
      aria-pressed={sound}
      title={t(sound ? "sound.turnOff" : "sound.turnOn")}
      data-testid="sound-toggle"
      onClick={toggle}
    >
      <Icon name={sound ? "sound-on" : "sound-off"} size={20} aria-hidden="true" />
      <span>{t("sound.label")}</span>
    </Button>
  );
}
