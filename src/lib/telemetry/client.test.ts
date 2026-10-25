import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Client = typeof import("./client");

const fetchMock = vi.fn<typeof fetch>();
let beacons: { url: string; body: string }[] = [];

async function fresh(db: boolean, telemetryStatus = 202): Promise<Client> {
  vi.resetModules();
  fetchMock.mockImplementation(async (input) => {
    const url = String(input);
    if (url === "/api/status") return Response.json({ features: { db } });
    if (url === "/api/telemetry") return new Response(null, { status: telemetryStatus });
    throw new Error(`unexpected ${url}`);
  });
  return import("./client");
}

const posts = () =>
  fetchMock.mock.calls
    .filter(([url]) => url === "/api/telemetry")
    .map(([, init]) => JSON.parse(String(init?.body)) as { events: { kind: string; data: Record<string, unknown>; room?: string; item?: string; session: string }[]; sentAt: number });

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  beacons = [];
  Object.defineProperty(navigator, "sendBeacon", {
    configurable: true,
    value: (url: string, body: Blob) => {
      void body.text().then((text) => beacons.push({ url, body: text }));
      return true;
    },
  });
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("telemetry client", () => {
  it("keeps one random session id per browser", async () => {
    const a = await fresh(true);
    const id = a.telemetrySession();
    expect(id).toMatch(/^[A-Za-z0-9_-]{8,64}$/);
    const b = await fresh(true);
    expect(b.telemetrySession()).toBe(id);
  });

  it("batches events with the context and sends them on flush", async () => {
    const t = await fresh(true);
    t.setTelemetryContext({ room: "ab23cd", item: "uno-r3" });
    t.track("lesson.attempt", { lesson: "blink" });
    t.track("fault", { code: "reversed-led" });
    await t.flush();
    const [batch] = posts();
    expect(batch.events.map((e) => e.kind)).toEqual(["lesson.attempt", "fault"]);
    expect(batch.events[0]).toMatchObject({ room: "ab23cd", item: "uno-r3", data: { lesson: "blink" } });
    expect(typeof batch.sentAt).toBe("number");
  });

  it("sends a lap right away and tells listeners once it is stored", async () => {
    const t = await fresh(true);
    const seen: string[][] = [];
    t.onFlushed((kinds) => seen.push([...kinds]));
    t.track("flight.lap", { course: "quad5-bando", timeMs: 41_000, name: "Ada" });
    await vi.waitFor(() => expect(seen).toEqual([["flight.lap"]]));
  });

  it("is a no-op when the deployment has no database", async () => {
    const t = await fresh(false);
    t.track("lesson.pass", { lesson: "blink" });
    await t.flush();
    t.track("lesson.pass", { lesson: "fade" });
    await t.flush();
    expect(posts()).toHaveLength(0);
    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/status")).toHaveLength(1);
  });

  it("stops after the server answers 503", async () => {
    const t = await fresh(true, 503);
    t.track("ai.call", {});
    await t.flush();
    t.track("ai.call", {});
    await t.flush();
    expect(posts()).toHaveLength(1);
  });

  it("keeps the events and retries after a server error", async () => {
    const t = await fresh(true, 502);
    t.track("hw.connect", { board: "uno" });
    await t.flush();
    fetchMock.mockImplementation(async (input) =>
      String(input) === "/api/status" ? Response.json({ features: { db: true } }) : new Response(null, { status: 202 }),
    );
    await t.flush();
    const all = posts();
    expect(all).toHaveLength(2);
    expect(all[1].events.map((e) => e.kind)).toEqual(["hw.connect"]);
  });

  it("samples flight.sample at 1 Hz and tallies LED blinks into one event", async () => {
    vi.useFakeTimers({ now: Date.parse("2026-10-24T20:00:00Z"), toFake: ["Date"] });
    const t = await fresh(true);
    t.track("flight.sample", { alt: 1 });
    t.track("flight.sample", { alt: 2 });
    vi.setSystemTime(Date.parse("2026-10-24T20:00:01Z"));
    t.track("flight.sample", { alt: 3 });
    t.tally("led.blink", 3);
    t.tally("led.blink", 4);
    await t.flush();
    const [batch] = posts();
    expect(batch.events.filter((e) => e.kind === "flight.sample").map((e) => e.data.alt)).toEqual([1, 3]);
    expect(batch.events.filter((e) => e.kind === "led.blink").map((e) => e.data.count)).toEqual([7]);
  });

  it("sends nothing once usage sharing is unticked, and drops what was queued", async () => {
    const t = await fresh(true);
    const { setSetting } = await import("@/lib/settings/settings");
    t.track("lesson.attempt", { key: "board:uno-r3:lesson:blink" });
    t.tally("led.blink", 2);
    setSetting("telemetry", false);
    t.track("lesson.pass", { key: "board:uno-r3:lesson:blink" });
    t.track("flight.lap", { course: "quad5-gates", timeMs: 12_000 });
    t.tally("led.blink", 5);
    await t.flush();
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    expect(posts()).toHaveLength(0);
    expect(beacons).toHaveLength(0);
    // ticked again: new events go out, the dropped ones never do
    setSetting("telemetry", true);
    t.track("fault", { code: "short-5v" });
    await t.flush();
    expect(posts().flatMap((b) => b.events.map((e) => e.kind))).toEqual(["fault"]);
  });

  it("hands the queue to sendBeacon when the page is hidden", async () => {
    const t = await fresh(true);
    t.track("room.join", { peers: 2 });
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    await vi.waitFor(() => expect(beacons).toHaveLength(1));
    expect(beacons[0].url).toBe("/api/telemetry");
    expect(JSON.parse(beacons[0].body).events[0].kind).toBe("room.join");
  });
});
