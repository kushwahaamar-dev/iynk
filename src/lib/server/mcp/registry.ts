import "server-only";
import { z } from "zod";

/**
 * One tool definition feeds every surface: MCP tools/list and tools/call, the REST endpoint
 * /api/mcp/tools/<name> and the OpenAPI document. Inputs and outputs are zod schemas, so the
 * JSON Schemas the clients see and the validation the server runs cannot drift apart.
 */

type ToolErrorCode = "bad_input" | "not_found" | "not_configured" | "rate_limited" | "upstream" | "internal";

/** A failure the caller can act on; its message is safe to show and to hand to a model. */
export class ToolError extends Error {
  constructor(
    readonly code: ToolErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ToolError";
  }
}

export type ToolContext = {
  /** Absolute site origin for the links a tool returns, e.g. https://iynk.tech. */
  siteUrl: string;
};

export type Tool<I extends z.ZodType = z.ZodType, O extends z.ZodType = z.ZodType> = {
  name: string;
  title: string;
  description: string;
  input: I;
  output: O;
  /** Talks to a service outside iynk (SerpApi, Meta's model API). */
  openWorld: boolean;
  /** Same input, same answer (no model sampling, no fresh ids, no live prices). */
  idempotent: boolean;
  run(input: z.output<I>, ctx: ToolContext): Promise<z.input<O>>;
};

export const defineTool = <I extends z.ZodType, O extends z.ZodType>(tool: Tool<I, O>): Tool<I, O> => tool;

type JsonSchema = Record<string, unknown>;

function jsonSchema(schema: z.ZodType, io: "input" | "output"): JsonSchema {
  const out: JsonSchema = { ...z.toJSONSchema(schema, { io, target: "draft-2020-12" }) };
  // Draft 2020-12 is the default for both MCP and OpenAPI 3.1, so the marker is left out.
  delete out.$schema;
  return out;
}

type ToolSchemas = { inputSchema: JsonSchema; outputSchema: JsonSchema };

const schemaCache = new WeakMap<Tool, ToolSchemas>();

export function schemasOf(tool: Tool): ToolSchemas {
  let schemas = schemaCache.get(tool);
  if (!schemas) {
    schemas = { inputSchema: jsonSchema(tool.input, "input"), outputSchema: jsonSchema(tool.output, "output") };
    schemaCache.set(tool, schemas);
  }
  return schemas;
}

/** The MCP Tool object (server/tools "Tool" data type). Every iynk tool only reads. */
export function describeTool(tool: Tool) {
  return {
    name: tool.name,
    title: tool.title,
    description: tool.description,
    ...schemasOf(tool),
    annotations: {
      title: tool.title,
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: tool.idempotent,
      openWorldHint: tool.openWorld,
    },
  };
}

export type ToolOutcome = { ok: true; data: unknown } | { ok: false; code: ToolErrorCode; message: string };

function describeIssues(error: z.ZodError): string {
  return error.issues
    .slice(0, 6)
    .map((issue) => `${issue.path.length ? issue.path.join(".") : "input"}: ${issue.message}`)
    .join("; ");
}

/** Validates the arguments, runs the tool and checks its result against the output schema. */
export async function runTool(tool: Tool, args: unknown, ctx: ToolContext): Promise<ToolOutcome> {
  const parsed = tool.input.safeParse(args ?? {});
  if (!parsed.success) return { ok: false, code: "bad_input", message: `Invalid arguments for ${tool.name}: ${describeIssues(parsed.error)}` };
  try {
    const raw = await tool.run(parsed.data, ctx);
    const checked = tool.output.safeParse(raw);
    if (!checked.success) {
      console.error(`[mcp] ${tool.name} produced output outside its schema: ${describeIssues(checked.error)}`);
      return { ok: false, code: "internal", message: `iynk could not put together a valid ${tool.name} result.` };
    }
    return { ok: true, data: checked.data };
  } catch (error) {
    if (error instanceof ToolError) return { ok: false, code: error.code, message: error.message };
    console.error(`[mcp] ${tool.name} failed:`, error instanceof Error ? error.name : typeof error);
    return { ok: false, code: "internal", message: `iynk hit an unexpected error while running ${tool.name}.` };
  }
}

/** HTTP status for a tool failure on the REST surface (HX-CONTRACT H2). */
export const STATUS_OF: Record<ToolErrorCode, number> = {
  bad_input: 400,
  not_found: 404,
  rate_limited: 429,
  internal: 500,
  upstream: 502,
  not_configured: 503,
};
