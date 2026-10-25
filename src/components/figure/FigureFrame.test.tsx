import { act, fireEvent, render, screen } from "@testing-library/react";
import { Activity, createRef, type ReactNode } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { I18nProvider } from "@/i18n/client";
import en from "@/i18n/messages/en/common.json";
import { FigureFrame } from "./FigureFrame";
import type { FigureHandle, FigureTraffic } from "./protocol";

type Posted = { message: Record<string, unknown>; origin: string };

let posted: Posted[] = [];

function Providers({ children }: { children: ReactNode }) {
  return (
    <I18nProvider locale="en" messages={en.client}>
      {children}
    </I18nProvider>
  );
}

function frameWindow() {
  const frame = document.querySelector("iframe");
  if (!frame?.contentWindow) throw new Error("no iframe window");
  return frame.contentWindow;
}

// Capture what the host posts into the figure's window.
function spyOnFrame() {
  posted = [];
  vi.spyOn(frameWindow(), "postMessage").mockImplementation(((message: Record<string, unknown>, origin: string) => {
    posted.push({ message, origin });
  }) as Window["postMessage"]);
}

function fromFigure(type: string, payload: Record<string, unknown> = {}, init: Partial<MessageEventInit> = {}) {
  act(() => {
    window.dispatchEvent(
      new MessageEvent("message", {
        data: { source: "simlab-figure", v: 1, type, ...payload },
        origin: window.location.origin,
        source: frameWindow(),
        ...init,
      }),
    );
  });
}

const ready = {
  fig: "uno-r3",
  title: "Arduino Uno R3",
  lang: "en",
  buttons: [{ id: "reset", label: "RESET" }],
  switches: [{ id: "xrb", label: "See-through", on: false }],
  acts: ["usb-port"],
  parts: [{ act: "usb-port", id: "usb", label: "USB-B port" }],
};

const types = () => posted.map((entry) => entry.message.type);

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

function mount(extra: Partial<Parameters<typeof FigureFrame>[0]> = {}) {
  const ref = createRef<FigureHandle>();
  const onEvent = vi.fn();
  const view = render(
    <FigureFrame ref={ref} src="/figures/boards/uno-r3.html" title="Arduino Uno R3" initial={{ power: true }} onEvent={onEvent} {...extra} />,
    { wrapper: Providers },
  );
  spyOnFrame();
  return { ref, onEvent, view };
}

test("adds the language to the figure URL for the first paint", () => {
  mount();
  expect(document.querySelector("iframe")?.getAttribute("src")).toBe("/figures/boards/uno-r3.html?lang=en");
  expect(document.querySelector("iframe")?.getAttribute("title")).toBe("Arduino Uno R3");
});

test("queues commands until ready, then restores state and flushes in order", () => {
  const { ref, onEvent } = mount();
  act(() => ref.current?.send("set", { state: { pin13: 1 } }));
  act(() => ref.current?.send("press", { id: "reset" }));
  expect(posted).toEqual([]);
  expect(ref.current?.isReady()).toBe(false);

  fromFigure("ready", ready);
  expect(ref.current?.isReady()).toBe(true);
  expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "ready", fig: "uno-r3" }));
  expect(posted.map((entry) => entry.message)).toEqual([
    { source: "simlab", v: 1, type: "theme", mode: "light" },
    { source: "simlab", v: 1, type: "locale", lang: "en" },
    { source: "simlab", v: 1, type: "labels", on: true },
    { source: "simlab", v: 1, type: "set", state: { power: true, pin13: 1 } },
    { source: "simlab", v: 1, type: "set", state: { pin13: 1 } },
    { source: "simlab", v: 1, type: "press", id: "reset" },
  ]);
  expect(posted.every((entry) => entry.origin === window.location.origin)).toBe(true);

  posted = [];
  act(() => ref.current?.send("view", { yaw: 200, pitch: 40 }));
  expect(posted.map((entry) => entry.message)).toEqual([{ source: "simlab", v: 1, type: "view", yaw: 200, pitch: 40 }]);
});

test("after a reload, replays what the host last set, not the stale initial", () => {
  const { ref } = mount();
  fromFigure("ready", ready);
  act(() => ref.current?.send("set", { state: { power: false, pin13: 1 } }));
  posted = [];
  fromFigure("ready", ready);
  expect(posted.map((entry) => entry.message)).toContainEqual({
    source: "simlab",
    v: 1,
    type: "set",
    state: { power: false, pin13: 1 },
  });
});

test("ignores messages from other windows, other origins and other protocols", () => {
  const { ref, onEvent } = mount();
  fromFigure("ready", ready, { source: window });
  fromFigure("ready", ready, { origin: "https://evil.example" });
  act(() => {
    window.dispatchEvent(
      new MessageEvent("message", { data: { source: "probe", v: 1, type: "ready" }, origin: window.location.origin, source: frameWindow() }),
    );
  });
  expect(onEvent).not.toHaveBeenCalled();
  expect(ref.current?.isReady()).toBe(false);
});

test("passes every figure message to onEvent as { type, ...payload }", () => {
  const { onEvent } = mount();
  fromFigure("ready", ready);
  fromFigure("part", { act: "usb-port", id: "usb", data: { kind: "usb-b" } });
  fromFigure("state", { state: { pin13: 1 }, changed: ["pin13"] });
  expect(onEvent.mock.calls.map(([event]) => event)).toEqual([
    expect.objectContaining({ type: "ready" }),
    { type: "part", act: "usb-port", id: "usb", data: { kind: "usb-b" }, by: "user" },
    { type: "state", state: { pin13: 1 }, changed: ["pin13"] },
  ]);
});

test("lists the figure's buttons, switches and parts as real buttons", () => {
  mount();
  expect(screen.queryByRole("button", { name: "RESET" })).toBeNull();
  fromFigure("ready", ready);
  posted = [];
  fireEvent.click(screen.getByRole("button", { name: "RESET" }));
  expect(screen.getByRole("button", { name: "See-through" }).getAttribute("aria-pressed")).toBe("false");
  fireEvent.click(screen.getByRole("button", { name: "See-through" }));
  fireEvent.click(screen.getByRole("button", { name: "USB-B port" }));
  expect(posted.map((entry) => entry.message)).toEqual([
    { source: "simlab", v: 1, type: "press", id: "reset" },
    { source: "simlab", v: 1, type: "press", id: "xrb" },
    { source: "simlab", v: 1, type: "act", name: "usb-port", data: { id: "usb" } },
  ]);

  // A state report with new parts updates the list.
  fromFigure("state", { state: { step: 2 }, changed: ["step"], parts: [{ act: "dip", id: "u1", label: "DIP socket" }] });
  expect(screen.queryByRole("button", { name: "USB-B port" })).toBeNull();
  expect(screen.getByRole("button", { name: "DIP socket" })).toBeTruthy();
});

test("passes sound effects and custom events on, and sends custom commands", () => {
  const { ref, onEvent } = mount();
  fromFigure("ready", ready);
  fromFigure("sfx", { name: "solder" });
  fromFigure("motor", { rpm: 1200 });
  expect(onEvent).toHaveBeenCalledWith({ type: "sfx", name: "solder" });
  expect(onEvent).toHaveBeenCalledWith({ type: "custom", name: "motor", payload: { rpm: 1200 } });
  posted = [];
  act(() => ref.current?.sendCustom("bump", { by: 2 }));
  expect(posted.map((entry) => entry.message)).toEqual([{ source: "simlab", v: 1, type: "bump", by: 2 }]);
});

test("does not report the bridge's answer to pause and resume as a figure error", () => {
  const { onEvent } = mount();
  fromFigure("error", { message: 'unknown message "pause"' });
  fromFigure("error", { message: 'no act "ghost"' });
  expect(onEvent.mock.calls.map(([event]) => event)).toEqual([{ type: "error", message: 'no act "ghost"' }]);
});

test("forwards theme and labels changes to a ready figure", async () => {
  const { setSetting } = await import("@/lib/settings/settings");
  mount();
  fromFigure("ready", ready);
  posted = [];
  act(() => setSetting("theme", "dark"));
  act(() => setSetting("labels", false));
  expect(posted.map((entry) => entry.message)).toEqual([
    { source: "simlab", v: 1, type: "theme", mode: "dark" },
    { source: "simlab", v: 1, type: "labels", on: false },
  ]);
});

test("pauses when Activity hides it, then resumes and says hello on show", () => {
  const ref = createRef<FigureHandle>();
  const page = (mode: "visible" | "hidden") => (
    <Providers>
      <Activity mode={mode}>
        <FigureFrame ref={ref} src="/figures/boards/uno-r3.html" title="Arduino Uno R3" />
      </Activity>
    </Providers>
  );
  const view = render(page("visible"));
  spyOnFrame();
  fromFigure("ready", ready);
  posted = [];

  view.rerender(page("hidden"));
  expect(types()).toEqual(["pause"]);

  posted = [];
  view.rerender(page("visible"));
  expect(types()).toEqual(["resume", "hello"]);
  expect(ref.current?.isReady()).toBe(false);

  // Until the figure answers, commands wait.
  posted = [];
  act(() => ref.current?.send("press", { id: "reset" }));
  expect(posted).toEqual([]);
  fromFigure("ready", ready);
  expect(types()).toEqual(["theme", "locale", "labels", "press"]);
});

test("observe() sees the traffic in both directions", () => {
  const { ref } = mount();
  const seen: FigureTraffic[] = [];
  const stop = ref.current!.observe((traffic) => seen.push(traffic));
  fromFigure("ready", ready);
  act(() => ref.current?.send("act", { name: "usb-port" }));
  stop();
  act(() => ref.current?.send("act", { name: "usb-port" }));
  const summary = seen.map((traffic) => `${traffic.dir}:${traffic.message.type}`);
  expect(summary).toEqual(["in:ready", "out:theme", "out:locale", "out:labels", "out:set", "out:act"]);
});

test("shows the plate with the figure's name while it loads, reloads a silent figure once, then says it failed", () => {
  vi.useFakeTimers();
  try {
    mount();
    const status = () => screen.getByRole("status");
    expect(status().textContent).toBe(en.client.figure.loading);
    expect(screen.getByText("Arduino Uno R3")).toBeTruthy();

    const first = document.querySelector("iframe")!;
    fireEvent.load(first);
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    const second = document.querySelector("iframe")!;
    expect(second).not.toBe(first);
    expect(status().textContent).toBe(en.client.figure.loading);

    fireEvent.load(second);
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(document.querySelector("iframe")).toBe(second);
    expect(status().textContent).toBe(en.client.figure.failed);

    fromFigure("ready", ready);
    expect(status().textContent).toBe("");
    expect(screen.queryByText(en.client.figure.loading)).toBeNull();
  } finally {
    vi.useRealTimers();
  }
});
