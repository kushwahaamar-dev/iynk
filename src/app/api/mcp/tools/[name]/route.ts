import { requireServerToken } from "@/lib/server/access";
import { handleToolPost } from "@/lib/server/mcp/rest";

// The MCP tools as JSON endpoints for raw-API connectors, described by /api/openapi.json.

export async function POST(req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  return requireServerToken(req) ?? handleToolPost(req, name);
}
