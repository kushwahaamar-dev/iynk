// @vitest-environment node
// The official MCP TypeScript SDK client against the real route handler: handshake, the standalone-stream probe
// (GET -> 405), tools/list with schema checks, and tools/call with its output-schema validation.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, POST } from "@/app/api/mcp/route";

vi.mock("@/lib/server/env", () => ({
  env: { NEXT_PUBLIC_SITE_URL: "https://iynk.test" },
  features: { ai: false, image: false, voice: false, search: false, db: false, realtime: true, gemini: false },
}));
vi.mock("next/server", () => ({ connection: async () => undefined }));
vi.mock("@/content/index.generated", async () => {
  const { quad5 } = await import("./__fixtures__/content");
  return { loadBoard: async () => null, loadRobotics: async () => null, loadDrone: async (id: string) => (id === "quad5" ? quad5 : null) };
});

const seen: string[] = [];

async function routeHandler(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  const req = new Request(input, init);
  seen.push(req.method);
  if (req.method === "POST") return POST(req);
  if (req.method === "GET") return GET();
  if (req.method === "DELETE") return DELETE();
  return new Response(null, { status: 405 });
}

let client: Client | undefined;

afterEach(async () => {
  await client?.close();
  client = undefined;
  seen.length = 0;
});

async function connect() {
  client = new Client({ name: "iynk-e2e", version: "1.1.0" });
  const transport = new StreamableHTTPClientTransport(new URL("https://iynk.test/api/mcp"), { fetch: routeHandler });
  await client.connect(transport);
  return client;
}

describe("SDK client against /api/mcp", () => {
  it("initializes and reads the server's identity and instructions", async () => {
    const c = await connect();
    expect(c.getServerVersion()).toMatchObject({ name: "iynk", title: "iynk", version: "1.1.0" });
    expect(c.getServerCapabilities()).toMatchObject({ tools: { listChanged: false } });
    expect(c.getInstructions()).toMatch(/create_room/);
    await expect(c.ping()).resolves.toEqual({});
    expect(seen.filter((m) => m === "POST").length).toBeGreaterThanOrEqual(3);
  });

  it("lists the five tools", async () => {
    const { tools } = await (await connect()).listTools();
    expect(tools.map((t) => t.name)).toEqual(["search_catalog", "get_item", "drone_calc", "price_parts", "create_room"]);
    expect(tools.find((t) => t.name === "drone_calc")?.inputSchema.required).toEqual(["drone"]);
  });

  it("calls tools and passes the SDK's output-schema validation", async () => {
    const c = await connect();
    await c.listTools();
    const found = await c.callTool({ name: "search_catalog", arguments: { query: "line sensor", locale: "de" } });
    expect(found.isError).toBeFalsy();
    const [first] = (found.structuredContent as { results: unknown[] }).results;
    expect(first).toMatchObject({ lab: "robotics", id: "qtr-8rc", url: "https://iynk.test/de/robotics/qtr-8rc" });

    const room = await c.callTool({ name: "create_room", arguments: { lab: "robotics", id: "qtr-8rc" } });
    expect(room.structuredContent).toMatchObject({ lab: "robotics", id: "qtr-8rc", room: expect.stringMatching(/^[a-z2-9]{6}$/) });

    const item = await c.callTool({ name: "get_item", arguments: { lab: "board", id: "pico" } });
    expect(item.structuredContent).toMatchObject({ id: "pico", tags: ["rp2040", "rp2350", "pio", "wifi"] });
  });

  it("validates the nested drone answers (detail union, nullable fields, check values)", async () => {
    const c = await connect();
    await c.listTools();
    const item = await c.callTool({ name: "get_item", arguments: { lab: "drone", id: "quad5" } });
    expect(item.structuredContent).toMatchObject({ details: { lab: "drone", firmware: "betaflight", frame: { motors: 4 } } });
    const calc = await c.callTool({ name: "drone_calc", arguments: { drone: "quad5", battery: "6s1800", motor: "2306-2450", prop: "5x5x3" } });
    expect(calc.isError).toBeFalsy();
    expect(calc.structuredContent).toMatchObject({ verdicts: expect.arrayContaining(["over"]), result: { cruise: null } });
  });

  it("hands tool failures back as isError results the model can read", async () => {
    const c = await connect();
    const out = await c.callTool({ name: "create_room", arguments: { lab: "drone" } });
    expect(out.isError).toBe(true);
    expect(out.content).toEqual([{ type: "text", text: expect.stringMatching(/both lab and id/) }]);
  });
});
