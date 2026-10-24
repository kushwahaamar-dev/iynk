import { connection } from "next/server";
import { handleSearch, param, type SearchRoute } from "@/lib/server/search/route";
import { events } from "@/lib/server/search/serpapi";
import { eventsInput } from "@/lib/search/schema";
import type { EventsResponse } from "@/lib/search/types";

// No `runtime` export: cacheComponents is on, and it rejects that config (nodejs is the default).

const route: SearchRoute<typeof eventsInput> = {
  bucket: "events",
  perMinute: 30,
  schema: eventsInput,
  fromQuery: (p) => ({ q: param(p, "q"), near: param(p, "near") }),
  run: async (input, signal): Promise<EventsResponse> => ({ events: await events(input, signal) }),
};

export async function GET(req: Request) {
  await connection();
  return handleSearch(req, route);
}

export async function POST(req: Request) {
  return handleSearch(req, route);
}
