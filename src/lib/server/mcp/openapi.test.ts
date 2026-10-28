// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/openapi.json/route";
import { POST as TOOL_POST } from "@/app/api/mcp/tools/[name]/route";

const TOKEN = vi.hoisted(() => "t".repeat(40));

vi.mock("@/lib/server/env", () => ({
  env: { NEXT_PUBLIC_SITE_URL: "https://iynk.test", IYNK_SERVER_TOKEN: TOKEN, IYNK_TRUST_PROXY: true },
  features: { ai: false, voice: false, search: false, realtime: false, gemini: false },
}));
vi.mock("next/server", () => ({ connection: async () => undefined }));

let ip = 0;

function callTool(name: string, body: unknown, headers: Record<string, string> = {}) {
  const req = new Request(`https://iynk.test/api/mcp/tools/${name}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-iynk-server-token": TOKEN, "x-real-ip": `10.1.0.${++ip}`, ...headers },
    body: JSON.stringify(body),
  });
  return TOOL_POST(req, { params: Promise.resolve({ name }) });
}

describe("GET /api/openapi.json", () => {
  it("describes every tool as a POST operation with its schemas", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect([...res.headers.keys()].filter((h) => h.startsWith("access-control-"))).toEqual([]);
    const doc = await res.json();
    expect(doc).toMatchObject({ openapi: "3.1.0", info: { title: "iynk" }, servers: [{ url: "https://iynk.test" }] });
    type Body = { content: Record<string, { schema: { type?: string; $ref?: string } }> };
    const ops = Object.entries(doc.paths as Record<string, { post: { operationId: string; requestBody: Body; responses: Record<string, Body> } }>);
    expect(ops.map(([path]) => path)).toEqual([
      "/api/mcp/tools/search_catalog",
      "/api/mcp/tools/get_item",
      "/api/mcp/tools/drone_calc",
      "/api/mcp/tools/price_parts",
      "/api/mcp/tools/create_room",
    ]);
    for (const [path, { post }] of ops) {
      expect(path.endsWith(post.operationId)).toBe(true);
      expect(post.requestBody.content["application/json"].schema.type).toBe("object");
      expect(post.responses["200"].content["application/json"].schema.type).toBe("object");
      expect(post.responses["503"].content["application/json"].schema.$ref).toBe("#/components/schemas/Error");
    }
    expect(JSON.stringify(doc)).not.toContain("$schema");
  });
});

describe("POST /api/mcp/tools/<name>", () => {
  it("runs a tool and returns its result as plain JSON", async () => {
    const res = await callTool("search_catalog", { query: "stepper" });
    expect(res.status).toBe(200);
    expect([...res.headers.keys()].filter((h) => h.startsWith("access-control-"))).toEqual([]);
    const body = await res.json();
    expect(body.results[0]).toMatchObject({ lab: "robotics", id: "a4988" });
  });

  it("maps tool errors to the API's error shape and status", async () => {
    const bad = await callTool("get_item", { lab: "board" });
    expect(bad.status).toBe(400);
    expect((await bad.json()).error.code).toBe("bad_input");

    const missing = await callTool("get_item", { lab: "board", id: "arduino-mega" });
    expect(missing.status).toBe(404);

    const off = await callTool("create_room", {});
    expect(off.status).toBe(503);
    expect((await off.json()).error).toMatchObject({ code: "not_configured", message: expect.stringMatching(/not set up/) });

    const unknown = await callTool("launch_rocket", {});
    expect(unknown.status).toBe(404);
    expect((await unknown.json()).error.code).toBe("unknown_tool");

    for (const gone of [["get", "passport"], ["plan", "build", "night"]]) {
      expect((await callTool(gone.join("_"), {})).status).toBe(404);
    }
  });

  it("refuses non-JSON bodies", async () => {
    const req = new Request("https://iynk.test/api/mcp/tools/search_catalog", { method: "POST", headers: { "content-type": "text/plain", "x-iynk-server-token": TOKEN }, body: "hi" });
    expect((await TOOL_POST(req, { params: Promise.resolve({ name: "search_catalog" }) })).status).toBe(415);
  });
});
