// @vitest-environment node
import { existsSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";
import { LAB_STILL } from "@/components/shell/dashboard/labs";
import { BENEFIT_IDS, BENEFIT_STILL, LAB_ORDER } from "./labs-data";

const thumb = (item: string) => join(process.cwd(), "public/thumbs", `${item}.webp`);

test("every benefit has a still that exists", () => {
  expect(Object.keys(BENEFIT_STILL).sort()).toEqual([...BENEFIT_IDS].sort());
  for (const [id, item] of Object.entries(BENEFIT_STILL)) expect(existsSync(thumb(item)), id).toBe(true);
});

test("every lab on the shelf has a still that exists", () => {
  expect([...LAB_ORDER].sort()).toEqual(Object.keys(LAB_STILL).sort());
  for (const lab of LAB_ORDER) expect(existsSync(thumb(LAB_STILL[lab])), lab).toBe(true);
});
