import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { setSetting } from "@/lib/settings/settings";
import { FakeAudioContext, fakeContext } from "./__fixtures__/fake-audio";
import { SoundEngine } from "./engine";
import { CUE_SOUNDS, FIGURE_SOUNDS, playSound, setTone, silence } from "./index";

// The page's engine is made once and kept, like in the app; these read the newest context.
const latest = () => FakeAudioContext.made.at(-1)!;

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("AudioContext", FakeAudioContext);
});

afterEach(() => {
  silence();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("the sound setting", () => {
  test("is off by default: nothing is made or played", () => {
    const made = FakeAudioContext.made.length;
    playSound("ding");
    setTone("pin:D8", 440);
    expect(FakeAudioContext.made).toHaveLength(made);
  });

  test("on, a figure's sound plays; a name SimLab doesn't know is ignored", () => {
    setSetting("sound", true);
    playSound("ding");
    const ctx = latest();
    expect(ctx.started.length).toBeGreaterThan(0);
    const before = ctx.started.length;
    playSound("kazoo");
    expect(ctx.started).toHaveLength(before);
  });

  test("turned off, a held tone stops and no new one starts", () => {
    setSetting("sound", true);
    setTone("pin:D8", 440);
    const ctx = latest();
    const tone = ctx.started.at(-1)!;
    expect(tone).toMatchObject({ kind: "osc", type: "square", hz: 440, stopped: false });
    const count = ctx.started.length;
    setSetting("sound", false);
    setTone("pin:D8", 523);
    expect(tone.stopped).toBe(true);
    expect(ctx.started).toHaveLength(count);
  });
});

describe("the engine", () => {
  test("every named sound schedules at least one source", () => {
    const engine = new SoundEngine(fakeContext);
    let now = 0;
    vi.spyOn(performance, "now").mockImplementation(() => (now += 100));
    engine.unlock();
    for (const name of [...FIGURE_SOUNDS, ...CUE_SOUNDS]) {
      const before = latest().started.length;
      expect(engine.play(name), name).toBe(true);
      expect(latest().started.length, name).toBeGreaterThan(before);
    }
  });

  test("the same sound twice in one frame is one sound, and a burst is capped", () => {
    const engine = new SoundEngine(fakeContext);
    const now = vi.spyOn(performance, "now").mockReturnValue(1000);
    expect(engine.play("tick")).toBe(true);
    expect(engine.play("tick")).toBe(false);
    let t = 1000;
    now.mockImplementation(() => (t += 5));
    const played = Array.from({ length: 60 }, (_, i) => engine.play(i % 2 ? "click" : "place")).filter(Boolean).length;
    expect(played).toBeLessThan(30);
  });

  test("a held tone starts once, retunes in place and stops", () => {
    const engine = new SoundEngine(fakeContext);
    engine.tone("pin:D8", 262);
    engine.tone("pin:D8", 392);
    const ctx = latest();
    expect(ctx.started).toHaveLength(1);
    engine.tone("pin:D8", null);
    expect(ctx.started[0].stopped).toBe(true);
  });

  test("unlock resumes a suspended context; without Web Audio nothing throws", () => {
    const engine = new SoundEngine(fakeContext);
    engine.unlock();
    expect(latest().state).toBe("running");
    const none = new SoundEngine(() => null);
    expect(none.play("ding")).toBe(false);
    expect(() => none.tone("pin:D8", 440)).not.toThrow();
  });
});
