import { connection } from "next/server";
import { handleSearch, param, type SearchRoute } from "@/lib/server/search/route";
import { web } from "@/lib/server/search/serpapi";
import { webInput } from "@/lib/search/schema";
import type { WebResponse } from "@/lib/search/types";

// No `runtime` export: cacheComponents is on, and it rejects that config (nodejs is the default).

const route: SearchRoute<typeof webInput> = {
  bucket: "web",
  // Each call with extract=true spends up to three searches.
  perMinute: 15,
  schema: webInput,
  fromQuery: (p) => {
    const extract = param(p, "extract");
    return {
      q: param(p, "q"),
      extract: extract === undefined ? undefined : extract === "1" || extract === "true" ? true : extract === "0" || extract === "false" ? false : extract,
      hl: param(p, "hl"),
    };
  },
  run: async (input, signal): Promise<WebResponse> => web(input, signal),
};

export async function GET(req: Request) {
  await connection();
  return handleSearch(req, route);
}

export async function POST(req: Request) {
  return handleSearch(req, route);
}
