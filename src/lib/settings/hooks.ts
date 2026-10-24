"use client";

import { useSyncExternalStore } from "react";
import { useSaved } from "@/lib/progress/hooks";
import { prefersDark, resolveTheme, subscribePrefersDark, type ResolvedTheme, type Settings } from "./settings";

/** The saved settings; defaults on the server and during hydration. */
export function useSettings(): Settings {
  return useSaved().settings;
}

/** The theme actually showing, following the OS when the setting is "system". */
export function useResolvedTheme(): ResolvedTheme {
  const { theme } = useSettings();
  const dark = useSyncExternalStore(subscribePrefersDark, prefersDark, () => false);
  return resolveTheme(theme, dark);
}
