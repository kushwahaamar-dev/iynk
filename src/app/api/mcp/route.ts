import { connection } from "next/server";
import { handleMcpPost, mcpMethodNotAllowed, mcpPreflight } from "@/lib/server/mcp/transport";

// iynk's MCP server (HX-CONTRACT H10): Streamable HTTP, stateless, JSON answers.
// No `runtime` export: cacheComponents is on and rejects it (Node.js is the default).

// plan_build_night waits up to 45 s for the planner.
export const maxDuration = 60;

export function POST(req: Request) {
  return handleMcpPost(req);
}

export async function GET() {
  await connection();
  return mcpMethodNotAllowed();
}

export function DELETE() {
  return mcpMethodNotAllowed();
}

export function OPTIONS() {
  return mcpPreflight();
}
