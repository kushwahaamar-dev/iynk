import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import common from "@/i18n/messages/en/common.json";
import type { LeaderboardResponse, LiveResponse } from "@/lib/telemetry/responses";
import en from "./messages/en.json";

type Routes = Record<string, () => Response>;
const fetchMock = vi.fn<typeof fetch>();

function serve(routes: Routes) {
  fetchMock.mockImplementation(async (input) => {
    const path = String(input).split("?")[0];
    const route = routes[path];
    if (!route) throw new Error(`unexpected ${path}`);
    return route();
  });
}

// Fresh modules per test: the features hook and the telemetry client keep page-level state.
async function mount(node: "board" | "live") {
  vi.resetModules();
  const { I18nProvider } = await import("@/i18n/client");
  const { Leaderboard, LiveCounter } = await import("./index");
  return render(
    <I18nProvider locale="en" messages={common.client}>
      {node === "board" ? (
        <Leaderboard course="quad5-bando" courseLabel="Bando" messages={en.leaderboard} limit={3} />
      ) : (
        <LiveCounter messages={en.live} />
      )}
    </I18nProvider>,
  );
}

const status = (db: boolean) => () => Response.json({ features: { db } });

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  localStorage.clear();
});
afterEach(() => vi.unstubAllGlobals());

describe("Leaderboard", () => {
  const board: LeaderboardResponse = {
    course: "quad5-bando",
    rows: [
      { rank: 1, name: "Ada", timeMs: 41_002, laps: 4, you: false },
      { rank: 2, name: null, timeMs: 43_500, laps: 1, you: false },
      { rank: 3, name: "Grace", timeMs: 44_000, laps: 2, you: false },
    ],
    you: { rank: 7, name: "Me", timeMs: 51_250, laps: 3, you: true },
    pilots: 9,
    updatedAt: "2026-10-24T20:00:00.000Z",
  };

  it("shows the top rows and the pilot's own place below them", async () => {
    serve({ "/api/status": status(true), "/api/leaderboard": () => Response.json(board) });
    await mount("board");
    expect(await screen.findByText("Ada")).toBeTruthy();
    expect(screen.getByText("Anonymous pilot")).toBeTruthy();
    expect(screen.getByText("41.002s")).toBeTruthy();
    const own = screen.getByText("Me").closest("tr");
    expect(own?.getAttribute("aria-current")).toBe("true");
    expect(screen.getByText("Your rank: #7")).toBeTruthy();
    expect(screen.getByText("9 pilots on the board")).toBeTruthy();
    const url = String(fetchMock.mock.calls.find(([u]) => String(u).startsWith("/api/leaderboard"))?.[0]);
    expect(url).toContain("course=quad5-bando");
    expect(url).not.toContain("session=");
  });

  it("has a real empty state", async () => {
    serve({ "/api/status": status(true), "/api/leaderboard": () => Response.json({ ...board, rows: [], you: null, pilots: 0 }) });
    await mount("board");
    expect(await screen.findByText(en.leaderboard.empty)).toBeTruthy();
  });

  it("says when the deployment has no database, without asking for the board", async () => {
    serve({ "/api/status": status(false) });
    await mount("board");
    expect(await screen.findByText(en.leaderboard.offTitle)).toBeTruthy();
    expect(fetchMock.mock.calls.some(([u]) => String(u).startsWith("/api/leaderboard"))).toBe(false);
  });

  it("shows an error with a retry that recovers", async () => {
    let fail = true;
    serve({
      "/api/status": status(true),
      "/api/leaderboard": () => (fail ? new Response(null, { status: 502 }) : Response.json(board)),
    });
    await mount("board");
    const retry = await screen.findByRole("button", { name: en.leaderboard.retry });
    fail = false;
    retry.click();
    expect(await screen.findByText("Ada")).toBeTruthy();
  });
});

describe("LiveCounter", () => {
  const live: LiveResponse = {
    windowMinutes: 60,
    builders: 23,
    ledsBlinked: 1204,
    dronesFlown: 1,
    lessonsPassed: 4,
    events: 900,
    perMinute: Array.from({ length: 60 }, (_, i) => i % 7),
    updatedAt: "2026-10-24T20:00:00.000Z",
  };

  it("shows the three counters with plural labels and the activity strip", async () => {
    serve({ "/api/status": status(true), "/api/live": () => Response.json(live) });
    await mount("live");
    expect(await screen.findByText("23")).toBeTruthy();
    expect(screen.getByText("builders")).toBeTruthy();
    expect(screen.getByText("1,204")).toBeTruthy();
    expect(screen.getByText("drone flown")).toBeTruthy();
    expect(screen.getByRole("img", { name: en.live.chart })).toBeTruthy();
  });

  it("invites the first builder when the hour is quiet", async () => {
    serve({ "/api/status": status(true), "/api/live": () => Response.json({ ...live, builders: 0, ledsBlinked: 0, dronesFlown: 0, events: 0 }) });
    await mount("live");
    expect(await screen.findByText(en.live.quiet)).toBeTruthy();
  });

  it("treats a 503 from the route as not set up", async () => {
    serve({ "/api/status": status(true), "/api/live": () => new Response(null, { status: 503 }) });
    await mount("live");
    expect(await screen.findByText(en.live.offTitle)).toBeTruthy();
  });

  it("shows an error when the status check fails", async () => {
    serve({ "/api/status": () => new Response(null, { status: 500 }) });
    await mount("live");
    await waitFor(() => expect(screen.getByText(en.live.error)).toBeTruthy());
  });
});
