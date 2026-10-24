import { describe, expect, test } from "vitest";
import { envelope, parseFigureMessage } from "./protocol";
import { CommandQueue } from "./queue";

const from = (type: string, payload: Record<string, unknown> = {}) => ({ source: "simlab-figure", v: 1, type, ...payload });

describe("parseFigureMessage", () => {
  test("reads a ready message and normalises its parts", () => {
    expect(
      parseFigureMessage(
        from("ready", {
          fig: "uno-r3",
          title: "Arduino Uno R3",
          lang: "en",
          buttons: [{ id: "reset", label: "RESET", en: "RESET" }, { id: "" }, { label: "no id" }, { id: "usb", picker: true }],
          switches: [{ id: "xrb", label: "See-through", on: false }, { label: "x" }],
          acts: ["usb-port", 7],
          parts: [{ act: "usb-port", id: "usb", label: "USB-B port", en: "USB-B port" }, { act: "reset", id: null }, { id: "x" }],
          pals: ["mustard", "tomato"],
          view: { yaw: 30, pitch: 20 },
          embedded: true,
        }),
      ),
    ).toEqual({
      type: "ready",
      fig: "uno-r3",
      title: "Arduino Uno R3",
      lang: "en",
      buttons: [
        { id: "reset", label: "RESET", en: "RESET", picker: false },
        { id: "usb", label: "usb", picker: true },
      ],
      switches: [{ id: "xrb", label: "See-through", on: false }],
      acts: ["usb-port"],
      parts: [
        { act: "usb-port", id: "usb", label: "USB-B port", en: "USB-B port" },
        { act: "reset", id: null, label: "reset" },
      ],
      pals: ["mustard", "tomato"],
      view: { yaw: 30, pitch: 20 },
      embedded: true,
    });
  });

  test("reads the other figure messages", () => {
    expect(parseFigureMessage(from("part", { act: "pin", id: "d13", data: { pin: 13 }, by: "host" }))).toEqual({
      type: "part",
      act: "pin",
      id: "d13",
      data: { pin: "13" },
      by: "host",
    });
    expect(parseFigureMessage(from("button", { id: "xrb", on: true }))).toEqual({ type: "button", id: "xrb", on: true, by: "user" });
    expect(parseFigureMessage(from("sfx", { name: "click" }))).toEqual({ type: "sfx", name: "click" });
    expect(parseFigureMessage(from("motor", { rpm: 1200 }))).toEqual({ type: "custom", name: "motor", payload: { rpm: 1200 } });
    expect(parseFigureMessage(from("state", { state: { power: true, pin13: 1 }, changed: ["pin13"] }))).toEqual({
      type: "state",
      state: { power: true, pin13: 1 },
      changed: ["pin13"],
    });
    expect(parseFigureMessage(from("labels", { items: [{ n: 1, text: "USB-B", on: true }, { text: "no n" }] }))).toEqual({
      type: "labels",
      items: [{ n: 1, text: "USB-B", on: true }],
    });
    expect(parseFigureMessage(from("focus", { on: true }))).toEqual({ type: "focus", on: true });
    expect(parseFigureMessage(from("flash", { text: "Polarity reversed", en: "Polarity reversed" }))).toEqual({
      type: "flash",
      text: "Polarity reversed",
      en: "Polarity reversed",
    });
    expect(parseFigureMessage(from("error", { message: "unknown id nope" }))).toEqual({ type: "error", message: "unknown id nope" });
  });

  test("rejects anything that is not this protocol", () => {
    expect(parseFigureMessage(null)).toBeNull();
    expect(parseFigureMessage("ready")).toBeNull();
    expect(parseFigureMessage({ source: "probe", v: 1, type: "ready" })).toBeNull();
    expect(parseFigureMessage({ source: "simlab-figure", v: 2, type: "ready" })).toBeNull();
    expect(parseFigureMessage(from("custom", { name: "spoof" }))).toBeNull();
    expect(parseFigureMessage(from("sfx"))).toBeNull();
    expect(parseFigureMessage(from("part"))).toBeNull();
    expect(parseFigureMessage(from("state", { state: "on" }))).toBeNull();
    expect(parseFigureMessage(from("focus", { on: "yes" }))).toBeNull();
  });
});

test("envelope stamps the host source and version", () => {
  expect(envelope({ type: "press", id: "reset" })).toEqual({ source: "simlab", v: 1, type: "press", id: "reset" });
  // A custom command goes out under its own name; its payload cannot override the envelope.
  expect(envelope({ type: "custom", name: "bump", payload: { by: 2, type: "x", source: "y" } })).toEqual({
    source: "simlab",
    v: 1,
    type: "bump",
    by: 2,
  });
});

describe("CommandQueue", () => {
  test("merges a run of set patches and keeps the latest setting", () => {
    const queue = new CommandQueue();
    queue.push({ type: "hello" });
    queue.push({ type: "set", state: { pin13: 1 } });
    queue.push({ type: "set", state: { pin13: 0, power: true } });
    queue.push({ type: "theme", mode: "light" });
    queue.push({ type: "theme", mode: "dark" });
    queue.push({ type: "press", id: "reset" });
    queue.push({ type: "press", id: "reset" });
    queue.push({ type: "set", state: { pin13: 1 } });
    expect(queue.drain()).toEqual([
      { type: "set", state: { pin13: 0, power: true } },
      { type: "theme", mode: "dark" },
      { type: "press", id: "reset" },
      { type: "press", id: "reset" },
      { type: "set", state: { pin13: 1 } },
    ]);
    expect(queue.size).toBe(0);
  });

  test("drops the oldest commands past its limit", () => {
    const queue = new CommandQueue(3);
    for (const id of ["a", "b", "c", "d"]) queue.push({ type: "press", id });
    expect(queue.drain().map((command) => (command.type === "press" ? command.id : ""))).toEqual(["b", "c", "d"]);
  });
});
