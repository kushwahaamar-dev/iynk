export {
  DEFAULT_SETTINGS,
  applySettingsToDocument,
  getSettings,
  prefersDark,
  resolveTheme,
  setSetting,
  type ResolvedTheme,
  type Settings,
  type ThemeSetting,
} from "./settings";
export { useResolvedTheme, useSettings } from "./hooks";
export { SettingsBootScript, SettingsSync } from "./theme";
