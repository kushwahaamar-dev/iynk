import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { SiteFooter } from "./SiteFooter";

vi.mock("next/navigation", () => ({ usePathname: () => "/fr/about" }));

async function renderFooter(lang: "en" | "fr") {
  render(await SiteFooter({ lang }));
}

test("the legal links point at the privacy page, the licence section and the repository", async () => {
  await renderFooter("en");
  expect(screen.getByRole("link", { name: "Privacy" }).getAttribute("href")).toBe("/en/privacy");
  expect(screen.getByRole("link", { name: "Licence status" }).getAttribute("href")).toBe("/en/about#about-licence-en");
  const source = screen.getByRole("link", { name: "Source code" });
  expect(source.getAttribute("href")).toMatch(/^https:\/\/github\.com\//);
  expect(source.getAttribute("target")).toBe("_blank");
  expect(source.getAttribute("rel")).toBe("noopener noreferrer");
});

test("the page links skip the dashboard and the languages mark the current one", async () => {
  await renderFooter("fr");
  const pages = screen.getByRole("navigation", { name: "Pages du site" });
  expect(pages.querySelectorAll("a")).toHaveLength(5);
  const languages = screen.getByRole("navigation", { name: "Langue" });
  const links = [...languages.querySelectorAll("a")];
  expect(links).toHaveLength(6);
  expect(links.filter((a) => a.getAttribute("aria-current") === "true").map((a) => a.textContent)).toEqual(["Français"]);
});
