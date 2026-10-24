// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { apiError, fakeFetch } from "@/lib/server/ai/__test__/upstream";

let ip = 0;

async function load(vars: Record<string, string> = { META_API_KEY: "k" }) {
  vi.resetModules();
  for (const [k, v] of Object.entries(vars)) vi.stubEnv(k, v);
  return (await import("./route")).POST;
}

const post = (body: unknown, fixedIp?: string) =>
  new Request("http://localhost/api/ai/image", {
    method: "POST",
    headers: { "content-type": "application/json", "x-real-ip": fixedIp ?? `10.4.0.${++ip}` },
    body: JSON.stringify(body),
  });

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("POST /api/ai/image", () => {
  it("wraps the subject in the Colorfigures style and returns a data URL", async () => {
    const { calls } = fakeFetch(Response.json({ created: 1, data: [{ b64_json: "UklGRg==" }], output_format: "webp" }));
    const POST = await load();
    const res = await POST(post({ prompt: "an Arduino Uno with a glowing red LED", style: "colorfigures" }));
    expect(await res.json()).toEqual({ image: "data:image/webp;base64,UklGRg==" });
    const prompt = (calls[0].body as { prompt: string }).prompt;
    expect(prompt.startsWith("Subject: an Arduino Uno with a glowing red LED")).toBe(true);
    for (const word of ["isometric", "ink", "tomato", "mustard", "mint", "cobalt", "blush", "paper", "three flat bands"]) {
      expect(prompt).toContain(word);
    }
  });

  it("only knows the colorfigures style and short prompts", async () => {
    const POST = await load();
    expect((await POST(post({ prompt: "a drone", style: "photo" }))).status).toBe(400);
    expect((await POST(post({ prompt: "x".repeat(601), style: "colorfigures" }))).status).toBe(400);
  });

  it("is limited to a few images a minute per caller", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    fakeFetch(apiError(400), apiError(400), apiError(400));
    const POST = await load();
    const statuses = [];
    for (let i = 0; i < 4; i++) statuses.push((await POST(post({ prompt: "a drone", style: "colorfigures" }, "10.4.9.9"))).status);
    expect(statuses).toEqual([502, 502, 502, 429]);
  });

  it("needs Meta: Gemini alone does not draw", async () => {
    const POST = await load({ GEMINI_API_KEY: "g" });
    expect((await POST(post({ prompt: "a drone", style: "colorfigures" }))).status).toBe(503);
  });
});
