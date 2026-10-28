import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LabStore } from "@/components/dock/types";
import common from "@/i18n/messages/en/common.json";
import { I18nProvider } from "@/i18n/client";
import { removeAllKeys, setKey } from "@/lib/keys/store";
import { NearbyPanel } from "./NearbyPanel";

const store: LabStore = { getState: () => null, subscribe: () => () => undefined, dispatch: () => undefined };

function server() {
  return vi.fn(async (input: string | URL | Request) => {
    const path = String(input);
    if (path === "/config.json") return Response.json({ server: null, protocol: 1, modules: { ai: false, search: true, voice: false } });
    if (path === "/api/search/nearby") return Response.json({ places: [] });
    if (path === "/api/search/events") return Response.json({ events: [] });
    return new Response("not found", { status: 404 });
  });
}

const callsTo = (fetchMock: ReturnType<typeof server>, path: string) => fetchMock.mock.calls.filter(([url]) => String(url) === path).length;

const renderPanel = () =>
  render(
    <I18nProvider locale="en" messages={common.client}>
      <NearbyPanel lab="robotics" itemId="l298n" store={store} figure={null} />
    </I18nProvider>,
  );

beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  removeAllKeys();
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe("NearbyPanel", () => {
  it("searches places on submit and loads events only when Find events is pressed", async () => {
    setKey("search", "iynk-canary-SEARCH-0001-do-not-use");
    const fetchMock = server();
    vi.stubGlobal("fetch", fetchMock);
    renderPanel();

    const place = await screen.findByRole("textbox", { name: "City or address" });
    expect(callsTo(fetchMock, "/api/search/nearby")).toBe(0);

    fireEvent.change(place, { target: { value: "Austin, TX" } });
    expect(callsTo(fetchMock, "/api/search/nearby")).toBe(0);
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    await waitFor(() => expect(callsTo(fetchMock, "/api/search/nearby")).toBe(1));

    const find = await screen.findByRole("button", { name: "Find events" });
    expect(callsTo(fetchMock, "/api/search/events")).toBe(0);
    fireEvent.click(find);
    await waitFor(() => expect(callsTo(fetchMock, "/api/search/events")).toBe(1));
    expect(await screen.findByText("No upcoming maker events found near Austin, TX.")).toBeTruthy();
  });

  it("with no search key shows the needs-key box and makes no search request", async () => {
    const fetchMock = server();
    vi.stubGlobal("fetch", fetchMock);
    renderPanel();

    expect((await screen.findByTestId("not-set-up")).getAttribute("data-reason")).toBe("needs_key");
    expect(screen.queryByRole("textbox", { name: "City or address" })).toBeNull();
    expect(callsTo(fetchMock, "/api/search/nearby") + callsTo(fetchMock, "/api/search/events")).toBe(0);
  });
});
