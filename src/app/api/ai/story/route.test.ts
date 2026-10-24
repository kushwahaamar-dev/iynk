// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { completion, fakeFetch } from "@/lib/server/ai/__test__/upstream";

let ip = 0;

async function load(vars: Record<string, string> = { META_API_KEY: "k" }) {
  vi.resetModules();
  for (const [k, v] of Object.entries(vars)) vi.stubEnv(k, v);
  return (await import("./route")).POST;
}

const post = (body: unknown) =>
  new Request("http://localhost/api/ai/story", {
    method: "POST",
    headers: { "content-type": "application/json", "x-real-ip": `10.3.0.${++ip}` },
    body: JSON.stringify(body),
  });

const session = {
  lab: "board",
  itemId: "uno-r3",
  locale: "en",
  peers: [
    { name: "Ana", lang: "es" },
    { name: "Raj", lang: "hi" },
  ],
  events: [
    { t: 1_729_790_000_000, who: "Raj", kind: "action", text: "wired led1 to D13" },
    { t: 1_729_790_065_000, who: "Ana", kind: "help", text: "the long leg goes to D13" },
    { t: 1_729_790_030_000, who: "Raj", kind: "fault", text: "LED reversed, no light" },
  ],
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("POST /api/ai/story", () => {
  it("writes the story from a time-ordered log and caps its length", async () => {
    const long = `${"Raj wired the LED. ".repeat(100)}Ana helped.`;
    const { calls } = fakeFetch(
      completion(JSON.stringify({ title: "Blink, at last", story: long, highlights: ["Ana spotted the LED", "It blinked"], imagePrompt: "x".repeat(700) })),
    );
    const POST = await load();
    const res = await POST(post(session));
    expect(res.status).toBe(200);
    const story = await res.json();
    expect(story.title).toBe("Blink, at last");
    expect(story.story.split(/\s+/).length).toBeLessThanOrEqual(250);
    expect(story.story.endsWith(".")).toBe(true);
    expect(story.imagePrompt).toHaveLength(600);
    const prompt = (calls[0].body as { messages: Array<{ content: string }> }).messages[1].content;
    expect(prompt.indexOf("[0:00] Raj (action)")).toBeLessThan(prompt.indexOf("[0:30] Raj (fault)"));
    expect(prompt).toContain("[1:05] Ana (help): the long leg goes to D13");
    expect(prompt).toContain("Ana (speaks Spanish)");
  });

  it("needs at least one event and a known lab", async () => {
    const POST = await load();
    expect((await POST(post({ ...session, events: [] }))).status).toBe(400);
    expect((await POST(post({ ...session, lab: "kitchen" }))).status).toBe(400);
  });

  it("answers 502 when the model's reply is not the story shape", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    fakeFetch(completion(JSON.stringify({ title: "x" })));
    const POST = await load();
    const res = await POST(post(session));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: { code: "upstream_failed", message: "The upstream service failed." } });
  });
});
