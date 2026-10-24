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
  new Request("http://localhost/api/ai/plan", {
    method: "POST",
    headers: { "content-type": "application/json", "x-real-ip": `10.5.0.${++ip}` },
    body: JSON.stringify(body),
  });

const night = {
  locale: "es",
  participants: [
    { name: "Ana", lang: "es", level: "lots", wants: "fly something fast" },
    { name: "Raj", lang: "hi", level: "new", wants: "learn to solder" },
  ],
  messages: [{ who: "Ana", text: "drones!" }],
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("POST /api/ai/plan", () => {
  it("constrains the item to the catalog and keeps roles for real participants only", async () => {
    const { calls } = fakeFetch(
      completion(
        JSON.stringify({
          title: "Noche de dron",
          item: itemKey(catalog()[0]),
          why: "Ana quiere velocidad; Raj aprende a soldar.",
          roles: [
            { name: "raj", role: "wirer", firstTask: "Suelda los cables del motor" },
            { name: "Ghost", role: "pilot", firstTask: "?" },
            { name: "Ana", role: "pilot", firstTask: "Configura Betaflight" },
          ],
          steps: ["Arma el marco", "Suelda", "Vuela"],
          parts: ["5-inch freestyle frame"],
        }),
      ),
    );
    const POST = await load();
    const res = await POST(post(night));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      title: "Noche de dron",
      item: { lab: catalog()[0].lab, id: catalog()[0].id },
      why: "Ana quiere velocidad; Raj aprende a soldar.",
      roles: [
        { name: "Ana", role: "pilot", firstTask: "Configura Betaflight" },
        { name: "Raj", role: "wirer", firstTask: "Suelda los cables del motor" },
      ],
      steps: ["Arma el marco", "Suelda", "Vuela"],
      parts: ["5-inch freestyle frame"],
    });
    const schema = (calls[0].body as { response_format: { json_schema: { schema: { properties: { item: { enum: string[] } } } } } })
      .response_format.json_schema.schema;
    // Whatever src/content holds right now: the generated index, or every D3 id before content lands.
    expect(schema.properties.item.enum).toEqual(catalog().map(itemKey));
  });

  it("rejects an item that is not in the catalog", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    fakeFetch(completion(JSON.stringify({ title: "t", item: "drone:made-up", why: "w", roles: [], steps: ["s"], parts: [] })));
    const POST = await load();
    expect((await POST(post(night))).status).toBe(502);
  });

  it("omits parts for a software-only plan and validates participants", async () => {
    fakeFetch(completion(JSON.stringify({ title: "t", item: itemKey(catalog()[0]), why: "w", roles: [], steps: ["s"], parts: [] })));
    const POST = await load();
    const body = await (await POST(post(night))).json();
    expect(body).not.toHaveProperty("parts");
    expect((await POST(post({ ...night, participants: [] }))).status).toBe(400);
  });
});
