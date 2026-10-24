// Settings live in the same saved document as progress (D7).

import { DEFAULT_SETTINGS, getSaved, updateSaved, type Settings, type ThemeSetting } from "@/lib/progress/storage";

export { DEFAULT_SETTINGS, type Settings, type ThemeSetting };

export type ResolvedTheme = "light" | "dark";

export function getSettings(): Settings {
  return getSaved().settings;
}

export function setSetting<K extends keyof Settings>(name: K, value: Settings[K]): void {
  updateSaved((saved) =>
    saved.settings[name] === value ? saved : { ...saved, settings: { ...saved.settings, [name]: value } },
  );
}

export function resolveTheme(theme: ThemeSetting, prefersDark: boolean): ResolvedTheme {
  if (theme === "system") return prefersDark ? "dark" : "light";
  return theme;
}

const DARK_QUERY = "(prefers-color-scheme: dark)";

export function prefersDark(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(DARK_QUERY).matches;
}

export function subscribePrefersDark(listener: () => void): () => void {
  if (typeof window.matchMedia !== "function") return () => {};
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}

/**
 * Puts the settings on <html> for CSS: data-theme="light" | "dark" only for
 * an explicit choice ("system" leaves it to prefers-color-scheme), and
 * data-reduce-motion="true" when the user asked for less motion (the
 * attributes globals.css keys on).
 */
export function applySettingsToDocument(settings: Settings, root: HTMLElement = document.documentElement): void {
  if (settings.theme === "system") delete root.dataset.theme;
  else root.dataset.theme = settings.theme;
  if (settings.reduceMotion) root.dataset.reduceMotion = "true";
  else delete root.dataset.reduceMotion;
}
