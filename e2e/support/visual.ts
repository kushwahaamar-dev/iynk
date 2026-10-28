import type { Page } from "@playwright/test";
import { DEFAULT_SETTINGS, STORAGE_KEY } from "../../src/lib/progress/storage";
import common from "../../src/i18n/messages/en/common.json";
import shell from "../../src/i18n/messages/en/shell.json";
import ai from "../../src/i18n/messages/en/ai.json";
import search from "../../src/i18n/messages/en/search.json";
import together from "../../src/i18n/messages/en/together.json";
import { dockCopy, openDock } from "../dock-shared";
import { waitForAnimations } from "./settled";

export type Theme = (typeof THEMES)[number];
export type ViewportName = keyof typeof VIEWPORTS;

export const THEMES = ["light", "dark"] as const;

export const VIEWPORTS = {
  desktop: { viewport: { width: 1440, height: 900 }, hasTouch: false },
  phone: { viewport: { width: 390, height: 844 }, hasTouch: true },
} as const;

export type Screen = {
  name: string;
  path: string;
  /** Opens an overlay on the settled page. */
  before?: (page: Page, viewport: ViewportName) => Promise<void>;
  /** Overlays that only exist on one viewport (Settings sits in the menu on a phone, the dock is a sheet there). */
  only?: ViewportName;
};

const settingsButton = (page: Page) => page.locator("header:visible").first().getByRole("button", { name: shell.settings.label });

const LESSON = "/en/boards/uno-r3/blink";

const dockTab = (tab: keyof typeof dockCopy.tabs) => async (page: Page, viewport: ViewportName) => {
  const dock = await openDock(page, viewport === "phone");
  await dock.getByRole("tab", { name: dockCopy.tabs[tab] }).click();
  return dock;
};

export const SCREENS: Screen[] = [
  { name: "home-en", path: "/en" },
  { name: "home-de", path: "/de" },
  { name: "home-hi", path: "/hi" },
  { name: "boards", path: "/en/boards" },
  { name: "board", path: "/en/boards/uno-r3" },
  { name: "lesson", path: "/en/boards/uno-r3/blink" },
  { name: "robotics", path: "/en/robotics" },
  { name: "bench", path: "/en/robotics/l298n" },
  { name: "drones", path: "/en/drones" },
  { name: "drone", path: "/en/drones/quad5" },
  { name: "fly", path: "/en/drones/quad5/fly" },
  { name: "together", path: "/en/together" },
  { name: "about", path: "/en/about" },
  { name: "privacy", path: "/en/privacy" },
  { name: "not-found", path: "/en/does-not-exist" },
  { name: "not-found-global", path: "/zzz" },
  {
    name: "settings",
    path: "/en",
    only: "desktop",
    before: async (page) => {
      await settingsButton(page).click();
      await page.locator("header:visible").first().getByRole("dialog", { name: shell.settings.label }).waitFor();
      await waitForAnimations(page);
    },
  },
  {
    name: "command-menu",
    path: "/en",
    before: async (page) => {
      await page.keyboard.press("Control+K");
      await page.getByRole("dialog", { name: shell.command.title }).waitFor();
    },
  },
  {
    name: "keys",
    path: "/en",
    before: async (page) => {
      await page.evaluate(() => window.dispatchEvent(new CustomEvent("iynk:open-keys")));
      await page.getByRole("dialog", { name: common.client.keys.title }).waitFor();
    },
  },
  {
    name: "dock",
    path: "/en/boards/uno-r3",
    only: "desktop",
    before: async (page) => {
      await openDock(page, false);
    },
  },
  {
    name: "dock-partner",
    path: LESSON,
    before: async (page, viewport) => {
      const dock = await dockTab("partner")(page, viewport);
      await dock.getByRole("region", { name: ai.panel.title }).waitFor();
    },
  },
  {
    name: "dock-together",
    path: LESSON,
    before: async (page, viewport) => {
      const dock = await dockTab("together")(page, viewport);
      await dock.getByRole("button", { name: together.panel.start }).waitFor();
    },
  },
  {
    name: "dock-real",
    path: LESSON,
    before: async (page, viewport) => {
      const dock = await dockTab("real")(page, viewport);
      await dock.getByTestId("not-set-up").last().or(dock.getByRole("button", { name: search.real.check })).waitFor();
    },
  },
  {
    name: "room",
    path: LESSON,
    before: async (page, viewport) => {
      const dock = await dockTab("together")(page, viewport);
      await dock.getByRole("button", { name: together.panel.start }).click();
      await dock.getByLabel(together.identity.name).fill("Ana");
      await dock.getByRole("button", { name: together.identity.save }).click();
      await dock.getByLabel(together.chat.label).fill("Is the LED the right way round?");
      await dock.getByRole("button", { name: together.chat.send }).click();
      await dock.getByText(together.bar.keyboardYou).waitFor();
      await dock.getByText("Is the LED the right way round?").waitFor();
    },
  },
  {
    name: "mobile-menu",
    path: "/en",
    only: "phone",
    before: async (page) => {
      await page.getByRole("button", { name: shell.nav.menu }).click();
      await page.getByRole("dialog", { name: shell.nav.menu }).waitFor();
    },
  },
];

/** Starts the page with this theme chosen, the way the Settings control saves it. Call before `goto`. */
export async function setTheme(page: Page, theme: Theme) {
  const saved = { v: 1, done: {}, quiz: {}, best: {}, settings: { ...DEFAULT_SETTINGS, theme } };
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [STORAGE_KEY, JSON.stringify(saved)] as const);
}

/**
 * Brings the page to the state a person sees after reading it: fonts loaded, skeletons gone, every reveal and
 * tagline word lit (they light once and stay lit), back at the top with nothing still moving.
 */
export async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'));
  await page.evaluate(async () => {
    const frames = () => new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done())));
    // The tagline watches the top 60 percent of the screen; a longer step could jump over a word without a callback.
    const step = window.innerHeight * 0.5;
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await frames();
    }
    window.scrollTo(0, document.documentElement.scrollHeight);
    await frames();
    window.scrollTo(0, 0);
    await frames();
  });
  await idle(page);
}

/** Waits for the entrance animations to end (at most 1.5 s), so a scan or a screenshot sees the final colours. */
export async function idle(page: Page) {
  await page
    .waitForFunction(() => !document.getAnimations().some((a) => a.playState === "running" && a.effect?.getComputedTiming().endTime !== Infinity), undefined, { timeout: 1_500 })
    .catch(() => undefined);
  await page.evaluate(() => new Promise<void>((done) => requestAnimationFrame(() => done())));
}
