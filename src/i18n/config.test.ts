import { describe, expect, test } from "vitest";
import { LOCALES, acceptLanguagePattern, htmlLang, isLocale, localizedPath, parseAcceptLanguage, pickLocale } from "./config";

describe("parseAcceptLanguage", () => {
  test("orders by q, keeps header order on ties, drops * and q=0", () => {
    expect(parseAcceptLanguage("fr-CH, fr;q=0.9, en;q=0.8, de;q=0, *;q=0.5")).toEqual(["fr-CH", "fr", "en"]);
    expect(parseAcceptLanguage("hi;q=0.5, zh;q=0.9, es;q=0.9")).toEqual(["zh", "es", "hi"]);
    expect(parseAcceptLanguage(null)).toEqual([]);
    expect(parseAcceptLanguage("")).toEqual([]);
  });
});

describe("pickLocale", () => {
  test("the first supported primary tag wins, else English", () => {
    expect(pickLocale(["nl-NL", "de-AT", "en"])).toBe("de");
    expect(pickLocale(["zh-TW"])).toBe("zh");
    expect(pickLocale(["HI-in"])).toBe("hi");
    expect(pickLocale(["pt-BR", "ja"])).toBe("en");
    expect(pickLocale([])).toBe("en");
  });
});

test("isLocale accepts only the six shipped languages", () => {
  expect(LOCALES).toEqual(["en", "es", "fr", "de", "zh", "hi"]);
  for (const locale of LOCALES) expect(isLocale(locale)).toBe(true);
  expect(isLocale("pt")).toBe(false);
  expect(isLocale(undefined)).toBe(false);
  expect(isLocale("EN")).toBe(false);
});

test("Chinese is tagged as Simplified for <html lang>", () => {
  expect(htmlLang("zh")).toBe("zh-Hans");
  expect(htmlLang("hi")).toBe("hi");
});

test("localizedPath swaps only the language segment", () => {
  expect(localizedPath("/en/boards/uno-r3", "fr")).toBe("/fr/boards/uno-r3");
  expect(localizedPath("/en", "zh")).toBe("/zh");
  expect(localizedPath("/de?x=1", "es")).toBe("/es?x=1");
  expect(localizedPath("/", "hi")).toBe("/hi");
  expect(localizedPath("/boards", "de")).toBe("/de/boards");
});

describe("the Accept-Language redirect pattern", () => {
  // Next builds `has` matchers as new RegExp(`^${value}$`).
  const matcher = new RegExp(`^${acceptLanguagePattern()}$`);
  const landing = (header: string) => matcher.exec(header)?.groups?.lang ?? "en";

  test.each([
    ["en-US,en;q=0.9", "en"],
    ["nl-NL,nl;q=0.9,fr;q=0.8", "fr"],
    ["zh-CN,zh;q=0.9", "zh"],
    ["zh-TW", "zh"],
    ["de-CH;q=0.9, en;q=0.5", "de"],
    ["hil,hi;q=0.8", "hi"],
    ["hi-IN", "hi"],
    ["es-419,es;q=0.9", "es"],
    ["pt-BR,pt;q=0.9", "en"],
    ["*", "en"],
  ])("%s lands on /%s", (header, expected) => {
    expect(landing(header)).toBe(expected);
  });
});
