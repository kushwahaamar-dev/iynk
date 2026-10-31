import { describe, expect, test } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { craftSvg, type CraftGeometry, type CraftStyle } from "./craft.ts";
import { DRONES } from "@/content/ids";
import type { DroneContent } from "@/content/schema";

const STYLE: CraftStyle = { palette: "tomato", showThrust: true, showCom: true };
const ROOT = join(process.cwd(), "content/projects/drones");

interface Layout {
  id: string;
  motors: ReadonlyArray<readonly [number, number]>;
}

async function layouts(): Promise<Layout[]> {
  const out: Layout[] = [];
  for (const dir of ["a", "b"]) {
    for (const file of readdirSync(join(ROOT, dir)).filter((f) => f.endsWith(".project.json"))) {
      const project = JSON.parse(readFileSync(join(ROOT, dir, file), "utf8"));
      const data = project.domains.drone.data;
      if (data.kind !== "legacy-craft" && data.kind !== "multirotor") continue;
      const id: string = data.legacy.contentId;
      expect(DRONES).toHaveProperty(id);
      const content = (await import(`../../content/drones/${id}.ts`)).default as DroneContent;
      out.push({ id, motors: content.frame.motors.map(([x, y]) => [x, y] as const) });
    }
  }
  return out;
}

const hubs = (svg: string): Array<[number, number]> =>
  [...svg.matchAll(/<circle class="motor"[^>]* cx="(-?[\d.]+)" cy="(-?[\d.]+)"/g)].map((m) => [Number(m[1]), Number(m[2])]);

const geometry = (motors: Layout["motors"], clash = false): CraftGeometry => ({
  motors: motors.map(([x, y], i) => ({ id: `M${i + 1}`, x_mm: x, y_mm: y, r_mm: 60, spin: i % 2 ? "ccw" : "cw", clash })),
  bodies: [{ id: "frame", role: "frame", x_mm: 0, y_mm: 0, w_mm: 60, h_mm: 40, rot_deg: 0 }],
  com_mm: [0, 0],
});

describe("craftSvg", () => {
  test("every motor of the 13 layouts sits on its mount", async () => {
    const all = await layouts();
    expect(all).toHaveLength(13);
    let worst = 0;
    for (const l of all) {
      const found = hubs(craftSvg(geometry(l.motors), STYLE));
      expect(found).toHaveLength(l.motors.length);
      l.motors.forEach(([x, y], i) => {
        worst = Math.max(worst, Math.hypot(found[i][0] - -y, found[i][1] - -x));
      });
    }
    expect(worst).toBeLessThanOrEqual(0.5);
  });

  test("emits no script, link or event handler", () => {
    const svg = craftSvg(geometry([[79.5, 79.5]], true), STYLE);
    expect(svg).not.toMatch(/<script|href|\son\w+=/i);
  });

  test("a clash draws its label", () => {
    expect(craftSvg(geometry([[79.5, 79.5]], true), STYLE)).toContain(">clash<");
    expect(craftSvg(geometry([[79.5, 79.5]]), STYLE)).not.toContain(">clash<");
  });

  test("zero motors say so", () => {
    expect(craftSvg({ motors: [], bodies: [], com_mm: null }, STYLE)).toContain("no motors");
  });

  test("an out of range radius clamps the draw and keeps the position", () => {
    const g: CraftGeometry = { motors: [{ id: "M1", x_mm: 10, y_mm: 20, r_mm: 9000, spin: "cw", clash: false }], bodies: [], com_mm: null };
    const svg = craftSvg(g, STYLE);
    expect(svg).toContain('r="500.0"');
    expect(hubs(svg)).toEqual([[-20, -10]]);
  });
});
