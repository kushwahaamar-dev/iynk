import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const DIR = __dirname;
const modules = readdirSync(DIR).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts")).map((f) => f.slice(0, -3));

function importsOf(name: string) {
  const text = readFileSync(join(DIR, `${name}.ts`), "utf8");
  return [...text.matchAll(/from "\.\/([\w-]+)"/g)].map((m) => m[1]);
}

describe("flight module layers", () => {
  it("has no import cycle", () => {
    const done = new Set<string>();
    const walk = (name: string, trail: string[]) => {
      expect(trail, `cycle ${[...trail, name].join(" > ")}`).not.toContain(name);
      if (done.has(name)) return;
      for (const dep of importsOf(name)) if (modules.includes(dep)) walk(dep, [...trail, name]);
      done.add(name);
    };
    modules.forEach((m) => walk(m, []));
  });

  it("keeps state.ts below the sim", () => {
    expect(importsOf("state").sort()).toEqual(["battery", "math", "route", "types", "world"]);
  });

  it("keeps autopilot and scoring below the sim and apart", () => {
    const below = ["battery", "math", "route", "state", "types", "world"];
    for (const name of ["autopilot", "scoring"]) {
      for (const dep of importsOf(name)) expect([...below, ...(name === "scoring" ? ["autopilot"] : [])], `${name} imports ${dep}`).toContain(dep);
    }
  });

  it("calls collide only from scoring", () => {
    const callers = modules.filter((m) => /\bcollide\(/.test(readFileSync(join(DIR, `${m}.ts`), "utf8")) && !["world", "route"].includes(m));
    expect(callers).toEqual(["scoring"]);
  });
});
