"use client";

import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { useCommonT } from "@/i18n/client";
import { setSetting } from "@/lib/settings/settings";
import { useSettings } from "@/lib/settings/hooks";
import { silence, startSound } from "@/lib/sound";

function Speaker({ on }: { on: boolean }) {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
      <path d={on ? "M15.5 9a4.5 4.5 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11" : "M16 9.5l5 5M21 9.5l-5 5"} />
    </svg>
  );
}

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
      <Speaker on={sound} />
      <span>{t("sound.label")}</span>
    </Button>
  );
}
