import { handleToolPost, toolPreflight } from "@/lib/server/mcp/rest";

// The MCP tools as JSON endpoints for raw-API connectors, described by /api/openapi.json.

// plan_build_night waits up to 45 s for the planner.
export const maxDuration = 60;

export async function POST(req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  return handleToolPost(req, name);
}

export function OPTIONS() {
  return toolPreflight();
}
