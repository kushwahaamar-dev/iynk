"use client";

import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { setSetting, useSettings, type ThemeSetting } from "@/lib/settings";

export type ThemeLabels = { label: string; system: string; light: string; dark: string };

/**
 * Light, dark or follow the system, as words across the settings panel. There is no room for icons as well:
 * "Comme le système" alone takes 113 of the panel's 292 px.
 */
export function ThemeControl({ labels }: { labels: ThemeLabels }) {
  const { theme } = useSettings();
  const options = [
    { value: "system", label: labels.system },
    { value: "light", label: labels.light },
    { value: "dark", label: labels.dark },
  ] as const;
  return <SegmentedControl<ThemeSetting> label={labels.label} options={options} value={theme} onChange={(value) => setSetting("theme", value)} stretch />;
}
