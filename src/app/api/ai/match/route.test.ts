// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { completion, fakeFetch } from "@/lib/server/ai/__test__/upstream";
import { catalog, itemKey } from "@/lib/server/ai/catalog";

let ip = 0;

async function load(vars: Record<string, string> = { META_API_KEY: "k" }) {
  vi.resetModules();
  for (const [k, v] of Object.entries(vars)) vi.stubEnv(k, v);
  return (await import("./route")).POST;
}

const post = (body: unknown) =>
  new Request("http://localhost/api/ai/match", {
    method: "POST",
    headers: { "content-type": "application/json", "x-real-ip": `10.6.0.${++ip}` },
    body: JSON.stringify(body),
  });

const profile = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  name: id.toUpperCase(),
  lang: "en",
  interests: ["drones"],
  built: [],
  wants: "build a quad",
  ...extra,
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const project = catalog()[0];

describe("POST /api/ai/match", () => {
  it("keeps pool ids only, removes duplicates, clamps scores and sorts", async () => {
    const { calls } = fakeFetch(
      completion(
        JSON.stringify({
          matches: [
            { id: "b", score: 72.4, why: "B built a whoop.", sharedInterest: "drones", suggestedProject: itemKey(project) },
            { id: "c", score: 140, why: "C flies racers.", sharedInterest: "racing", suggestedProject: itemKey(project) },
            { id: "b", score: 10, why: "dup", sharedInterest: "x", suggestedProject: itemKey(project) },
          ],
        }),
      ),
    );
    const POST = await load();
    const res = await POST(post({ me: profile("a"), pool: [profile("a"), profile("b"), profile("c"), profile("b")] }));
    expect(await res.json()).toEqual({
      matches: [
        { id: "c", score: 100, why: "C flies racers.", sharedInterest: "racing", suggestedProject: { lab: project.lab, id: project.id } },
        { id: "b", score: 72, why: "B built a whoop.", sharedInterest: "drones", suggestedProject: { lab: project.lab, id: project.id } },
      ],
    });
    const schema = (calls[0].body as { response_format: { json_schema: { schema: Record<string, unknown> } } }).response_format.json_schema.schema;
    expect(JSON.stringify(schema)).toContain('"enum":["b","c"]');
  });

  it("answers an empty pool without calling the model", async () => {
    const { mock } = fakeFetch();
    const POST = await load();
    expect(await (await POST(post({ me: profile("a"), pool: [profile("a")] }))).json()).toEqual({ matches: [] });
    expect(mock).not.toHaveBeenCalled();
  });

  it("caps the pool at 50 profiles", async () => {
    const POST = await load();
    const pool = Array.from({ length: 51 }, (_, i) => profile(`p${i}`));
    expect((await POST(post({ me: profile("a"), pool }))).status).toBe(400);
  });
});
