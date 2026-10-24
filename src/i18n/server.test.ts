// @vitest-environment node
import { expect, test } from "vitest";
import { LOCALES } from "./config";
import { getContentText, getMessages, getT } from "./server";

test("loads the common strings of every language", async () => {
  for (const locale of LOCALES) {
    const common = await getMessages(locale, "common");
    expect(common.site.name).toBe("SimLab");
  }
  const de = await getT("de", "common");
  expect(de("progress.label", { done: 2, total: 16 })).toBe("2 von 16 erledigt");
});

test("a missing content file fails loudly with its path", async () => {
  await expect(getContentText("fr", "boards", "no-such-board")).rejects.toThrow(
    "src/i18n/content/fr/boards/no-such-board.json",
  );
});
