import { act, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { I18nProvider } from "@/i18n/client";
import common from "@/i18n/messages/en/common.json";
import { OPEN_COMMAND_EVENT, type CommandLabels } from "./CommandMenuHost";
import { NavBar, type NavBarLabels } from "./NavBar";
import type { SettingsLabels } from "./SettingsMenu";

vi.mock("next/navigation", () => ({ usePathname: () => "/en/boards/uno-r3", useRouter: () => ({ push: vi.fn() }) }));
vi.mock("./LanguagePicker", () => ({ LanguagePicker: () => null }));
vi.mock("./MobileNav", () => ({ MobileNav: () => null }));

const labels: NavBarLabels = {
  home: "iynk, go to the dashboard",
  navLabel: "Labs",
  nav: { dashboard: "Dashboard", boards: "Board Lab", robotics: "Robotics Lab", drones: "Drone Lab", together: "Together", about: "About" },
  menu: "Menu",
  closeMenu: "Close menu",
  search: "Search",
  searchHint: "Search pages and actions",
};
const settings: SettingsLabels = { settings: "Settings", language: "Language", theme: { label: "Theme", system: "System", light: "Light", dark: "Dark" } };
const commandLabels: CommandLabels = {
  title: "Command menu",
  placeholder: "Search",
  empty: "Nothing matches",
  groups: { pages: "Pages", actions: "Actions", theme: "Theme", language: "Language" },
  nav: labels.nav,
  keys: "Keys and usage",
  sound: { on: "Sound on", off: "Sound off" },
  motion: { on: "Reduce motion", off: "Allow motion" },
  theme: { system: "System", light: "Light", dark: "Dark" },
};

const renderBar = () =>
  render(
    <I18nProvider locale="en" messages={common.client}>
      <NavBar lang="en" labels={labels} settings={settings} commandLabels={commandLabels} />
    </I18nProvider>,
  );

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function mix(foreground: string, background: string, alpha: number): string {
  const channel = (i: number) => Math.round(parseInt(foreground.slice(i, i + 2), 16) * alpha + parseInt(background.slice(i, i + 2), 16) * (1 - alpha));
  return `#${[1, 3, 5].map((i) => channel(i).toString(16).padStart(2, "0")).join("")}`;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

test("the bar is 90 percent paper and muted text stays at 4.5 to 1 over the worst content behind it", () => {
  const { container } = renderBar();
  expect(container.firstElementChild?.className).toContain("bg-paper/90");
  const lightPaper = "#f2efe7";
  const lightMuted = "#625b4f";
  const darkPaper = "#131209";
  const darkMuted = "#b3aa98";
  expect(contrast(lightMuted, mix(lightPaper, "#000000", 0.9))).toBeGreaterThanOrEqual(4.5);
  expect(contrast(darkMuted, mix(darkPaper, "#ffffff", 0.9))).toBeGreaterThanOrEqual(4.5);
});

test("one labelled nav marks only the current page", () => {
  renderBar();
  const nav = screen.getByRole("navigation", { name: "Labs", hidden: true });
  expect(screen.getAllByRole("navigation", { hidden: true })).toHaveLength(1);
  const current = nav.querySelectorAll('[aria-current="page"]');
  expect(current).toHaveLength(1);
  expect(current[0].textContent).toBe("Board Lab");
});

test("the search button has a name and opens the command menu", () => {
  renderBar();
  const opened = vi.fn();
  window.addEventListener(OPEN_COMMAND_EVENT, opened);
  act(() => screen.getByRole("button", { name: "Search" }).click());
  window.removeEventListener(OPEN_COMMAND_EVENT, opened);
  expect(opened).toHaveBeenCalledOnce();
});
