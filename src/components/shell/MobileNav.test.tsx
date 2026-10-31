import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { I18nProvider } from "@/i18n/client";
import common from "@/i18n/messages/en/common.json";
import { MobileNav } from "./MobileNav";
import type { SettingsLabels } from "./SettingsMenu";

vi.mock("next/navigation", () => ({ usePathname: () => "/en/boards/uno-r3", useRouter: () => ({ push: vi.fn() }) }));
vi.mock("./LanguagePicker", () => ({ LanguagePicker: () => null }));

const settings: SettingsLabels = { settings: "Settings", language: "Language", theme: { label: "Theme", system: "System", light: "Light", dark: "Dark" } };
const labels = {
  home: "iynk, go to the dashboard",
  nav: { dashboard: "Dashboard", boards: "Board Lab", robotics: "Robotics Lab", drones: "Drone Lab", together: "Together", about: "About" },
  menu: "Menu",
  closeMenu: "Close menu",
  navLabel: "Labs",
  settings,
};

const renderNav = () =>
  render(
    <I18nProvider locale="en" messages={common.client}>
      <MobileNav lang="en" labels={labels} />
    </I18nProvider>,
  );

test("the toggle reports whether the panel is open", () => {
  renderNav();
  const toggle = screen.getByRole("button", { name: "Menu" });
  expect(toggle.getAttribute("aria-expanded")).toBe("false");
  fireEvent.click(toggle);
  expect(toggle.getAttribute("aria-expanded")).toBe("true");
  expect(toggle.getAttribute("aria-label")).toBe("Close menu");
});

test("the open panel is a modal dialog in the body, with the first link focused", () => {
  renderNav();
  fireEvent.click(screen.getByRole("button", { name: "Menu" }));
  const panel = screen.getByRole("dialog");
  expect(panel.getAttribute("aria-modal")).toBe("true");
  expect(panel.parentElement).toBe(document.body);
  expect(document.activeElement?.textContent).toBe(labels.nav.dashboard);
});

test("links carry their position for the stagger", () => {
  renderNav();
  fireEvent.click(screen.getByRole("button", { name: "Menu" }));
  const items = Array.from(screen.getByRole("dialog").querySelectorAll<HTMLElement>("nav li"));
  expect(items.length).toBeGreaterThan(1);
  expect(items.map((li) => li.style.getPropertyValue("--i"))).toEqual(items.map((_, index) => String(index)));
});

test("Escape closes the panel and focus returns to the toggle", () => {
  renderNav();
  const toggle = screen.getByRole("button", { name: "Menu" });
  toggle.focus();
  fireEvent.click(toggle);
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(document.activeElement).toBe(toggle);
});
