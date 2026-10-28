import { render, screen, within } from "@testing-library/react";
import { expect, test } from "vitest";
import home from "@/i18n/messages/en/home.json";
import { FinalCta } from "./FinalCta";
import { OpenSource } from "./OpenSource";
import { REPO_URL } from "./primitives";

test("the three open source links go to the repository and open safely in a new tab", async () => {
  render(await OpenSource({ lang: "en" }));
  const section = screen.getByRole("region", { name: "Open source" });
  const links = within(section).getAllByRole("link");
  expect(links.map((a) => a.getAttribute("href"))).toEqual([
    `${REPO_URL}#readme`,
    `${REPO_URL}/blob/main/docs/SELF_HOSTING.md`,
    `${REPO_URL}/blob/main/CONTRIBUTING.md`,
  ]);
  for (const a of links) {
    expect(a.getAttribute("target")).toBe("_blank");
    expect(a.getAttribute("rel")).toBe("noopener noreferrer");
  }
  expect(links.map((a) => a.textContent)).toEqual(["Read the README", "Run your own copy", "Contribute"]);
});

test("the closing call repeats the single call to action to the given address", async () => {
  render(await FinalCta({ lang: "en", href: "/en/boards/uno-r3?lesson=1" }));
  const region = screen.getByRole("region", { name: "The bench is ready." });
  const links = within(region).getAllByRole("link");
  expect(links).toHaveLength(1);
  expect(links[0].textContent).toBe(home.hero.cta);
  expect(links[0].getAttribute("href")).toBe("/en/boards/uno-r3?lesson=1");
});
