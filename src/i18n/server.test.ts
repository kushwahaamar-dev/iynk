// @vitest-environment node
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";
import { LOCALES } from "./config";
import { getContentProse, getContentText, getMessages, getT } from "./server";

test("loads the common strings of every language", async () => {
  for (const locale of LOCALES) {
    const common = await getMessages(locale, "common");
    expect(common.site.name).toBe("iynk");
  }
  const de = await getT("de", "common");
  expect(de("progress.label", { done: 2, total: 16 })).toBe("2 von 16 erledigt");
});

test("a missing content file fails loudly with its path", async () => {
  await expect(getContentText("fr", "boards", "no-such-board")).rejects.toThrow(
    "src/i18n/content/fr/boards/no-such-board.json",
  );
});

// A board whose prose is still English only in some language (none once every translation lands).
const content = join(process.cwd(), "src/i18n/content");
const untranslated = LOCALES.filter((lang) => lang !== "en")
  .flatMap((lang) => readdirSync(join(content, "en/boards")).map((file) => ({ lang, id: file.replace(/\.json$/, "") })))
  .find(({ lang, id }) => !existsSync(join(content, lang, "boards", `${id}.json`)));

test.runIf(untranslated)("prose missing in a language falls back to the English file and says so", async () => {
  const { lang, id } = untranslated!;
  const en = await getContentText("en", "boards", id);
  expect(await getContentProse(lang, "boards", id)).toEqual({ text: en, lang: "en" });
  expect((await getContentProse("en", "boards", id)).lang).toBe("en");
});

test("an item with no English prose still fails, in every language", async () => {
  await expect(getContentProse("es", "boards", "no-such-board")).rejects.toThrow(
    "src/i18n/content/en/boards/no-such-board.json",
  );
  await expect(getContentProse("en", "boards", "no-such-board")).rejects.toThrow(
    "src/i18n/content/en/boards/no-such-board.json",
  );
});
