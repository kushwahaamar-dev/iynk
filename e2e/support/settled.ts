import type { Page } from "@playwright/test";

export async function waitForAnimations(page: Page) {
  await page.evaluate(() =>
    Promise.allSettled(
      document
        .getAnimations()
        .filter((animation) => animation.effect?.getComputedTiming().endTime !== Infinity)
        .map((animation) => animation.finished),
    ),
  );
}
