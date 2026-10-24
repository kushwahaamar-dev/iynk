import { connection } from "next/server";
import { env } from "@/lib/server/env";
import { json } from "@/lib/server/http";
import { openApiDocument } from "@/lib/server/mcp/openapi";
import { withCors } from "@/lib/server/mcp/http";

// OpenAPI 3.1 for SimLab's tools (HX-CONTRACT H10), for connectors that take a raw API instead of MCP.

const METHODS = "GET, OPTIONS";

export async function GET() {
  await connection();
  return withCors(json(openApiDocument(env.NEXT_PUBLIC_SITE_URL), { headers: { "cache-control": "public, max-age=300" } }), METHODS);
}

export function OPTIONS() {
  return withCors(new Response(null, { status: 204 }), METHODS);
}
