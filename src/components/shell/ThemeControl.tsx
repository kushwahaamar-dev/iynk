"use client";

import { Icon } from "@/components/ui/icons";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { setSetting, useSettings, type ThemeSetting } from "@/lib/settings";

type ThemeLabels = { label: string; system: string; light: string; dark: string };

/** Light, dark or follow the system. The label stays the same; the checked option says which. */
export function ThemeControl({ labels, showText = false }: { labels: ThemeLabels; showText?: boolean }) {
  const { theme } = useSettings();
  const options = [
    { value: "system", label: labels.system, icon: <Icon name="system" size={18} /> },
    { value: "light", label: labels.light, icon: <Icon name="sun" size={18} /> },
    { value: "dark", label: labels.dark, icon: <Icon name="moon" size={18} /> },
  ] as const;
  return (
    <SegmentedControl<ThemeSetting>
      label={labels.label}
      options={options}
      value={theme}
      onChange={(value) => setSetting("theme", value)}
      iconOnly={!showText}
    />
  );
}
