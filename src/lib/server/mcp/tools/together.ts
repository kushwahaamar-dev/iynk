import "server-only";
import { z } from "zod";
import { LOCALES } from "@/i18n/config";
import { createRoom as roomLinkFor, ROOM_PARAM } from "@/lib/realtime/config";
import { MAX_NAME_LENGTH, MAX_PEERS } from "@/lib/realtime/protocol";
import { features } from "@/lib/server/env";
import { postRoute } from "../backends";
import { ENTRIES, LABS, findEntry, itemUrl } from "../content";
import { ToolError, defineTool } from "../registry";
import { labInput, localeInput } from "./catalog";

const participant = z.object({
  name: z.string().trim().min(1).max(MAX_NAME_LENGTH).describe("First name or nickname (no contact details)."),
  lang: z.enum(LOCALES).describe("The language this person reads: en, es, fr, de, zh or hi."),
  level: z.enum(["new", "some", "lots"]).describe("Hardware experience: new, some or lots."),
  wants: z.string().trim().max(280).default("").describe('What they want out of the night, e.g. "fly something fast", "learn to solder"; empty if they have not said.'),
});

const planShape = z.object({
  title: z.string(),
  item: z.object({ lab: z.enum(LABS), id: z.string() }),
  why: z.string(),
  roles: z.array(z.object({ name: z.string(), role: z.string(), firstTask: z.string() })),
  steps: z.array(z.string()),
  parts: z.array(z.string()).optional(),
});

export const planBuildNight = defineTool({
  name: "plan_build_night",
  title: "Plan a build night",
  description:
    "Plans one SimLab project a group will all enjoy, using Muse Spark: it weighs what each person wants and how much they already know, picks a board, robotics bench or drone, gives everyone a role and a first task, and lists the steps (and parts, when there are any). Use it for requests like \"plan a drone night with my cousins\". Follow with create_room to give the group a live room on that item.",
  input: z.object({
    participants: z.array(participant).min(1).max(MAX_PEERS).describe(`Everyone taking part, at most ${MAX_PEERS}.`),
    locale: localeInput.describe("Language the plan is written in."),
    messages: z
      .array(z.object({ who: z.string().trim().min(1).max(MAX_NAME_LENGTH), text: z.string().trim().min(1).max(500) }))
      .max(40)
      .optional()
      .describe("Recent group chat about the night, oldest first, if there is any."),
  }),
  output: planShape.extend({ url: z.string().describe("Page that opens the planned item in SimLab.") }),
  openWorld: true,
  idempotent: false,
  async run({ participants, locale, messages }, ctx) {
    if (!features.ai) throw new ToolError("not_configured", "The Build Night planner (Muse Spark) is not set up on this deployment.");
    const plan = await postRoute("The Build Night planner", "/api/ai/plan", planShape, { locale, participants, messages }, 45_000);
    if (!findEntry(plan.item.lab, plan.item.id)) throw new ToolError("upstream", "The planner picked an item SimLab does not have. Try again.");
    return { ...plan, url: itemUrl(ctx.siteUrl, locale, plan.item.lab, plan.item.id) };
  },
});

const [starter] = ENTRIES;

export const createRoom = defineTool({
  name: "create_room",
  title: "Open a live build room",
  description: `Makes a link to a fresh SimLab build room on one item. Up to ${MAX_PEERS} people open the same link on any device, with no account, and wire, code and fly together, each in their own language. Nothing is stored until someone opens the link, and a room closes 30 minutes after its last person leaves. Without lab and id the room opens on the ${starter.id} board, SimLab's first lesson.`,
  input: z.object({
    lab: labInput.optional(),
    id: z.string().trim().min(1).max(64).optional().describe("Item id from search_catalog or plan_build_night."),
    locale: localeInput.describe("Language the room page opens in; everyone can switch."),
  }),
  output: z.object({
    room: z.string().describe("Six-character room code people can also type in."),
    link: z.string(),
    lab: z.enum(LABS),
    id: z.string(),
    maxPeople: z.number().int(),
  }),
  openWorld: false,
  idempotent: false,
  async run({ lab, id, locale }) {
    if (!features.realtime) {
      throw new ToolError("not_configured", "Live rooms are not set up on this deployment (there is no realtime relay), so a link would only join tabs of one browser.");
    }
    if ((lab === undefined) !== (id === undefined)) throw new ToolError("bad_input", "Give both lab and id, or neither.");
    const target = lab && id ? findEntry(lab, id) : starter;
    if (!target) throw new ToolError("not_found", `SimLab has no ${lab} called "${id}". Use search_catalog to find the right id.`);
    const link = roomLinkFor(target.lab, target.id, locale);
    const room = new URL(link).searchParams.get(ROOM_PARAM);
    if (!room) throw new ToolError("internal", "SimLab could not make a room link.");
    return { room, link, lab: target.lab, id: target.id, maxPeople: MAX_PEERS };
  },
});
