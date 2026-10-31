import { act, render, screen } from "@testing-library/react";
import { beforeEach, expect, test } from "vitest";
import { STORAGE_KEY } from "@/lib/progress/storage";
import { useSettings } from "./hooks";
import { applySettingsToDocument, getSettings, resolveTheme, setSetting } from "./settings";
import { SettingsSync } from "./theme";

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  delete document.documentElement.dataset.reduceMotion;
});

test("settings start at the defaults and setSetting saves one field", () => {
  expect(getSettings()).toEqual({ theme: "light", sound: false, lofi: false, labels: true, reduceMotion: false, englishTerms: true, telemetry: false });
  setSetting("lofi", true);
  setSetting("theme", "dark");
  expect(getSettings()).toMatchObject({ lofi: true, theme: "dark" });
  expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}").settings).toMatchObject({ lofi: true, theme: "dark" });
});

test("settings share the saved document with progress", () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, done: { "drone:quad5:build": true } }));
  setSetting("sound", true);
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  expect(saved.done).toEqual({ "drone:quad5:build": true });
  expect(saved.settings.sound).toBe(true);
});

test("resolveTheme follows the OS only for system", () => {
  expect(resolveTheme("system", true)).toBe("dark");
  expect(resolveTheme("system", false)).toBe("light");
  expect(resolveTheme("light", true)).toBe("light");
  expect(resolveTheme("dark", false)).toBe("dark");
});

test("applySettingsToDocument sets the attributes globals.css reads", () => {
  const root = document.documentElement;
  applySettingsToDocument({ theme: "dark", sound: true, lofi: false, labels: true, reduceMotion: true, englishTerms: true, telemetry: true });
  expect(root.dataset.theme).toBe("dark");
  expect(root.dataset.reduceMotion).toBe("true");
  applySettingsToDocument({ theme: "system", sound: true, lofi: false, labels: true, reduceMotion: false, englishTerms: true, telemetry: true });
  expect(root.dataset.theme).toBeUndefined();
  expect(root.dataset.reduceMotion).toBeUndefined();
});

function ThemeReadout() {
  return <p data-testid="theme">{useSettings().theme}</p>;
}

test("SettingsSync keeps <html> in step and puts the theme back after React resets it", () => {
  setSetting("theme", "light");
  render(
    <>
      <SettingsSync />
      <ThemeReadout />
    </>,
  );
  expect(document.documentElement.dataset.theme).toBe("light");
  act(() => setSetting("theme", "dark"));
  expect(document.documentElement.dataset.theme).toBe("dark");
  expect(screen.getByTestId("theme").textContent).toBe("dark");
});
