import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LabStore } from "@/components/dock/types";
import common from "@/i18n/messages/en/common.json";
import { I18nProvider } from "@/i18n/client";
import { removeAllKeys, setKey } from "@/lib/keys/store";
import { VideoHelp } from "./VideoHelp";

const store: LabStore = { getState: () => null, subscribe: () => () => undefined, dispatch: () => undefined };

function server(search: boolean) {
  return vi.fn(async (input: string | URL | Request) => {
    const path = String(input);
    if (path === "/config.json") return Response.json({ server: null, protocol: 1, modules: { ai: false, search, voice: false } });
    if (path === "/api/search/videos") return Response.json({ videos: [] });
    return new Response("not found", { status: 404 });
  });
}

const searchCalls = (fetchMock: ReturnType<typeof server>) => fetchMock.mock.calls.filter(([path]) => String(path).startsWith("/api/search"));

const renderPanel = () =>
  render(
    <I18nProvider locale="en" messages={common.client}>
      <VideoHelp lab="robotics" itemId="l298n" store={store} figure={null} />
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

describe("VideoHelp", () => {
  it("shows the suggested query but sends nothing until Find videos is pressed", async () => {
    setKey("search", "iynk-canary-SEARCH-0001-do-not-use");
    const fetchMock = server(true);
    vi.stubGlobal("fetch", fetchMock);
    renderPanel();

    const box = (await screen.findByRole("searchbox", { name: "Search videos" })) as HTMLInputElement;
    expect(box.value).toBe("L298N motor driver Arduino tutorial");
    expect(searchCalls(fetchMock)).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "Find videos" }));
    await waitFor(() => expect(searchCalls(fetchMock)).toHaveLength(1));
    expect(await screen.findByText("No videos found. Try other words.")).toBeTruthy();

    fireEvent.change(box, { target: { value: "l298n wiring" } });
    expect(searchCalls(fetchMock)).toHaveLength(1);
  });

  it("with no search key shows the needs-key box and makes no search request", async () => {
    const fetchMock = server(true);
    vi.stubGlobal("fetch", fetchMock);
    renderPanel();

    expect((await screen.findByTestId("not-set-up")).getAttribute("data-reason")).toBe("needs_key");
    expect(screen.queryByRole("button", { name: "Find videos" })).toBeNull();
    expect(searchCalls(fetchMock)).toHaveLength(0);
  });
});
