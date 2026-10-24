// Test fixtures for the MCP tools: one drone data module (built from the calculator's own catalogue
// fixtures) and its prose, so the tests do not depend on which content modules exist today.
import type { DroneContent } from "@/content/schema";
import catalogueData from "@/lib/drone/__fixtures__/catalogues.json";
import { calcModels } from "@/lib/drone/__fixtures__/models";

const q = catalogueData.quad5;

const withLabels = <T extends { name: string }>(options: Record<string, T>) =>
  Object.fromEntries(Object.entries(options).map(([key, { name, ...rest }]) => [key, { ...rest, label: name }]));

export const quad5 = {
  lab: "drone",
  id: "quad5",
  class: "freestyle",
  frame: {
    layout: "x",
    sizeMm: 225,
    motors: [
      [80, -80, "M1", "CW"],
      [80, 80, "M2", "CCW"],
      [-80, -80, "M3", "CCW"],
      [-80, 80, "M4", "CW"],
    ],
  },
  design: {
    model: calcModels.quad5,
    fixed: q.fixed.map((p) => ({ ...p, name: `fixed.${p.id}` })),
    batts: withLabels(q.batteries),
    motors: withLabels(q.motors),
    props: withLabels(q.props),
    default: { batt: "6s1100", motor: "2306-1750", prop: "5x4.3x3" },
    golden: [],
  },
  firmware: { firmware: "betaflight" },
  parts: [{ id: "FRAME", short: "Frame", name: "parts.FRAME.name", what: "parts.FRAME.what" }],
  tests: [{ id: "smoke", kind: "smoke-stopper", title: "tests.smoke.title" }],
  courses: [{ id: "gates", kind: "gates", title: "courses.gates.title" }],
  sources: [{ title: "Betaflight documentation", url: "https://betaflight.com/docs" }],
} as unknown as DroneContent;

export const quad5Prose: Record<string, unknown> = {
  en: {
    title: "5-inch freestyle quad",
    tagline: "The all-rounder everyone learns on",
    overview: "A 5-inch freestyle quad on 6S.",
    parts: { FRAME: { name: "Carbon frame" } },
    tests: { smoke: { title: "Smoke stopper" } },
    courses: { gates: { title: "Gate run" } },
  },
  es: { title: "Cuadricóptero freestyle de 5 pulgadas" },
};
