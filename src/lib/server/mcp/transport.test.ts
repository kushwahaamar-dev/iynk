// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { DELETE, GET, OPTIONS, POST } from "@/app/api/mcp/route";

vi.mock("@/lib/server/env", () => ({
  env: { NEXT_PUBLIC_SITE_URL: "https://iynk.test" },
  features: { ai: false, image: false, voice: false, search: false, solana: false, db: false, realtime: false, gemini: false },
}));
vi.mock("next/server", () => ({ connection: async () => undefined }));

let ip = 0;

/** A POST from a fresh address, so the per-IP rate limit never interferes unless a test wants it to. */
function post(body: unknown, headers: Record<string, string> = {}, from = `10.0.0.${++ip}`) {
  return POST(
    new Request("https://iynk.test/api/mcp", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json, text/event-stream", "x-real-ip": from, ...headers },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

const MODERN = "2026-07-28";
const meta = { "io.modelcontextprotocol/protocolVersion": MODERN, "io.modelcontextprotocol/clientInfo": { name: "test", version: "1" } };
const modernHeaders = (method: string, extra: Record<string, string> = {}) => ({ "mcp-protocol-version": MODERN, "mcp-method": method, ...extra });

describe("legacy era (initialize handshake)", () => {
  it("negotiates the client's version, or offers its newest", async () => {
    const res = await post({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "t", version: "1" } } });
    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    const body = await res.json();
    expect(body.result).toMatchObject({ protocolVersion: "2025-06-18", capabilities: { tools: { listChanged: false } }, serverInfo: { name: "iynk", title: "iynk" } });
    expect(body.result.instructions).toMatch(/search_catalog/);
    expect(res.headers.get("mcp-session-id")).toBeNull();

    const later = await (await post({ jsonrpc: "2.0", id: 2, method: "initialize", params: { protocolVersion: "2099-01-01" } })).json();
    expect(later.result.protocolVersion).toBe("2025-11-25");
  });

  it("accepts notifications with 202 and no body", async () => {
    const res = await post({ jsonrpc: "2.0", method: "notifications/initialized" });
    expect(res.status).toBe(202);
    expect(await res.text()).toBe("");
  });

  it("lists the seven H10 tools with schemas and read-only annotations", async () => {
    const body = await (await post({ jsonrpc: "2.0", id: 3, method: "tools/list" }, { "mcp-protocol-version": "2025-11-25" })).json();
    const tools = body.result.tools as { name: string; inputSchema: { type: string }; outputSchema: object; annotations: { readOnlyHint: boolean } }[];
    expect(tools.map((t) => t.name)).toEqual(["search_catalog", "get_item", "drone_calc", "price_parts", "plan_build_night", "create_room", "get_passport"]);
    for (const tool of tools) {
      expect(tool.inputSchema.type).toBe("object");
      expect(tool.outputSchema).toBeTypeOf("object");
      expect(tool.annotations.readOnlyHint).toBe(true);
    }
    expect(body.result.resultType).toBeUndefined();
  });

  it("answers tools/call with structured content, and tool failures as isError results", async () => {
    const found = await (await post({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "search_catalog", arguments: { query: "verilog fpga" } } })).json();
    expect(found.result.structuredContent.results.map((r: { id: string }) => r.id)).toEqual(["basys3", "de10-lite"]);
    expect(JSON.parse(found.result.content[0].text)).toEqual(found.result.structuredContent);

    const off = await (await post({ jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "create_room", arguments: {} } })).json();
    expect(off.result.isError).toBe(true);
    expect(off.result.content[0].text).toMatch(/not set up on this deployment.*\[not_configured\]/);

    const bad = await (await post({ jsonrpc: "2.0", id: 6, method: "tools/call", params: { name: "get_item", arguments: { lab: "car" } } })).json();
    expect(bad.result.isError).toBe(true);
    expect(bad.result.content[0].text).toMatch(/^Invalid arguments for get_item: lab: .*; id: /);
  });

  it("returns protocol errors for unknown tools and methods", async () => {
    const tool = await (await post({ jsonrpc: "2.0", id: 7, method: "tools/call", params: { name: "launch_rocket" } })).json();
    expect(tool.error).toMatchObject({ code: -32602, message: expect.stringMatching(/Unknown tool: launch_rocket/) });
    const method = await post({ jsonrpc: "2.0", id: 8, method: "resources/list" });
    expect(method.status).toBe(200);
    expect((await method.json()).error.code).toBe(-32601);
  });

  it("rejects an unsupported MCP-Protocol-Version header", async () => {
    const res = await post({ jsonrpc: "2.0", id: 9, method: "tools/list" }, { "mcp-protocol-version": "2024-01-01" });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatchObject({ code: -32022, data: { requested: "2024-01-01", supported: expect.arrayContaining([MODERN, "2025-11-25"]) } });
  });
});

describe("modern era (2026-07-28, per-request metadata)", () => {
  it("serves server/discover", async () => {
    const res = await post({ jsonrpc: "2.0", id: "d1", method: "server/discover", params: { _meta: meta } }, modernHeaders("server/discover"));
    expect(res.status).toBe(200);
    const { result } = await res.json();
    expect(result).toMatchObject({ resultType: "complete", supportedVersions: [MODERN, "2025-11-25", "2025-06-18", "2025-03-26"], capabilities: { tools: {} } });
    expect(result._meta["io.modelcontextprotocol/serverInfo"]).toMatchObject({ name: "iynk" });
  });

  it("calls tools when the headers mirror the body, including a base64 Mcp-Name", async () => {
    const params = { name: "get_item", arguments: { lab: "drone", id: "quad5" }, _meta: meta };
    const res = await post({ jsonrpc: "2.0", id: 2, method: "tools/call", params }, modernHeaders("tools/call", { "mcp-name": "=?base64?Z2V0X2l0ZW0=?=" }));
    const { result } = await res.json();
    expect(result).toMatchObject({ resultType: "complete", structuredContent: { lab: "drone", id: "quad5" } });
  });

  it("rejects missing or mismatched headers with HeaderMismatch", async () => {
    const call = { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "get_item", arguments: {}, _meta: meta } };
    for (const headers of [
      { "mcp-method": "tools/call", "mcp-name": "get_item" },
      modernHeaders("tools/call"),
      modernHeaders("tools/call", { "mcp-name": "search_catalog" }),
      modernHeaders("tools/list", { "mcp-name": "get_item" }),
      { ...modernHeaders("tools/call", { "mcp-name": "get_item" }), "mcp-protocol-version": "2025-11-25" },
    ]) {
      const res = await post(call, headers);
      expect(res.status).toBe(400);
      expect((await res.json()).error.code).toBe(-32020);
    }
  });

  it("names its versions when the requested one is unsupported, and 404s unknown methods", async () => {
    const old = { ...meta, "io.modelcontextprotocol/protocolVersion": "1900-01-01" };
    const res = await post({ jsonrpc: "2.0", id: 4, method: "tools/list", params: { _meta: old } }, { ...modernHeaders("tools/list"), "mcp-protocol-version": "1900-01-01" });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatchObject({ code: -32022, data: { requested: "1900-01-01" } });

    const unknown = await post({ jsonrpc: "2.0", id: 5, method: "prompts/list", params: { _meta: meta } }, modernHeaders("prompts/list"));
    expect(unknown.status).toBe(404);
    expect((await unknown.json()).error.code).toBe(-32601);
  });
});

describe("HTTP rules", () => {
  it("refuses batches and malformed messages", async () => {
    expect((await post([{ jsonrpc: "2.0", id: 1, method: "ping" }])).status).toBe(400);
    expect((await post({ id: 1, method: "ping" })).status).toBe(400);
    expect((await post("{not json")).status).toBe(400);
  });

  it("blocks browser requests that arrive under a foreign Host (DNS rebinding)", async () => {
    const ping = { jsonrpc: "2.0", id: 1, method: "ping" };
    expect((await post(ping, { origin: "http://evil.test", host: "evil.test:3000" })).status).toBe(403);
    expect((await post(ping, { origin: "http://localhost:6274", host: "localhost:3000" })).status).toBe(200);
    expect((await post(ping, { origin: "https://anywhere.example", host: "iynk.test" })).status).toBe(200);
  });

  it("rate-limits one caller", async () => {
    const ping = { jsonrpc: "2.0", id: 1, method: "ping" };
    const statuses = [];
    for (let i = 0; i < 121; i++) statuses.push((await post(ping, {}, "10.9.9.9")).status);
    expect(statuses.slice(0, 120).every((s) => s === 200)).toBe(true);
    expect(statuses[120]).toBe(429);
  });

  it("answers GET and DELETE with 405 and preflight with open CORS", async () => {
    const get = await GET();
    expect(get.status).toBe(405);
    expect(get.headers.get("allow")).toBe("POST, OPTIONS");
    expect((await DELETE()).status).toBe(405);
    const pre = OPTIONS();
    expect(pre.status).toBe(204);
    expect(pre.headers.get("access-control-allow-headers")).toMatch(/mcp-protocol-version/);
  });
});
