import { connection } from "next/server";
import { intParam, param, handleSearch, type SearchRoute } from "@/lib/server/search/route";
import { offers } from "@/lib/server/search/serpapi";
import { offersInput } from "@/lib/search/schema";
import type { OffersResponse } from "@/lib/search/types";

// No `runtime` export: cacheComponents is on, and it rejects that config (nodejs is the default).

const route: SearchRoute<typeof offersInput> = {
  bucket: "offers",
  perMinute: 20,
  schema: offersInput,
  // GET prices one part: ?q=2306+1750KV+motor&qty=4[&pack=4][&sources=amazon,ebay]
  fromQuery: (p) => ({
    parts: [
      {
        key: "q",
        query: param(p, "q"),
        qty: intParam(p, "qty") ?? 1,
        pack: intParam(p, "pack"),
        sources: param(p, "sources")?.split(","),
      },
    ],
  }),
  run: async (input, signal): Promise<OffersResponse> => {
    const result = await offers(input.parts, signal);
    return { ...result, fetchedAt: new Date().toISOString() };
  },
};

export async function GET(req: Request) {
  await connection();
  return handleSearch(req, route);
}

export async function POST(req: Request) {
  return handleSearch(req, route);
}
