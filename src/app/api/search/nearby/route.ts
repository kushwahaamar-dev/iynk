import { connection } from "next/server";
import { handleSearch, param, type SearchRoute } from "@/lib/server/search/route";
import { nearby } from "@/lib/server/search/serpapi";
import { nearbyInput } from "@/lib/search/schema";
import type { NearbyResponse } from "@/lib/search/types";

// No `runtime` export: cacheComponents is on, and it rejects that config (nodejs is the default).

const route: SearchRoute<typeof nearbyInput> = {
  bucket: "nearby",
  perMinute: 30,
  schema: nearbyInput,
  fromQuery: (p) => ({ kind: param(p, "kind"), ll: param(p, "ll"), near: param(p, "near"), hl: param(p, "hl") }),
  run: async (input, signal): Promise<NearbyResponse> => ({ places: await nearby(input, signal) }),
};

export async function GET(req: Request) {
  await connection();
  return handleSearch(req, route);
}

export async function POST(req: Request) {
  return handleSearch(req, route);
}
