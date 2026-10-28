import { connection } from "next/server";
import { env } from "@/lib/server/env";
import { json } from "@/lib/server/http";
import { openApiDocument } from "@/lib/server/mcp/openapi";

// OpenAPI 3.1 for iynk's tools (HX-CONTRACT H10), for connectors that take a raw API instead of MCP.

export async function GET() {
  await connection();
  return json(openApiDocument(env.NEXT_PUBLIC_SITE_URL), { headers: { "cache-control": "public, max-age=300" } });
}
