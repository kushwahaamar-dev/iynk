import "server-only";
import { schemasOf } from "./registry";
import { SERVER_INSTRUCTIONS, SERVER_VERSION, TOOLS } from "./tools";

/** OpenAPI 3.1 for the REST twins of the MCP tools (POST /api/mcp/tools/<name>), built from the same registry. */

const errorResponse = (description: string) => ({
  description,
  content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
});

export function openApiDocument(siteUrl: string) {
  const paths = Object.fromEntries(
    TOOLS.map((tool) => {
      const { inputSchema, outputSchema } = schemasOf(tool);
      const operation = {
        operationId: tool.name,
        summary: tool.title,
        description: tool.description,
        requestBody: { required: true, content: { "application/json": { schema: inputSchema } } },
        responses: {
          "200": { description: "The result.", content: { "application/json": { schema: outputSchema } } },
          "400": errorResponse("The arguments are not valid; the message says which one and why."),
          "403": errorResponse("A browser called from a host SimLab does not serve."),
          "404": errorResponse("The item (or the tool) does not exist."),
          "429": errorResponse("Rate limited; retry after the Retry-After header's seconds."),
          "502": errorResponse("An upstream service (SerpApi, Meta, Solana) failed."),
          "503": errorResponse("The feature is not set up on this deployment (error code not_configured)."),
        },
      };
      return [`/api/mcp/tools/${tool.name}`, { post: operation }];
    }),
  );
  return {
    openapi: "3.1.0",
    info: {
      title: "SimLab",
      version: SERVER_VERSION,
      summary: "A free in-browser hardware lab: boards, robotics benches and drones to learn, price, plan and build together.",
      description: `${SERVER_INSTRUCTIONS}\n\nThe same tools are served over MCP (Streamable HTTP) at ${siteUrl}/api/mcp. No authentication; every operation only reads.`,
    },
    servers: [{ url: siteUrl }],
    paths,
    components: {
      schemas: {
        Error: {
          type: "object",
          properties: {
            error: {
              type: "object",
              properties: {
                code: { type: "string", description: "Why it failed, e.g. bad_input, not_found, not_configured, rate_limited, upstream." },
                message: { type: "string", description: "A short English explanation that is safe to show." },
              },
              required: ["code", "message"],
            },
          },
          required: ["error"],
        },
      },
    },
  };
}
