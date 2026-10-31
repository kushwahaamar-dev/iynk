import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import type { DashItem } from "@/components/shell/dashboard/data";
import { HomeSection, REPO_URL, workbenchHref } from "./primitives";

test("HomeSection is a section named by its heading", () => {
  render(
    <HomeSection id="labs" title="Three labs">
      <p>body</p>
    </HomeSection>,
  );
  const section = screen.getByRole("region", { name: "Three labs" });
  const heading = screen.getByRole("heading", { name: "Three labs" });
  expect(section.tagName).toBe("SECTION");
  expect(section.getAttribute("aria-labelledby")).toBe(heading.id);
  expect(section.textContent).toContain("body");
});

test("the repository link is the project's GitHub page", () => {
  expect(REPO_URL).toBe("https://github.com/kushwahaamar-dev/iynk");
});

test("workbenchHref falls back to the board page in the language", () => {
  expect(workbenchHref("de")).toBe("/de/boards/uno-r3");
});

test("workbenchHref prefers the first lesson entry of the Uno R3", () => {
  const uno: DashItem = {
    lab: "board",
    id: "uno-r3",
    title: "Arduino Uno R3",
    href: "/en/boards/uno-r3",
    entries: [{ key: "boards:uno-r3:lesson:1", kind: "lesson", href: "/en/boards/uno-r3?lesson=1" }],
  };
  expect(workbenchHref("en", uno)).toBe("/en/boards/uno-r3?lesson=1");
});
