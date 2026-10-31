import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import { OPEN_KEYS_EVENT } from "@/components/settings/KeysDialog";
import { I18nProvider } from "@/i18n/client";
import common from "@/i18n/messages/en/common.json";
import { SettingsMenu, SettingsPanel, type SettingsLabels } from "./SettingsMenu";

vi.mock("./LanguagePicker", () => ({ LanguagePicker: () => null }));

const labels: SettingsLabels = {
  settings: "Settings",
  language: "Language",
  theme: { label: "Theme", system: "System", light: "Light", dark: "Dark" },
};
const keys = common.client.keys;

beforeEach(() => localStorage.clear());

const inEnglish = (ui: React.ReactNode) =>
  render(
    <I18nProvider locale="en" messages={common.client}>
      {ui}
    </I18nProvider>,
  );

test("the Keys and usage button opens the keys dialog", async () => {
  inEnglish(<SettingsMenu lang="en" labels={labels} />);
  expect(screen.queryByRole("dialog", { name: keys.title })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: labels.settings, hidden: true }));
  fireEvent.click(await screen.findByRole("button", { name: keys.open, hidden: true }));
  expect(await screen.findByRole("dialog", { name: keys.title })).toBeTruthy();
});

test("the open event opens the dialog with no popover in sight, and Escape closes it", async () => {
  inEnglish(<SettingsMenu lang="en" labels={labels} />);
  act(() => {
    window.dispatchEvent(new CustomEvent(OPEN_KEYS_EVENT));
  });
  const dialog = await screen.findByRole("dialog", { name: keys.title });
  fireEvent.keyDown(dialog, { key: "Escape" });
  expect(screen.queryByRole("dialog", { name: keys.title })).toBeNull();
});

test("the same button in a drawer dispatches the event the menu listens for", async () => {
  let heard = 0;
  const count = () => heard++;
  window.addEventListener(OPEN_KEYS_EVENT, count);
  inEnglish(<SettingsPanel lang="en" labels={labels} />);
  fireEvent.click(await screen.findByRole("button", { name: keys.open, hidden: true }));
  window.removeEventListener(OPEN_KEYS_EVENT, count);
  expect(heard).toBe(1);
});
