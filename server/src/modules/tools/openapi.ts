import { SERVER_INSTRUCTIONS, SERVER_VERSION, schemasOf, type Tool } from "./registry.ts";

/** OpenAPI 3.1 for the REST twins of the MCP tools (POST /v1/tools/<name>), built from the same registry. */

const errorResponse = (description: string) => ({
  description,
  content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
});

export function toolsOpenapi(tools: readonly Tool[], siteUrl: string): object {
  const paths = Object.fromEntries(
    tools.map((tool) => {
      const { inputSchema, outputSchema } = schemasOf(tool);
      const operation = {
        operationId: tool.name,
        summary: tool.title,
        description: tool.description,
        requestBody: { required: true, content: { "application/json": { schema: inputSchema } } },
        responses: {
          "200": { description: "The result.", content: { "application/json": { schema: outputSchema } } },
          "400": errorResponse("The arguments are not valid; the message says which one and why."),
          "401": errorResponse("No device token or MCP key, or one this server does not know."),
          "404": errorResponse("The item (or the tool) does not exist."),
          "429": errorResponse("Rate limited; retry after the Retry-After header's seconds."),
          "502": errorResponse("An upstream service failed."),
          "503": errorResponse("The feature is not set up on this deployment (error code not_configured)."),
        },
      };
      return [`/v1/tools/${tool.name}`, { post: operation }];
    }),
  );
  return {
    openapi: "3.1.0",
    info: {
      title: "iynk",
      version: SERVER_VERSION,
      summary: "A free in-browser hardware lab: boards, robotics benches and drones to learn, price, plan and build together.",
      description: `${SERVER_INSTRUCTIONS}\n\nThe same tools are served over MCP (Streamable HTTP) at ${siteUrl}/v1/mcp. Calls need a device token or the MCP key from \`iynk-server mcp-key\`; every operation only reads.`,
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
