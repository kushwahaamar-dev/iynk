// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { GET as OPENAPI } from "@/app/api/openapi.json/route";
import { POST as TOOL_POST } from "@/app/api/mcp/tools/[name]/route";
import { POST as MCP_POST } from "@/app/api/mcp/route";

const TOKEN = vi.hoisted(() => "t".repeat(40));

vi.mock("@/lib/server/env", () => ({
  env: { NEXT_PUBLIC_SITE_URL: "https://iynk.test", IYNK_SERVER_TOKEN: TOKEN, IYNK_TRUST_PROXY: true },
  features: { ai: false, voice: false, search: false, realtime: false, gemini: false },
}));
vi.mock("next/server", () => ({ connection: async () => undefined }));

let ip = 0;

function request(path: string, body: unknown, token?: string) {
  return new Request(`https://iynk.test${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      "x-real-ip": `10.3.0.${++ip}`,
      ...(token === undefined ? {} : { "x-iynk-server-token": token }),
    },
    body: JSON.stringify(body),
  });
}

const ping = { jsonrpc: "2.0", id: 1, method: "ping" };
const callTool = (token?: string) =>
  TOOL_POST(request("/api/mcp/tools/search_catalog", { query: "stepper" }, token), { params: Promise.resolve({ name: "search_catalog" }) });

describe("POST /api/mcp", () => {
  it("answers 401 with an empty message without the token, and the same bytes for a wrong one", async () => {
    const missing = await MCP_POST(request("/api/mcp", ping));
    const wrong = await MCP_POST(request("/api/mcp", ping, "w".repeat(40)));
    expect(missing.status).toBe(401);
    expect((await missing.json()).error).toEqual({ code: "unauthorized", message: "" });
    expect(wrong.status).toBe(401);
    expect(await wrong.text()).toBe(JSON.stringify({ error: { code: "unauthorized", message: "" } }));
  });

  it("answers with the token", async () => {
    expect((await MCP_POST(request("/api/mcp", ping, TOKEN))).status).toBe(200);
  });
});

describe("POST /api/mcp/tools/[name]", () => {
  it("answers 401 with an empty message without the token, and the same bytes for a wrong one", async () => {
    const missing = await callTool();
    const wrong = await callTool("w".repeat(40));
    expect(missing.status).toBe(401);
    expect((await missing.json()).error).toEqual({ code: "unauthorized", message: "" });
    expect(wrong.status).toBe(401);
    expect(await wrong.text()).toBe(JSON.stringify({ error: { code: "unauthorized", message: "" } }));
  });

  it("answers with the token", async () => {
    expect((await callTool(TOKEN)).status).toBe(200);
  });
});

describe("GET /api/openapi.json", () => {
  it("answers anyone and adds no CORS header", async () => {
    const res = await OPENAPI();
    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });
});
