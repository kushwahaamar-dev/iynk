import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { FigureEvent } from "@/components/figure/protocol";
import { createBoardLabStore, initialState } from "@/lib/boardlab/store";
import type { RoomClient } from "@/lib/realtime/room";
import { attachStore } from "@/lib/realtime/store-sync";
import { boardMoments } from "./moments";

const calls = vi.hoisted(() => ({ played: [] as string[], tracked: [] as [string, unknown][] }));

vi.mock("./index", () => ({
  playSound: (name: string) => calls.played.push(name),
  setTone: () => {},
  silence: () => {},
}));

vi.mock("@/lib/telemetry", () => ({
  track: (kind: string, data: unknown) => calls.tracked.push([kind, data]),
}));

import { useFigureSound, useLabMoments } from "./react";

beforeEach(() => {
  calls.played = [];
  calls.tracked = [];
});

const state = (n: number, name: string): FigureEvent => ({ type: "state", state: { sfx: { n, name } }, changed: ["sfx"] });

describe("useFigureSound", () => {
  test("a drone figure's sfx count plays each rise, not what it held when it loaded", () => {
    const { result } = renderHook(() => useFigureSound());
    const on = result.current;
    on({ type: "ready", fig: "x", title: "x", lang: "en", buttons: [], switches: [], acts: [], parts: [], pals: [], state: { sfx: { n: 4, name: "ding" } } });
    on(state(4, "ding"));
    on(state(5, "whoosh"));
    on(state(5, "whoosh"));
    on(state(7, "place"));
    expect(calls.played).toEqual(["whoosh", "place"]);
  });

  test("a bench figure's sfx events play, and its state counts are then ignored", () => {
    const { result } = renderHook(() => useFigureSound());
    const on = result.current;
    on(state(0, "pop"));
    on({ type: "sfx", name: "plug" });
    on(state(1, "plug"));
    on({ type: "sfx", name: "click" });
    expect(calls.played).toEqual(["plug", "click"]);
  });
});

function boardStore() {
  return createBoardLabStore(initialState({ board: "uno-r3", lesson: "blink", language: "arduino-cpp", template: "void loop() {}\n", params: [], inputs: {}, view: "board" }));
}

describe("useLabMoments", () => {
  test("a check run sounds and counts", () => {
    const store = boardStore();
    const { unmount } = renderHook(() => useLabMoments(store, boardMoments, "uno-r3"));
    act(() => {
      store.dispatch({ type: "checks/start" });
      store.dispatch({ type: "checks/result", results: [{ ok: true }] });
      store.dispatch({ type: "fault/trigger", id: "short-5v" });
    });
    const key = "board:uno-r3:lesson:blink";
    expect(calls.tracked).toEqual([
      ["lesson.attempt", { key }],
      ["lesson.pass", { key }],
      ["fault", { code: "short-5v" }],
    ]);
    expect(calls.played).toEqual(["pass"]);
    unmount();
  });

  test("a build step with a progress key is counted; a board assembly step (no key) is not", () => {
    const store = boardStore();
    const steps = () => [
      { kind: "step" as const, key: "robotics:tb6612fng:step:wire-stby" },
      { kind: "step" as const, key: null },
    ];
    renderHook(() => useLabMoments(store, steps, "tb6612fng"));
    act(() => store.dispatch({ type: "fault/trigger", id: "short-5v" }));
    expect(calls.tracked).toEqual([["step.done", { key: "robotics:tb6612fng:step:wire-stby" }]]);
    expect(calls.played).toEqual(["step", "step"]);
  });

  test("a room joiner taking the host's snapshot is not a new fault or step", () => {
    const store = boardStore();
    let target: { hydrate(snapshot: unknown): void } | null = null;
    const room = {
      bind: (next: typeof target) => (target = next),
      beforeBatonPass: () => () => {},
      getState: () => ({ you: { id: "me" }, batonHolder: "host" }),
      holdsBaton: () => false,
    } as unknown as RoomClient;
    const detach = attachStore(store, "board", room, { scope: "/boards/uno-r3/blink" });
    renderHook(() => useLabMoments(store, boardMoments, "uno-r3"));
    const host = { ...store.getState(), fault: "short-5v", assembly: ["usb"] };
    act(() => target!.hydrate({ scope: "/boards/uno-r3/blink", state: JSON.parse(JSON.stringify(host)) }));
    expect(store.getState().fault).toBe("short-5v");
    expect(calls.tracked).toEqual([]);
    expect(calls.played).toEqual([]);
    detach();
  });
});
