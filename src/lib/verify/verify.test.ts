// @vitest-environment node
import { describe, expect, test } from "vitest";
import { benchEventsBetween, initEvent, readDroneReport, replayDroneSafety, type BenchEvent, type DroneReport } from "./drone-safety";
import { canonicalJson, replayHash, sha256, toHex } from "./hash";
import { droneTestsFor, verifyRun } from "./index";
import { runLogSchema, type RunLog } from "./runlog";
import { parseSkillId, skillIdFor } from "./skill";

const BUILT = { FRAME: 0, MOTORS: 0, ESC: 0, WIRES: 0, FC: 0, XT60: 0, CAM: 0, RX: 0, VTX: 0, TOP: 0, BATT: 0, PROPS: 0 } as const;
const ALL = { smoke: true, motors: true, calibrate: true };

const init = (over: Partial<Extract<BenchEvent, { type: "init" }>> = {}): BenchEvent => ({
  type: "init",
  placed: { ...BUILT },
  plugged: false,
  fault: null,
  smokeOk: true,
  motorOk: true,
  accOk: true,
  ...over,
});

const GOOD: BenchEvent[] = [
  init(),
  { type: "remove", id: "PROPS" },
  { type: "test", test: "smoke" },
  { type: "test-end", test: "smoke" },
  { type: "test", test: "motors" },
  { type: "test-end", test: "motors" },
  { type: "unplug" },
  { type: "test", test: "calibrate" },
  { type: "test-end", test: "calibrate" },
  { type: "add", id: "PROPS", orient: 0 },
];

const timed = (events: BenchEvent[]) => events.map((action, i) => ({ t: i * 500, action }));

const runOf = (events: BenchEvent[], over: Partial<RunLog> = {}): RunLog => ({
  v: 1,
  kind: "drone-safety",
  itemId: "quad5",
  seed: 7,
  inputs: timed(events),
  result: { pass: true, score: 100 },
  client: { appVersion: "test" },
  ...over,
});

describe("hashes", () => {
  test("canonical JSON sorts keys at every level and drops undefined", () => {
    expect(canonicalJson({ b: 1, a: { d: [1, { z: 1, y: undefined, x: 2 }], c: "s" } })).toBe('{"a":{"c":"s","d":[1,{"x":2,"z":1}]},"b":1}');
    expect(() => canonicalJson({ a: Number.NaN })).toThrow();
  });

  test("sha256 matches the standard test vector", async () => {
    expect(toHex(await sha256("abc"))).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  test("the replay hash ignores key order and changes with any input", async () => {
    const a = await replayHash([{ t: 0, action: { type: "x", a: 1, b: 2 } }]);
    const b = await replayHash([{ action: { b: 2, a: 1, type: "x" }, t: 0 }]);
    const c = await replayHash([{ t: 1, action: { type: "x", a: 1, b: 2 } }]);
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("skill ids", () => {
  test("follow the H6 forms and read back", () => {
    expect(skillIdFor("drone-safety", "quad5")).toBe("drone:quad5:safety");
    expect(skillIdFor("board-lesson", "uno-r3", "blink")).toBe("board:uno-r3:lesson:blink");
    expect(skillIdFor("board-lessons", "uno-r3")).toBe("board:uno-r3:lessons");
    expect(skillIdFor("robotics-bench", "l298n")).toBe("robotics:l298n:bench");
    expect(skillIdFor("flight-course", "quad5-gates", "45")).toBe("flight:quad5-gates:sub-45");
    expect(parseSkillId("board:uno-r3:lesson:blink")).toEqual({ lab: "board", itemId: "uno-r3", lessonId: "blink" });
    expect(parseSkillId("flight:quad5-gates:sub-45")).toEqual({ lab: "flight", course: "quad5-gates", seconds: 45 });
  });

  test("refuse bad or oversized ids", () => {
    expect(skillIdFor("board-lesson", "uno-r3")).toBeNull();
    expect(skillIdFor("drone-safety", "Quad5")).toBeNull();
    expect(skillIdFor("board-lesson", "uno-r3", "x".repeat(60))).toBeNull();
    expect(skillIdFor("flight-course", "c", "0")).toBeNull();
    expect(parseSkillId("drone:quad5:fly")).toBeNull();
  });
});

describe("drone safety replay", () => {
  test("the full procedure passes with a perfect score", () => {
    expect(replayDroneSafety(timed(GOOD), ALL)).toMatchObject({ pass: true, score: 100, violations: [] });
  });

  test("spinning the motors with props on breaks the rules", () => {
    const events = GOOD.filter((e) => !(e.type === "remove" && e.id === "PROPS"));
    const report = replayDroneSafety(timed(events), ALL);
    expect(report?.pass).toBe(false);
    expect(report?.violations).toContain("props-on");
  });

  test("a skipped calibration does not pass", () => {
    const events = GOOD.filter((e) => !("test" in e && e.test === "calibrate"));
    expect(replayDroneSafety(timed(events), ALL)).toMatchObject({ pass: false, steps: { smoke: true, motors: true, calibrate: false } });
  });

  test("a reversed cap pops on power-up, costs points and must be fixed", () => {
    const events: BenchEvent[] = [
      init({ placed: { ...BUILT, XT60: 1 }, smokeOk: false }),
      { type: "remove", id: "PROPS" },
      { type: "plug" },
      { type: "unplug" },
      { type: "add", id: "XT60", orient: 0 },
      ...GOOD.slice(2),
    ];
    expect(replayDroneSafety(timed(events), ALL)).toMatchObject({ pass: true, score: 80, pops: 1 });
    expect(replayDroneSafety(timed(events.slice(0, 4)), ALL)).toMatchObject({ pass: false, fault: "XT60" });
  });

  test("checks done by Build it for me do not count", () => {
    const stripped: BenchEvent[] = [init({ placed: {}, smokeOk: false, motorOk: false, accOk: false })];
    const auto: BenchEvent[] = [
      { type: "assist", tests: ["smoke", "motors", "calibrate"] },
      ...Object.keys(BUILT).map((id): BenchEvent => ({ type: "add", id, orient: 0, auto: true })),
    ];
    expect(replayDroneSafety(timed([...stripped, ...auto]), ALL)).toMatchObject({ pass: false, violations: [] });
    expect(replayDroneSafety(timed([...stripped, ...auto, ...GOOD.slice(1)]), ALL)).toMatchObject({ pass: true });
  });

  test("a craft without a smoke stopper passes on the other two", () => {
    const events = GOOD.filter((e) => !("test" in e && e.test === "smoke"));
    expect(replayDroneSafety(timed(events), { smoke: false, motors: true, calibrate: true })).toMatchObject({ pass: true, steps: { motors: true, calibrate: true } });
  });

  test("events derived from the figure's reports replay to a pass", () => {
    const report = (over: Partial<DroneReport>, base: DroneReport): DroneReport => ({ ...base, ...over, placed: over.placed ?? base.placed });
    const r0 = readDroneReport({ placed: { ...BUILT }, plugged: false, fault: null, test: null, smokeOk: true, motorOk: true, accOk: true })!;
    const noProps = Object.fromEntries(Object.entries(BUILT).filter(([id]) => id !== "PROPS")) as Record<string, 0 | 1>;
    const r1 = report({ placed: noProps }, r0);
    const r2 = report({ test: "smoke", smokeOk: true }, r1);
    const r3 = report({ test: null }, r2);
    const r4 = report({ test: "motors", plugged: true }, r3);
    const r5 = report({ test: null }, r4);
    const r6 = report({ plugged: false }, r5);
    const r7 = report({ test: "calibrate" }, r6);
    const r8 = report({ test: null }, r7);
    const r9 = report({ placed: { ...BUILT } }, r8);
    const chain = [r0, r1, r2, r3, r4, r5, r6, r7, r8, r9];
    const events = [initEvent(r0), ...chain.slice(1).flatMap((next, i) => benchEventsBetween(chain[i], next))];
    expect(events.map((e) => e.type)).toEqual(GOOD.map((e) => e.type));
    expect(replayDroneSafety(timed(events), ALL)).toMatchObject({ pass: true, score: 100 });
  });
});

describe("verifyRun", () => {
  test("passes a good run and hashes its inputs", async () => {
    const run = runOf(GOOD);
    expect(runLogSchema.safeParse(run).success).toBe(true);
    const result = await verifyRun("drone-safety", "quad5", undefined, run);
    expect(result).toEqual({ ok: true, score: 100, skillId: "drone:quad5:safety", replayHash: await replayHash(run.inputs) });
  });

  test("ignores what the client claims about the result", async () => {
    const run = runOf(GOOD.slice(0, 4), { result: { pass: true, score: 100 } });
    expect(await verifyRun("drone-safety", "quad5", undefined, run)).toMatchObject({ ok: false, code: "failed" });
  });

  test("rejects tampered logs", async () => {
    const shuffled = runOf(GOOD);
    shuffled.inputs = [...shuffled.inputs].reverse();
    expect(await verifyRun("drone-safety", "quad5", undefined, shuffled)).toMatchObject({ ok: false, code: "mismatch" });

    const forged = runOf([...GOOD.slice(0, 2), { type: "test-end", test: "smoke" }, ...GOOD.slice(4)]);
    expect(await verifyRun("drone-safety", "quad5", undefined, forged)).toMatchObject({ ok: false, code: "failed" });

    const alien = runOf([...GOOD, { type: "teleport" } as unknown as BenchEvent]);
    expect(await verifyRun("drone-safety", "quad5", undefined, alien)).toMatchObject({ ok: false, code: "mismatch" });

    expect(await verifyRun("drone-safety", "racer", undefined, runOf(GOOD))).toMatchObject({ ok: false, code: "mismatch" });
    expect(await verifyRun("drone-safety", "nope", undefined, runOf(GOOD, { itemId: "nope" }))).toMatchObject({ ok: false, code: "mismatch" });
  });

  test("kinds without a server re-run say so", async () => {
    const run = runOf([], { kind: "board-lesson", itemId: "uno-r3", sub: "blink" });
    expect(await verifyRun("board-lesson", "uno-r3", "blink", run)).toMatchObject({ ok: false, code: "unsupported" });
  });

  test("the whoop has no smoke stopper by default", async () => {
    expect(await droneTestsFor("whoop")).toMatchObject({ smoke: false, motors: true, calibrate: true });
  });
});
