import { expect, type Locator, type Page } from "@playwright/test";
import ai from "../src/i18n/messages/en/ai.json";
import common from "../src/i18n/messages/en/common.json";
import search from "../src/i18n/messages/en/search.json";
import shell from "../src/i18n/messages/en/shell.json";
import together from "../src/i18n/messages/en/together.json";

export const dockCopy = common.client.dock;

export const LAB_PAGES = [
  { name: "board", path: "/en/boards/nano", lab: "board", item: "nano" },
  { name: "lesson", path: "/en/boards/nano/blink", lab: "board", item: "nano" },
  { name: "bench", path: "/en/robotics/transistor-switch", lab: "robotics", item: "transistor-switch" },
  { name: "drone", path: "/en/drones/quad5", lab: "drone", item: "quad5" },
  { name: "fly", path: "/en/drones/quad5/fly", lab: "drone", item: "quad5" },
] as const;

export function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && /hydrat|did not match|Minified React error/i.test(message.text())) {
      errors.push(message.text());
    }
  });
  return errors;
}

/** The open dock: the inline panel on a desk, the bottom sheet on a phone. */
export async function openDock(page: Page, phone: boolean): Promise<Locator> {
  const root = page.locator('[data-testid="lab-dock"][data-ready="true"]:visible');
  await expect(root).toBeVisible();
  if (!phone) {
    await expect(root).toHaveAttribute("data-layout", "desk");
    return root;
  }
  await expect(root).toHaveAttribute("data-layout", "phone");
  await root.getByRole("button", { name: dockCopy.open }).click();
  const dialog = page.getByRole("dialog", { name: dockCopy.label });
  await expect(dialog).toBeVisible();
  return dialog;
}

export async function expectTabs(dock: Locator) {
  for (const name of [dockCopy.tabs.partner, dockCopy.tabs.together, dockCopy.tabs.real]) {
    await dock.getByRole("tab", { name }).click();
    await expect(dock.getByRole("tab", { name })).toHaveAttribute("aria-selected", "true");
  }
  await expect(dock.getByRole("tab", { name: dockCopy.tabs.passport })).toHaveCount(0);
  await expect(dock.getByRole("tab", { name: dockCopy.tabs.hardware })).toHaveCount(0);

  await dock.getByRole("tab", { name: dockCopy.tabs.partner }).click();
  await expect(dock.getByText(ai.status.unavailable).or(dock.getByLabel(ai.panel.inputLabel))).toBeVisible();

  await dock.getByRole("tab", { name: dockCopy.tabs.together }).click();
  await expect(dock.getByRole("button", { name: together.panel.start }).or(dock.getByText(together.panel.unavailable))).toBeVisible();

  await dock.getByRole("tab", { name: dockCopy.tabs.real }).click();
  await expect(dock.getByText(search.real.notSetUp).first().or(dock.getByRole("button", { name: search.real.refresh }))).toBeVisible();
}

export async function expectSolanaNavHidden(page: Page) {
  await expect(page.locator("header:visible").getByRole("link", { name: shell.nav.together })).toBeVisible();
  await expect(page.getByRole("link", { name: shell.nav.passport })).toHaveCount(0);
  await expect(page.getByRole("link", { name: shell.nav.verify })).toHaveCount(0);
}
