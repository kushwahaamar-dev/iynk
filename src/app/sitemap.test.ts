import { describe, expect, it } from "vitest";
import { LOCALES } from "@/i18n/config";
import robots from "./robots";
import sitemap from "./sitemap";

const entries = sitemap();
const urls = entries.map((entry) => entry.url);

describe("sitemap", () => {
  it("lists absolute, unique urls without a doubled slash", () => {
    expect(new Set(urls).size).toBe(urls.length);
    for (const url of urls) {
      expect(url).toMatch(/^https?:\/\//);
      expect(url.replace(/^https?:\/\//, "")).not.toContain("//");
    }
  });

  it("repeats one page set for each of the six languages", () => {
    expect(urls.length % LOCALES.length).toBe(0);
    for (const locale of LOCALES) {
      expect(urls.filter((url) => new URL(url).pathname.startsWith(`/${locale}`))).toHaveLength(urls.length / LOCALES.length);
    }
  });

  it("includes the privacy page and a drone fly page", () => {
    const paths = urls.map((url) => new URL(url).pathname);
    expect(paths).toContain("/en/privacy");
    expect(paths).toContain("/de/drones/quad5/fly");
  });

  it("gives every entry the six languages and x-default, as absolute urls", () => {
    for (const entry of entries) {
      const languages = entry.alternates?.languages ?? {};
      expect(Object.keys(languages)).toHaveLength(LOCALES.length + 1);
      expect(Object.keys(languages)).toContain("x-default");
      for (const href of Object.values(languages)) expect(href).toMatch(/^https?:\/\/[^/]+\/[a-z]{2}/);
    }
  });
});

describe("robots", () => {
  it("points at the sitemap with a single slash", () => {
    const { sitemap: line } = robots();
    expect(line).toMatch(/^https?:\/\/[^/]+\/sitemap\.xml$/);
  });
});
