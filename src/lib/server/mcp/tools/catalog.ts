import "server-only";
import { z } from "zod";
import type { Lab } from "@/content/schema";
import { LOCALES } from "@/i18n/config";
import { ENTRIES, LABS, findEntry, itemUrl, loadContent, proseOf, type Entry, type ItemContent, type Prose } from "../content";
import { ToolError, defineTool } from "../registry";

export const localeInput = z.enum(LOCALES).default("en").describe("Language for titles, text and links: en, es, fr, de, zh (Simplified Chinese) or hi.");
export const labInput = z.enum(LABS).describe("board = Board Lab (microcontroller and FPGA boards), robotics = Robotics Bench, drone = Drone Lab.");

const summary = z.object({
  lab: z.enum(LABS),
  id: z.string(),
  title: z.string().nullable().describe("Display name; null while the item's text is not written in any language yet."),
  tagline: z.string().nullable(),
  tags: z.array(z.string()),
  url: z.string().describe("Page that opens the item in iynk."),
});

const words = (s: string) => s.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);

/** Field weights: a hit in the id or title counts most, then tags, then everything else. */
function score(tokens: string[], entry: Entry, title: string | null, tagline: string | null): number {
  const fields: [string, number][] = [
    [entry.id.replace(/-/g, " "), 3],
    [title ?? "", 3],
    [entry.tags.join(" ").replace(/-/g, " "), 2],
    [`${tagline ?? ""} ${entry.facets.join(" ").replace(/-/g, " ")} ${entry.lab}`, 1],
  ];
  let total = 0;
  for (const token of tokens) {
    const hit = fields.find(([text]) => text.toLowerCase().includes(token));
    if (hit) total += hit[1];
  }
  return total;
}

export const searchCatalog = defineTool({
  name: "search_catalog",
  title: "Search the iynk catalogue",
  description:
    "Find boards, robotics benches and drones in iynk, the free in-browser hardware lab (12 boards such as Arduino UNO, ESP32, Raspberry Pi Pico and FPGAs; 13 robotics benches such as motor drivers, sensors and power; 13 drones from a 1S whoop to an octocopter). Matches names, tags, chips, languages, firmware, modules and parts. Use it to pick something to learn or build, then call get_item for the details.",
  input: z.object({
    query: z.string().trim().min(1).max(200).describe('Words to look for, e.g. "esp32 wifi", "motor driver", "long range drone", "verilog".'),
    lab: labInput.optional().describe("Only search one lab."),
    locale: localeInput,
    limit: z.number().int().min(1).max(38).default(8).describe("Most results to return."),
  }),
  output: z.object({ query: z.string(), total: z.number().int(), results: z.array(summary) }),
  openWorld: false,
  idempotent: true,
  async run({ query, lab, locale, limit }, ctx) {
    const tokens = words(query);
    const pool = ENTRIES.filter((e) => !lab || e.lab === lab);
    const scored = await Promise.all(
      pool.map(async (entry) => {
        const text = await proseOf(locale, entry.lab, entry.id);
        const title = text("title");
        const tagline = text("tagline");
        return { entry, title, tagline, score: score(tokens, entry, title, tagline) };
      }),
    );
    // A stable sort keeps catalogue order (boards, robotics, drones, each in figure order) between equal scores.
    const hits = scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score);
    return {
      query,
      total: hits.length,
      results: hits.slice(0, limit).map(({ entry, title, tagline }) => ({
        lab: entry.lab,
        id: entry.id,
        title,
        tagline,
        tags: [...entry.tags],
        url: itemUrl(ctx.siteUrl, locale, entry.lab, entry.id),
      })),
    };
  },
});

const named = z.object({ id: z.string(), title: z.string().nullable() });

const boardDetails = z.object({
  lab: z.literal("board"),
  maker: z.string(),
  mcu: z.object({ part: z.string(), core: z.string(), cores: z.number().int(), clockMhz: z.number(), wireless: z.array(z.string()) }),
  logicVolts: z.number(),
  variants: z.array(z.object({ id: z.string(), name: z.string() })),
  lessons: z.array(named.extend({ n: z.number().int(), level: z.string(), language: z.string() })),
});

const roboticsDetails = z.object({
  lab: z.literal("robotics"),
  board: z.string().nullable(),
  modules: z.array(z.string()),
  parts: z.array(z.string()),
  buildSteps: z.number().int(),
  tasks: z.array(named.extend({ language: z.string() })),
  quizzes: z.number().int(),
});

const option = z.object({ key: z.string(), label: z.string() });

const droneDetails = z.object({
  lab: z.literal("drone"),
  class: z.string(),
  firmware: z.string(),
  frame: z.object({ layout: z.string(), sizeMm: z.number(), motors: z.number().int() }),
  design: z.object({
    default: z.object({ batt: z.string(), motor: z.string(), prop: z.string() }),
    batteries: z.array(option),
    motors: z.array(option),
    props: z.array(option),
  }),
  parts: z.array(z.object({ id: z.string(), name: z.string().nullable() })),
  tests: z.array(named.extend({ kind: z.string() })),
  courses: z.array(named.extend({ kind: z.string() })),
});

function details(content: ItemContent, t: Prose) {
  switch (content.lab) {
    case "board":
      return {
        lab: "board" as const,
        maker: content.maker,
        mcu: {
          part: content.mcu.part,
          core: content.mcu.core,
          cores: content.mcu.cores,
          clockMhz: content.mcu.clockHz / 1e6,
          wireless: [...content.mcu.wireless],
        },
        logicVolts: content.logicVolts,
        variants: content.variants.map((v) => ({ id: v.id, name: v.name })),
        lessons: content.lessons.map((l) => ({ id: l.id, n: l.n, level: l.level, language: l.language, title: t(l.title) })),
      };
    case "robotics":
      return {
        lab: "robotics" as const,
        board: content.board,
        modules: [...content.modules],
        parts: [...content.parts],
        buildSteps: content.steps.length,
        tasks: content.tasks.map((task) => ({ id: task.id, language: task.language, title: t(task.title) })),
        quizzes: content.quizzes.length,
      };
    case "drone": {
      const options = (record: Record<string, { label: string }>) => Object.entries(record).map(([key, o]) => ({ key, label: o.label }));
      return {
        lab: "drone" as const,
        class: content.class,
        firmware: content.firmware.firmware,
        frame: { layout: content.frame.layout, sizeMm: content.frame.sizeMm, motors: content.frame.motors.length },
        design: {
          default: content.design.default,
          batteries: options(content.design.batts),
          motors: options(content.design.motors),
          props: options(content.design.props),
        },
        parts: content.parts.map((p) => ({ id: p.id, name: t(p.name) })),
        tests: content.tests.map((test) => ({ id: test.id, kind: test.kind, title: t(test.title) })),
        courses: content.courses.map((c) => ({ id: c.id, kind: c.kind, title: t(c.title) })),
      };
    }
  }
}

export const getItem = defineTool({
  name: "get_item",
  title: "Get a iynk board, bench or drone",
  description:
    "Details of one iynk item: what it is, its lessons, practice tasks or bench tests, a drone's battery, motor and prop options (feed them to drone_calc), sources, and the link that opens it in the browser. Ids come from search_catalog (for example board uno-r3, robotics tb6612fng, drone quad5).",
  input: z.object({
    lab: labInput,
    id: z.string().trim().min(1).max(64).describe("Item id, e.g. uno-r3, esp32-devkitc, tb6612fng, quad5."),
    locale: localeInput,
  }),
  output: z.object({
    lab: z.enum(LABS),
    id: z.string(),
    title: z.string().nullable(),
    tagline: z.string().nullable(),
    overview: z.string().nullable(),
    tags: z.array(z.string()),
    url: z.string(),
    details: z
      .discriminatedUnion("lab", [boardDetails, roboticsDetails, droneDetails])
      .nullable()
      .describe("Null while the item's data module is still being written; the page link still works."),
    sources: z.array(z.object({ title: z.string(), url: z.string() })),
  }),
  openWorld: false,
  idempotent: true,
  async run({ lab, id, locale }, ctx) {
    const entry = findEntry(lab as Lab, id);
    if (!entry) throw new ToolError("not_found", `iynk has no ${lab} called "${id}". Use search_catalog to find the right id.`);
    const [content, t] = await Promise.all([loadContent(lab, id), proseOf(locale, lab, id)]);
    return {
      lab,
      id,
      title: t("title"),
      tagline: t("tagline"),
      overview: t("overview"),
      tags: [...entry.tags],
      url: itemUrl(ctx.siteUrl, locale, lab, id),
      details: content ? details(content, t) : null,
      sources: content ? content.sources.map((s) => ({ title: s.title, url: s.url })) : [],
    };
  },
});
