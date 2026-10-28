import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { I18nProvider } from "@/i18n/client";
import common from "@/i18n/messages/en/common.json";
import shell from "@/i18n/messages/en/shell.json";
import type { LabSummary } from "@/components/shell/dashboard/data";
import { HowItWorks } from "./HowItWorks";
import { LabsShelf, type LabCopy } from "./LabsShelf";

const labs: LabSummary[] = [
  { lab: "drone", path: "drones", itemCount: 9, items: [] },
  { lab: "board", path: "boards", itemCount: 5, items: [] },
  { lab: "robotics", path: "robotics", itemCount: 7, items: [] },
];
const copy = (name: string, unit: string): LabCopy => ({ name, text: `${name} text`, unit, progress: name });

test("the shelf is three links with their counts, wide lab first", () => {
  render(
    <I18nProvider locale="en" messages={common.client}>
      <LabsShelf
        lang="en"
        title="Three labs"
        labs={labs}
        copy={{ board: copy("Boards", "boards"), robotics: copy("Robotics", "benches"), drone: copy("Drones", "drones") }}
        progressMessages={shell.ui}
      />
    </I18nProvider>,
  );
  const links = screen.getAllByRole("link");
  expect(links.map((link) => link.getAttribute("href"))).toEqual(["/en/boards", "/en/robotics", "/en/drones"]);
  expect(screen.getByRole("link", { name: "Boards" }).closest("article")?.textContent).toContain("5");
  expect(screen.getByRole("link", { name: "Drones" }).closest("article")?.textContent).toContain("9");
});

test("how it works shows four benefits and three steps in order", () => {
  render(
    <HowItWorks
      benefitsTitle="What you can do here"
      benefits={(["see", "code", "break", "fly"] as const).map((id) => ({ id, title: `b-${id}`, text: "t" }))}
      howTitle="How it works"
      steps={[1, 2, 3].map((n) => ({ title: `s-${n}`, text: "t" }))}
    />,
  );
  expect(screen.getAllByRole("listitem")).toHaveLength(7);
  expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(["b-see", "b-code", "b-break", "b-fly", "s-1", "s-2", "s-3"]);
});
