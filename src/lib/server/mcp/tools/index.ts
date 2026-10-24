import "server-only";
import type { Tool, ToolContext } from "../registry";
import { getItem, searchCatalog } from "./catalog";
import { droneCalc } from "./drone";
import { priceParts } from "./market";
import { getPassport } from "./passport";
import { createRoom, planBuildNight } from "./together";

/** HX-CONTRACT H10, in the order a conversation tends to use them. */
export const TOOLS: readonly Tool[] = [searchCatalog, getItem, droneCalc, priceParts, planBuildNight, createRoom, getPassport];

const byName = new Map(TOOLS.map((tool) => [tool.name, tool]));

export const toolNamed = (name: string): Tool | undefined => byName.get(name);

/** Version of this tool surface; bump it when a tool's input or output changes. */
export const SERVER_VERSION = "1.0.0";

export const serverInfo = (ctx: ToolContext) => ({
  name: "simlab",
  title: "SimLab",
  version: SERVER_VERSION,
  websiteUrl: ctx.siteUrl,
  icons: [{ src: `${ctx.siteUrl}/icon.svg`, mimeType: "image/svg+xml" }],
});

export const SERVER_INSTRUCTIONS =
  "SimLab is a free hardware lab in the browser: 12 microcontroller and FPGA boards, 13 robotics benches and 13 drones that people wire, code, break and fly, alone or together in live rooms. " +
  "Find things with search_catalog and get_item, size a drone with drone_calc, turn a build into a priced shopping list with price_parts, plan a group session with plan_build_night, hand people a room link with create_room, and check someone's Proof of Build credentials with get_passport. " +
  "Every tool only reads; links open the item in SimLab. Tools answer in the locale you pass (en, es, fr, de, zh, hi).";
