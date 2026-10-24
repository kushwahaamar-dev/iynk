import "server-only";
import { z } from "zod";
import { isBoardId, isDroneId, isRoboticsId } from "@/content/ids";
import type { Lab } from "@/content/schema";
import { boardBom, droneBom, offerParts, roboticsBom, type BomLine } from "@/lib/search/bom";
import { lineCost, sumMoney } from "@/lib/search/cost";
import type { OfferPartInput } from "@/lib/search/schema";
import { OFFER_SOURCES } from "@/lib/search/types";
import { features } from "@/lib/server/env";
import { withTimeout } from "@/lib/server/http";
import { SearchError, offers } from "@/lib/server/search/serpapi";
import { findEntry, itemUrl } from "../content";
import { ToolError, defineTool } from "../registry";
import { labInput, localeInput } from "./catalog";
import { droneDesign, optionKey, type DronePick } from "./drone";

const part = z.object({
  name: z.string().trim().min(2).max(160).describe('What to buy, as a shop would list it, e.g. "2306 1750KV brushless motor".'),
  qty: z.number().int().min(1).max(1000).describe("How many are needed."),
  pack: z.number().int().min(1).max(100).optional().describe("Units in one listing when the title won't say (props come in fours)."),
});

const best = z.object({
  title: z.string(),
  price: z.number(),
  currency: z.string(),
  url: z.string(),
  source: z.enum(OFFER_SOURCES),
  seller: z.string().nullable(),
  inStock: z.boolean().nullable(),
});

const SEARCH_FAILURE: Record<SearchError["code"], ToolError> = {
  not_configured: new ToolError("not_configured", "Live parts prices (SerpApi) are not set up on this deployment."),
  quota_exhausted: new ToolError("rate_limited", "This deployment's price-search budget is used up for now."),
  upstream_failed: new ToolError("upstream", "The shopping searches failed. Try again in a moment."),
  upstream_timeout: new ToolError("upstream", "The shopping searches took too long. Try again in a moment."),
};

type Line = { request: OfferPartInput; name: string; estimate: number | null };

/** The item's own parts list as hx:search maps it to shopping queries (src/lib/search/bom.ts). */
async function itemLines(lab: Lab, id: string, pick: DronePick): Promise<Line[]> {
  let bom: BomLine[];
  if (lab === "drone" && isDroneId(id)) {
    const { design, pick: full } = await droneDesign(id, pick);
    bom = droneBom(id, design, full).filter((line) => line.inBuild);
  } else if (lab === "robotics" && isRoboticsId(id)) bom = roboticsBom(id);
  else if (lab === "board" && isBoardId(id)) bom = boardBom(id);
  else throw new ToolError("not_found", `SimLab has no ${lab} called "${id}".`);
  if (bom.length === 0) throw new ToolError("not_found", `SimLab has no parts list for ${lab} ${id}; pass parts to price your own list.`);
  const requests = offerParts(bom);
  return bom.map((line, i) => ({
    request: requests[i],
    name: "literal" in line.label ? line.label.literal : line.query,
    estimate: line.estimate ?? null,
  }));
}

export const priceParts = defineTool({
  name: "price_parts",
  title: "Price the parts for a real build",
  description:
    "Turns a SimLab item into a real shopping list: its parts list (a drone's frame, electronics, battery, motors and props; a bench's board, modules and parts; a board's starter kit), live listings from Google Shopping, Amazon and eBay through SerpApi, the cheapest relevant one in stock, what each quantity costs and the total. For a drone, choose the battery, motor and prop as in drone_calc. Pass parts to price a list of your own instead. Prices are live US listings and change often.",
  input: z.object({
    lab: labInput,
    id: z.string().trim().min(1).max(64).describe("Item id, e.g. quad5, tb6612fng, uno-r3."),
    pick: z
      .object({ battery: optionKey.optional(), motor: optionKey.optional(), prop: optionKey.optional() })
      .optional()
      .describe("Drones only: option keys from get_item or drone_calc; the craft's defaults otherwise."),
    parts: z.array(part).min(1).max(25).optional().describe("Price these instead of the item's own parts list."),
    locale: localeInput.describe("Language of the item link."),
  }),
  output: z.object({
    lab: z.string(),
    id: z.string(),
    url: z.string(),
    fetchedAt: z.string(),
    partial: z.enum(["quota", "upstream"]).nullable().describe("Why some parts have no price, when they don't."),
    parts: z.array(
      z.object({
        name: z.string(),
        query: z.string(),
        qty: z.number().int(),
        listings: z.number().int(),
        best: best.nullable(),
        cost: z.number().nullable().describe("What qty units cost from the best listing."),
        estimate: z.number().nullable().describe("SimLab's catalogue price for the line (USD), when it has one."),
      }),
    ),
    total: z.number().nullable().describe("Sum of the part costs, when every priced part is in one currency."),
    currency: z.string().nullable(),
  }),
  openWorld: true,
  idempotent: false,
  async run({ lab, id, pick, parts, locale }, ctx) {
    if (!findEntry(lab, id)) throw new ToolError("not_found", `SimLab has no ${lab} called "${id}". Use search_catalog to find the right id.`);
    if (pick && lab !== "drone") throw new ToolError("bad_input", "pick chooses a drone's battery, motor and prop; leave it out for boards and benches.");
    if (pick && parts) throw new ToolError("bad_input", "Give pick (to price the drone's own parts) or parts (your own list), not both.");
    if (!features.search) throw SEARCH_FAILURE.not_configured;
    const lines: Line[] = parts
      ? parts.map((p, i) => ({ request: { key: `p${i + 1}`, query: p.name, qty: p.qty, pack: p.pack }, name: p.name, estimate: null }))
      : await itemLines(lab, id, pick ?? {});
    let found: Awaited<ReturnType<typeof offers>>;
    try {
      found = await offers(
        lines.map((l) => l.request),
        withTimeout(30_000),
      );
    } catch (error) {
      if (error instanceof SearchError) throw SEARCH_FAILURE[error.code];
      throw error;
    }
    const priced = lines.map(({ request, name, estimate }) => {
      const result = found.parts.find((r) => r.key === request.key);
      const pickOffer = result && result.best !== undefined ? result.offers[result.best] : undefined;
      return {
        name,
        query: request.query,
        qty: request.qty,
        listings: result?.offers.length ?? 0,
        best: pickOffer
          ? {
              title: pickOffer.title,
              price: pickOffer.price,
              currency: pickOffer.currency,
              url: pickOffer.url,
              source: pickOffer.source,
              seller: pickOffer.seller ?? null,
              inStock: pickOffer.inStock ?? null,
            }
          : null,
        cost: pickOffer ? lineCost(pickOffer, request.qty, request.pack) : null,
        estimate,
      };
    });
    const withCost = priced.filter((l) => l.best !== null && l.cost !== null);
    const currencies = new Set(withCost.map((l) => l.best?.currency));
    const oneCurrency = withCost.length > 0 && currencies.size === 1;
    return {
      lab,
      id,
      url: itemUrl(ctx.siteUrl, locale, lab, id),
      fetchedAt: new Date().toISOString(),
      partial: found.partial ?? null,
      parts: priced,
      total: oneCurrency ? sumMoney(withCost.map((l) => l.cost ?? 0)) : null,
      currency: oneCurrency ? ([...currencies][0] ?? null) : null,
    };
  },
});
