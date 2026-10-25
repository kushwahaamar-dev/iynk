import { render } from "@testing-library/react";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";
import { BOARD_IDS, DRONE_IDS, ROBOTICS_IDS } from "@/content/ids";
import { FigureStill } from "./FigureStill";

test("every board, bench and drone has its catalogue picture (node scripts/figure-thumbs.mjs draws a missing one)", () => {
  const items = [...BOARD_IDS.map((id) => `boards/${id}`), ...ROBOTICS_IDS.map((id) => `robotics/${id}`), ...DRONE_IDS.map((id) => `drones/${id}`)];
  expect(items.filter((item) => !existsSync(join(process.cwd(), "public/thumbs", `${item}.webp`)))).toEqual([]);
});

test("the picture is decorative and waits until it's near the screen", () => {
  const { container } = render(<FigureStill item="boards/uno-r3" />);
  const img = container.querySelector("img")!;
  expect(img.getAttribute("src")).toBe("/thumbs/boards/uno-r3.webp");
  expect(img.getAttribute("alt")).toBe("");
  expect(img.getAttribute("loading")).toBe("lazy");
  expect(container.firstElementChild!.getAttribute("aria-hidden")).toBe("true");
});
