import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LabStore } from "@/components/dock/types";
import type { DesignPick, DroneContent, DroneDesign } from "@/content/schema";
import common from "@/i18n/messages/en/common.json";
import { I18nProvider } from "@/i18n/client";
import { removeAllKeys, setKey } from "@/lib/keys/store";
import { bindSearchServer } from "@/lib/search/client";
import type { Offer, PartOffers } from "@/lib/search/types";

const features = vi.hoisted(() => ({ search: true }));

vi.mock("@/lib/features", () => ({
  useFeatures: () => ({ status: "ready", features: { ai: false, search: features.search, hw: false } }),
  reloadFeatures: () => undefined,
}));

const design: DroneDesign = {
  model: {
    motors: 4,
    thrust: { kind: "krpm", k: 1.06, maxGPerW: 2 },
    flight: { kind: "multirotor", gPerW: 5.4, flyFactor: 0.42 },
    usable: 0.8,
    minTW: 5,
    over: { kind: "kvCells", max: 1750 * 6 * 1.15 },
    propPrice: "pair",
  },
  fixed: [{ id: "FRAME", g: 118, price: 39, category: "Mechanical", name: "parts.FRAME.name" }],
  batts: {
    "6s1100": { cells: 6, mah: 1100, g: 178, price: 38, label: "6S 1100 mAh LiPo" },
    "4s1500": { cells: 4, mah: 1500, g: 182, price: 30, label: "4S 1500 mAh LiPo" },
  },
  motors: {
    "2306-1750": { kv: 1750, g: 32, price: 22, label: "2306 1750KV" },
    "2306-2450": { kv: 2450, g: 31, price: 20, label: "2306 2450KV (4S)" },
  },
  props: { "5x4.3x3": { pf: 1, eff: 1, g: 4.4, price: 4, label: "5x4.3x3 tri-blade" } },
  default: { batt: "6s1100", motor: "2306-1750", prop: "5x4.3x3" },
  golden: [],
};

vi.mock("@/content/index.generated", () => ({
  loadDrone: async (id: string) => (id === "quad5" ? ({ design } as unknown as DroneContent) : null),
}));

import { RealBuildPanel } from "./RealBuildPanel";

const offer = (title: string, price: number, extra: Partial<Offer> = {}): Offer => ({
  source: "google_shopping",
  title,
  price,
  currency: "USD",
  url: `https://shop.example/${encodeURIComponent(title)}`,
  ...extra,
});

/** The fake server the search client calls with its token; offers answer per key from `prices`. */
function server(prices: Record<string, PartOffers["offers"]>) {
  return vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const path = String(input);
    if (path === "/search/offers") {
      const body = JSON.parse(String(init?.body)) as { parts: { key: string }[] };
      return Response.json({
        parts: body.parts.map((p) => (prices[p.key] ? { key: p.key, offers: prices[p.key], best: 0 } : { key: p.key, offers: [] })),
        fetchedAt: "2026-10-24T19:30:00.000Z",
      });
    }
    return new Response("not found", { status: 404 });
  });
}

function storeOf(pick: DesignPick | null) {
  let state = { pick };
  const listeners = new Set<() => void>();
  const dispatch = vi.fn((action: { type: string; key?: keyof DesignPick; value?: string }) => {
    if (action.type === "design/pick" && state.pick && action.key && action.value) {
      state = { pick: { ...state.pick, [action.key]: action.value } };
      for (const l of listeners) l();
    }
  });
  const store: LabStore = { getState: () => state, subscribe: (l) => (listeners.add(l), () => listeners.delete(l)), dispatch };
  return { store, dispatch };
}

const renderPanel = (props: Parameters<typeof RealBuildPanel>[0]) =>
  render(
    <I18nProvider locale="en" messages={common.client}>
      <RealBuildPanel {...props} />
    </I18nProvider>,
  );

beforeEach(() => {
  features.search = true;
  localStorage.clear();
  setKey("search", "iynk-canary-SEARCH-0001-do-not-use");
  bindSearchServer({ fetchAuthed: server({}) });
});
afterEach(() => {
  removeAllKeys();
  localStorage.clear();
  vi.unstubAllGlobals();
  bindSearchServer(null);
});

describe("RealBuildPanel", () => {
  it("prices a robotics bench and adds up the cheapest total", async () => {
    bindSearchServer({ fetchAuthed: server({
        "board:nano": [offer("Arduino Nano", 24.9, { inStock: true })],
        "part:l298n": [offer("L298N motor driver 2pcs", 7, { pack: 2 }), offer("L298N driver", 9)],
        "part:tt-motor": [offer("TT gear motor", 3)],
      }) });
    const { store } = storeOf(null);
    renderPanel({ lab: "robotics", itemId: "l298n", store, figure: null });

    expect(await screen.findByRole("region", { name: "Build it for real" })).toBeTruthy();
    fireEvent.click(await screen.findByRole("button", { name: "Check prices" }));
    await screen.findAllByText("Arduino Nano");
    await waitFor(() => expect(screen.getByText(/Prices checked at/)).toBeTruthy());
    // Nano 24.90 + L298N 7.00 + TT motor 3.00; the other parts have no listing and no price.
    expect(screen.getByText("$34.90")).toBeTruthy();
    expect(screen.getByText(/parts have no price yet/)).toBeTruthy();
    expect(screen.getAllByText("In stock")).toHaveLength(1);

    const toggle = screen.getByRole("button", { name: "Show 2 offers" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    const list = screen.getByRole("list", { name: "Offers for L298N motor driver" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: /View at Google Shopping/ })).toHaveLength(3);
  });

  it("runs the optimiser on a drone and applies the pick to the lab", async () => {
    bindSearchServer({ fetchAuthed: server({
        "fixed:FRAME": [offer("5 inch frame", 40)],
        "batt:6s1100": [offer("6S 1100mAh LiPo", 40)],
        "batt:4s1500": [offer("4S 1500mAh LiPo", 25)],
        "motor:2306-1750": [offer("2306 1750KV 4pcs", 90, { pack: 4 })],
        "motor:2306-2450": [offer("2306 2450KV 4pcs", 60, { pack: 4 })],
        "prop:5x4.3x3": [offer("5x4.3x3 props 4pcs", 5, { pack: 4 })],
      }) });
    const { store, dispatch } = storeOf(design.default);
    renderPanel({ lab: "drone", itemId: "quad5", store, figure: null });

    expect(await screen.findByRole("heading", { name: "Budget optimiser" })).toBeTruthy();
    fireEvent.click(await screen.findByRole("button", { name: "Check prices" }));
    await waitFor(() => expect(screen.getByText(/Prices checked at/)).toBeTruthy());
    // 40 + 40 + 90 + one set of 4 props at 5.
    expect(screen.getAllByText("$175.00").length).toBeGreaterThan(0);

    const slider = screen.getByRole("slider", { name: "Budget" });
    act(() => {
      fireEvent.change(slider, { target: { value: "130" } });
    });
    expect(await screen.findByText("Best build within $130")).toBeTruthy();
    expect(screen.getByText("Battery: 6S 1100 mAh LiPo → 4S 1500 mAh LiPo")).toBeTruthy();
    expect(screen.getByText("Motors: 2306 1750KV → 2306 2450KV (4S)")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Use this build in the lab" }));
    expect(dispatch).toHaveBeenCalledWith({ type: "design/pick", key: "batt", value: "4s1500" });
    expect(dispatch).toHaveBeenCalledWith({ type: "design/pick", key: "motor", value: "2306-2450" });
    expect(await screen.findByText("The lab now uses this build.")).toBeTruthy();
  });

  it("with search off, lists a bench's parts without prices and sums a drone at catalogue prices", async () => {
    features.search = false;
    vi.resetModules();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) =>
        String(input) === "/config.json" ? Response.json({ server: null, protocol: 1 }) : new Response("not found", { status: 404 }),
      ),
    );
    const { RealBuildPanel: Panel } = await import("./RealBuildPanel");
    const { I18nProvider: Provider } = await import("@/i18n/client");
    const show = (props: Parameters<typeof Panel>[0]) =>
      render(
        <Provider locale="en" messages={common.client}>
          <Panel {...props} />
        </Provider>,
      );

    const bench = show({ lab: "robotics", itemId: "l298n", store: storeOf(null).store, figure: null });
    expect((await screen.findByTestId("not-set-up")).getAttribute("data-reason")).toBe("server_off");
    expect(screen.queryByRole("button", { name: "Check prices" })).toBeNull();
    expect((await screen.findAllByText("Arduino Nano")).length).toBeGreaterThan(0);
    expect(screen.queryByText("$0.00")).toBeNull();
    expect(screen.queryByText("No listing found")).toBeNull();
    expect(screen.queryByText("Cheapest total")).toBeNull();
    bench.unmount();

    show({ lab: "drone", itemId: "quad5", store: storeOf(design.default).store, figure: null });
    expect(await screen.findByText("Catalogue total")).toBeTruthy();
    expect(screen.queryByText("Cheapest total")).toBeNull();
    expect(screen.queryByText("Catalogue price")).toBeNull();
    expect(screen.queryByText(/from US stores/)).toBeNull();
  });

  it("asks for no prices until Check prices is pressed, then again on each later press", async () => {
    const fetchMock = server({ "board:nano": [offer("Arduino Nano", 24.9)] });
    bindSearchServer({ fetchAuthed: fetchMock });
    const offerCalls = () => fetchMock.mock.calls.filter(([path]) => String(path) === "/search/offers").length;
    renderPanel({ lab: "robotics", itemId: "l298n", store: storeOf(null).store, figure: null });

    const check = await screen.findByRole("button", { name: "Check prices" });
    await screen.findAllByText("Arduino Nano");
    expect(offerCalls()).toBe(0);
    expect(screen.queryByText("$0.00")).toBeNull();

    fireEvent.click(check);
    await waitFor(() => expect(offerCalls()).toBeGreaterThan(0));
    await waitFor(() => expect(screen.getByText(/Prices checked at/)).toBeTruthy());
    const afterFirst = offerCalls();

    fireEvent.click(screen.getByRole("button", { name: "Check prices again" }));
    await waitFor(() => expect(offerCalls()).toBeGreaterThan(afterFirst));
  });

  it("with no search key shows the needs-key box and makes no search request", async () => {
    removeAllKeys();
    const fetchMock = server({});
    bindSearchServer({ fetchAuthed: fetchMock });
    renderPanel({ lab: "robotics", itemId: "l298n", store: storeOf(null).store, figure: null });

    const box = await screen.findByTestId("not-set-up");
    expect(box.getAttribute("data-reason")).toBe("needs_key");
    expect(screen.queryByRole("button", { name: "Check prices" })).toBeNull();
    expect((await screen.findAllByText("Arduino Nano")).length).toBeGreaterThan(0);
    expect(fetchMock.mock.calls.some(([path]) => String(path).startsWith("/search"))).toBe(false);
  });

  it("says when an item's parts list isn't published", async () => {
    const { store } = storeOf(null);
    renderPanel({ lab: "drone", itemId: "octo", store, figure: null });
    expect(await screen.findByText("This item's parts list isn't published yet.")).toBeTruthy();
  });
});
