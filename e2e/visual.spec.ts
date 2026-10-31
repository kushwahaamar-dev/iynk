import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./support/no-egress";
import { watchErrors } from "./dock-shared";
import { SCREENS, THEMES, VIEWPORTS, idle, setTheme, settle } from "./support/visual";

// Screenshots of every screen in both themes at both sizes, with an axe pass on each. They land in
// test-results/ui-shots/ to be looked at. UI_SHOTS=compare also checks them against a local baseline.
const COMPARE = process.env.UI_SHOTS === "compare";

for (const [viewportName, { viewport, hasTouch }] of Object.entries(VIEWPORTS) as [keyof typeof VIEWPORTS, (typeof VIEWPORTS)[keyof typeof VIEWPORTS]][]) {
  for (const theme of THEMES) {
    test.describe(`${theme} ${viewportName}`, () => {
      test.use({ viewport, hasTouch });

      for (const screen of SCREENS.filter((entry) => !entry.only || entry.only === viewportName)) {
        test(screen.name, async ({ page }, testInfo) => {
          test.setTimeout(90_000);
          const errors = watchErrors(page);
          await setTheme(page, theme);
          await page.goto(screen.path);
          await expect(page.locator("main:visible")).toHaveCount(1);
          await settle(page);
          if (screen.before) {
            await screen.before(page, viewportName);
            await idle(page);
          }

          expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "scrolls sideways").toBe(true);

          if (screen.name === "home-en") {
            expect(await page.locator(".tagline-word:not([data-lit='true'])").count(), "unlit tagline words").toBe(0);
          }
          expect(await page.locator("main .opacity-0").count(), "reveals still hidden").toBe(0);

          const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
          const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
          if (serious.length) {
            await testInfo.attach("axe-violations", { body: JSON.stringify(serious, null, 2), contentType: "application/json" });
          }
          expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);

          const file = `${theme}-${viewportName}-${screen.name}.png`;
          const mask = COMPARE ? [page.locator("iframe")] : [];
          await page.screenshot({ path: `test-results/ui-shots/${file}`, fullPage: true, mask });
          if (COMPARE) {
            await expect(page).toHaveScreenshot(file, { fullPage: true, mask, maxDiffPixelRatio: 0.01, animations: "disabled", caret: "hide" });
          }
          expect(errors).toEqual([]);
        });
      }
    });
  }
}
