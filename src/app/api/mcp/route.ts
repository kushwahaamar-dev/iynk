import { connection } from "next/server";
import { requireServerToken } from "@/lib/server/access";
import { handleMcpPost, mcpMethodNotAllowed } from "@/lib/server/mcp/transport";

// iynk's MCP server (HX-CONTRACT H10): Streamable HTTP, stateless, JSON answers.
// No `runtime` export: cacheComponents is on and rejects it (Node.js is the default).

export function POST(req: Request) {
  return requireServerToken(req) ?? handleMcpPost(req);
}

export async function GET() {
  await connection();
  return mcpMethodNotAllowed();
}

export function DELETE() {
  return mcpMethodNotAllowed();
}
