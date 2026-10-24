import { connection } from "next/server";
import { handleSearch, param, type SearchRoute } from "@/lib/server/search/route";
import { videos } from "@/lib/server/search/serpapi";
import { videosInput } from "@/lib/search/schema";
import type { VideosResponse } from "@/lib/search/types";

// No `runtime` export: cacheComponents is on, and it rejects that config (nodejs is the default).

const route: SearchRoute<typeof videosInput> = {
  bucket: "videos",
  perMinute: 30,
  schema: videosInput,
  fromQuery: (p) => ({ q: param(p, "q"), hl: param(p, "hl") }),
  run: async (input, signal): Promise<VideosResponse> => ({ videos: await videos(input, signal) }),
};

export async function GET(req: Request) {
  await connection();
  return handleSearch(req, route);
}

export async function POST(req: Request) {
  return handleSearch(req, route);
}
