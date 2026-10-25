// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const storeEvents = vi.fn(async (_rows: unknown[]) => {});
vi.mock("@/lib/server/db/ingest", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/server/db/ingest")>()),
  storeEvents: (rows: unknown[]) => storeEvents(rows),
}));

const DB = "postgres://iynk:pw@localhost:5432/iynk";
const session = "3f1c2d4e-5b6a-4789-9abc-def012345678";

async function load(vars: Record<string, string>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(vars)) vi.stubEnv(k, v);
  return import("./route");
}

let ip = 0;
function post(body: unknown, headers: Record<string, string> = {}) {
  ip += 1;
  return new Request("http://localhost/api/telemetry", {
    method: "POST",
    headers: { "content-type": "application/json", "x-real-ip": `10.0.0.${ip}`, ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const event = (over: Record<string, unknown> = {}) => ({ ts: Date.now(), kind: "lesson.pass", session, item: "uno-r3", data: { lesson: "blink" }, ...over });

beforeEach(() => storeEvents.mockClear());
afterEach(() => vi.unstubAllEnvs());

describe("POST /api/telemetry", () => {
  it("answers 503 not_configured without DATABASE_URL", async () => {
    const { POST } = await load({ DATABASE_URL: "" });
    const res = await POST(post({ events: [event()] }));
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe("not_configured");
    expect(storeEvents).not.toHaveBeenCalled();
  });

  it("stores the valid events and reports the dropped ones", async () => {
    const { POST } = await load({ DATABASE_URL: DB });
    const res = await POST(post({ events: [event(), event({ kind: "bogus" })], sentAt: Date.now() }));
    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ accepted: 1, dropped: 1 });
    expect(storeEvents).toHaveBeenCalledTimes(1);
    expect(storeEvents.mock.calls[0][0]).toHaveLength(1);
  });

  it("refuses a batch with no valid event, bad JSON, the wrong type and oversized bodies", async () => {
    const { POST } = await load({ DATABASE_URL: DB });
    expect((await POST(post({ events: [event({ session: "x" })] }))).status).toBe(400);
    expect((await POST(post("{not json"))).status).toBe(400);
    expect((await POST(post({ events: [] }))).status).toBe(400);
    expect((await POST(post({ events: [event()] }, { "content-type": "text/plain" }))).status).toBe(415);
    const many = Array.from({ length: 201 }, () => event());
    expect((await POST(post({ events: many }))).status).toBe(400);
    const huge = { events: [event({ data: { pad: "x".repeat(70_000) } })] };
    expect((await POST(post(huge))).status).toBe(413);
    expect(storeEvents).not.toHaveBeenCalled();
  });

  it("refuses other origins", async () => {
    const { POST } = await load({ DATABASE_URL: DB });
    const res = await POST(post({ events: [event()] }, { origin: "https://evil.example", host: "localhost" }));
    expect(res.status).toBe(403);
  });

  it("answers 502 when the database write fails", async () => {
    const { POST } = await load({ DATABASE_URL: DB });
    storeEvents.mockRejectedValueOnce(new Error("connection refused"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(post({ events: [event()] }));
    expect(res.status).toBe(502);
    expect(JSON.stringify(await res.json())).not.toContain("connection refused");
  });

  it("limits one session to 30 batches a minute", async () => {
    const { POST } = await load({ DATABASE_URL: DB });
    const solo = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
    let last: Response | undefined;
    for (let i = 0; i < 31; i++) last = await POST(post({ events: [event({ session: solo })] }));
    expect(last?.status).toBe(429);
  });
});
