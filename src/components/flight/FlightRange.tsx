"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { FigureFrame, type FigureEvent, type FigureHandle } from "@/components/figure";
import { Button, cx, Kbd, Select, Stat, Toggle } from "@/components/ui";
import type { ParTimes } from "@/content/schema";
import { useLocale } from "@/i18n/client";
import type { Messages } from "@/i18n/namespaces";
import { createTranslator } from "@/i18n/translate";
import {
  buildSolids,
  crashReplay,
  createInput,
  createSession,
  DEFAULT_PAD,
  finishOf,
  FLIGHT_KEYS,
  ghostAt,
  ghostFromLog,
  isPadMapping,
  lapClock,
  loadGhost,
  medalFor,
  modesFor,
  paceGhost,
  padSticks,
  readSticks,
  saveGhost,
  STEP,
  STICK_KEYS,
  type BreakId,
  type CalcOutputs,
  type CrashFix,
  type CrashReplay,
  type GhostTrack,
  type Course,
  type CourseText,
  type CraftFaults,
  type FlightCraft,
  type FlightEvent,
  type FlightSession,
  type PadMapping,
  type Sticks,
} from "@/lib/flight";
import { GamepadPanel } from "./GamepadPanel";
import { TouchSticks } from "./TouchSticks";

export type FlightStrings = Messages["flight"];

/** A friend's craft in the room, as the range draws it. */
export type PeerGhost = { x: number; y: number; z: number; yaw: number; pitch: number; roll: number; label: string; col: string };

/** This craft's pose for the room: position (m), yaw, pitch, roll (deg), and the course it flies. */
export type RangePose = { p: [number, number, number]; q: [number, number, number]; course: string };

export type FlightRangeProps = {
  craft: FlightCraft;
  course: Course;
  /** The drone calculator's numbers for the current design; a change applies without wiping the flight. */
  calc: CalcOutputs;
  faults?: CraftFaults;
  /** The flight namespace for this language (load it on the server). */
  t: FlightStrings;
  /** Translations of the course's title, checkpoint labels and the craft's own mode titles and hints. */
  courseText?: CourseText;
  initialMode?: string;
  /** Medal times for the course: a finished lap, run or mission says which medal it earned. */
  par?: ParTimes | null;
  /** armed, checkpoint, lap, crash, landed, battery, run (best range time), missionStep... */
  onEvent?: (event: FlightEvent) => void;
  /** The flight store, for the drone lab store and the LabDock to observe and drive. */
  onSession?: (session: FlightSession) => void;
  /** The range's FigureFrame handle (for the LabDock), or null while it is not mounted. */
  onFigure?: (handle: FigureHandle | null) => void;
  /** Friends' crafts in the room, read every frame (keep them in a ref, not in state). */
  peers?: () => PeerGhost[];
  /** Start with the course's wind on (the daily challenge sets it). */
  wind?: boolean;
  /** This craft's pose every frame while it moves, for the room to send on. */
  onPose?: (pose: RangePose) => void;
  /** A crash's fix that changes the build (a fault the bench or Break it put in): the page takes it out. */
  onFix?: (fault: BreakId) => void;
  className?: string;
};

const PAD_KEY = "simlab:flight-pad:v1";
const fmtTime = (s: number) => s.toFixed(2);

function loadPad(): PadMapping {
  try {
    const raw = localStorage.getItem(PAD_KEY);
    const v = raw ? JSON.parse(raw) : null;
    return isPadMapping(v) ? v : DEFAULT_PAD;
  } catch {
    return DEFAULT_PAD;
  }
}

const DIRS = 8;
const COARSE = "(pointer: coarse)";
function subscribeCoarse(cb: () => void) {
  const mq = window.matchMedia(COARSE);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
const isCoarse = () => window.matchMedia(COARSE).matches;

const AUTOPILOT = new Set(["rtl", "mission", "figure8", "qrtl", "rth", "swarm", "transition"]);

/** The crash replay plays at a third of real speed. */
const SLOW_MO = 1 / 3;
const GHOST_BEST = "#3d3935";
const GHOST_PACE = "#1c2948";

// a gate course races laps in every mode; a course with no kind scores what the mode flies
const scoresGates = (course: Course, mode: { task: string }) => course.kind === "gates" || (!course.kind && mode.task === "race");
const scoresCheckpoints = (course: Course, mode: { task: string }) => (course.kind ? course.kind !== "gates" : mode.task === "range");

export function FlightRange({ craft, course, calc, faults, t: dict, courseText, initialMode, par, onEvent, onSession, onFigure, peers, wind, onPose, onFix, className }: FlightRangeProps) {
  const locale = useLocale();
  const t = useMemo(() => createTranslator(locale, dict, "flight"), [locale, dict]);
  const label = useCallback((en: string) => courseText?.labels?.[en] ?? en, [courseText]);
  const courseTitle = courseText?.title ?? course.title;

  // one session per craft and course; design changes go in as actions
  const session = useMemo(
    () => createSession(craft, course, calc, { mode: initialMode, faults, windOn: wind }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- calc and faults are dispatched below, never a new flight; the page keys a new wind
    [craft, course],
  );
  const snap = useSyncExternalStore(session.subscribe, session.getState, session.getState);
  // the session starts from these; a later change (a fault fixed or broken, another pack) goes in as an action
  const designRef = useRef({ calc, faults });
  useEffect(() => {
    if (designRef.current.calc === calc && designRef.current.faults === faults) return;
    designRef.current = { calc, faults };
    session.dispatch({ type: "design", calc, faults: faults ?? {} });
  }, [session, calc, faults]);
  useEffect(() => {
    onSession?.(session);
  }, [session, onSession]);

  const frame = useRef<FigureHandle | null>(null);
  const setFrame = useCallback(
    (h: FigureHandle | null) => {
      frame.current = h;
      onFigure?.(h);
    },
    [onFigure],
  );

  const [fpv, setFpv] = useState(false);
  // toggleFpv reads this so it can post to the figure outside a state updater
  const fpvRef = useRef(false);
  const [message, setMessage] = useState("");
  // one panel over the range at a time: the gamepad mapping or the controls legend
  const [panel, setPanel] = useState<"pad" | "legend" | null>(null);
  const coarse = useSyncExternalStore(subscribeCoarse, isCoarse, () => false);
  // the panel that shows the mapping starts closed, so the server's default never meets the saved one on screen
  const [pad, setPadState] = useState<PadMapping>(() => (typeof window === "undefined" ? DEFAULT_PAD : loadPad()));
  const padRef = useRef(pad);
  const input = useRef(createInput());
  const modes = useMemo(() => modesFor(craft, course), [craft, course]);
  const mode = modes.find((m) => m.id === snap.mode) ?? modes[0];
  const climb = mode.throttle === "climb";
  const climbRef = useRef(climb);
  useEffect(() => {
    climbRef.current = climb;
  }, [climb]);

  const setPad = useCallback((m: PadMapping) => {
    padRef.current = m;
    setPadState(m);
    try {
      localStorage.setItem(PAD_KEY, JSON.stringify(m));
    } catch {
      // private mode: the mapping lasts for this visit
    }
  }, []);
  useEffect(() => {
    padRef.current = pad;
  }, [pad]);

  const modeTitle = useCallback(
    (id: string) =>
      courseText?.modes?.[id] ?? (id === "range" ? t("modes.range", { title: courseTitle }) : (dict.modes as Record<string, string>)[id] ?? id),
    [t, dict, courseTitle, courseText],
  );
  const modeHint = mode.task === "demo" ? dict.demoHint : courseText?.hints?.[mode.id];

  // the line for a finished lap, run or mission: the demo's never counts, the learner's earns a medal
  const finished = useCallback(
    (e: { time: number; demo?: boolean }, line: string) => {
      if (e.demo) return t("msg.demoTime", { time: e.time.toFixed(1) });
      if (!par) return line;
      const medal = medalFor(e.time, par);
      return medal ? t("msg.medal", { line, medal: dict.medals[medal] }) : t("msg.noMedal", { line, s: par.bronze });
    },
    [t, dict, par],
  );

  const describe = useCallback(
    (e: FlightEvent): string | null => {
      switch (e.type) {
        case "armed": {
          const m = modes.find((x) => x.id === e.mode) ?? mode;
          const hint =
            m.task === "demo"
              ? t("msg.hintDemo")
              : AUTOPILOT.has(m.task)
                ? t("msg.hintAuto")
                : scoresGates(course, m)
                  ? t("msg.hintRace")
                  : scoresCheckpoints(course, m)
                    ? t("msg.hintRange")
                    : m.throttle === "climb"
                      ? t("msg.hintAlt")
                      : t("msg.hintManual");
          return t("msg.armed", { hint });
        }
        case "disarmed":
          return t("msg.disarmed");
        case "blocked":
          return {
            crashed: t("msg.armBlockedCrashed"),
            air: t("msg.armBlockedAir"),
            throttle: t("msg.armBlockedThrottle"),
            battery: t("msg.armBlockedBattery"),
            acc: t("msg.armBlockedAcc"),
          }[e.why];
        case "crash":
          return t("msg.crash", { why: (dict.hit as Record<string, string>)[e.why] ?? dict.hit.obstacle });
        case "landed":
          return e.belly ? t("msg.bellyLanding", { mah: e.mah }) : t("msg.landed", { mah: e.mah });
        case "battery":
          if (e.level === "low") return t("msg.lowBattery", { v: e.perCell.toFixed(2) });
          return e.chemistry === "liion" ? t("msg.batteryEmptyLiion") : t("msg.batteryEmptyLipo");
        case "gate":
          return t("msg.gate", { n: e.index, total: e.total });
        case "lap":
          return finished(e, t(e.best ? "msg.lapBest" : "msg.lap", { time: fmtTime(e.time) }));
        case "checkpoint":
          return t("msg.checkpoint", { label: label(e.label) });
        case "run":
          return finished(e, t(e.best ? "msg.runBest" : "msg.runDone", { title: courseTitle, time: e.time.toFixed(1) }));
        case "missionStep":
          return t("msg.missionStep", { n: e.index, total: e.total, label: label(e.label) });
        case "drop":
          return t("msg.drop", { kg: (e.g / 1000).toFixed(1) });
        case "missionDone":
          if (e.time === undefined) return t("msg.missionDone");
          return finished({ time: e.time, demo: e.demo }, t(e.best ? "msg.missionBest" : "msg.missionTime", { time: e.time.toFixed(1) }));
        case "outOfField":
          return t("msg.outOfField");
        case "farOut":
          return t("msg.farOut");
        case "ceiling":
          return t("msg.ceiling", { m: e.m });
        case "desync":
          return t("msg.desync", { motor: e.motor });
        case "motorOut":
          return t("msg.motorOut", { motor: e.motor });
        case "stall":
          return t("msg.stall");
        case "launch":
          return t("msg.launch");
        case "transition":
          return e.to === "cruise" ? t("msg.transition") : t("msg.hoverAgain");
        case "mode":
          return t("msg.modeChanged", { mode: modeTitle(e.mode) });
        default:
          return null;
      }
    },
    [t, dict, modes, mode, label, courseTitle, modeTitle, finished, course],
  );

  const say = useCallback((text: string) => {
    setMessage(text);
    frame.current?.send("flash", { text, ms: 3200 });
  }, []);

  // ghosts: your best lap (cut from a replay of this session's log, kept in this browser) and the autopilot's
  // line on this design; friends' crafts come from the page through `peers`
  const [ghostOn, setGhostOn] = useState({ best: true, pace: true });
  const [bestGhost, setBestGhost] = useState<GhostTrack | null>(null);
  const [pace, setPace] = useState<GhostTrack | null>(null);
  const ghosts = useRef({ on: ghostOn, best: bestGhost, pace, peers, onPose });
  useEffect(() => {
    ghosts.current = { on: ghostOn, best: bestGhost, pace, peers, onPose };
  }, [ghostOn, bestGhost, pace, peers, onPose]);
  useEffect(() => {
    // localStorage and a headless lap: browser only, after the first paint
    const id = setTimeout(() => {
      setBestGhost(loadGhost(craft.id, course.id));
      setPace(paceGhost(craft, course, calc));
    }, 0);
    return () => clearTimeout(id);
  }, [craft, course, calc]);
  const keepBest = useCallback(
    (time: number) => {
      const steps = session.sim.step;
      const log = session.log().slice();
      setTimeout(() => {
        const g = ghostFromLog(session.origin, log, steps, time);
        if (g && saveGhost(g)) setBestGhost(g);
      }, 0);
    },
    [session],
  );

  // Break it: a crash replays in slow motion from the session's log, then says why and offers the fix
  const [crash, setCrash] = useState<CrashReplay | null>(null);
  const [replaying, setReplaying] = useState(false);
  const replayRef = useRef<{ r: CrashReplay; t: number } | null>(null);
  const playCrash = useCallback((r: CrashReplay) => {
    replayRef.current = { r, t: 0 };
    setReplaying(true);
  }, []);
  const stopCrash = useCallback(() => {
    replayRef.current = null;
    setReplaying(false);
  }, []);
  const seeCrash = useCallback(() => {
    const steps = session.sim.step;
    const log = session.log().slice();
    setTimeout(() => {
      const r = crashReplay(session.origin, log, steps, ghosts.current.pace !== null);
      if (!r) return;
      setCrash(r);
      playCrash(r);
    }, 0);
  }, [session, playCrash]);

  const handleEvents = useCallback(
    (events: FlightEvent[]) => {
      for (const e of events) {
        onEvent?.(e);
        const text = describe(e);
        if (text && e.type !== "takeoff") say(text);
        const done = finishOf(e);
        if (done?.best && !done.demo) keepBest(done.time);
        if (e.type === "crash") seeCrash();
      }
    },
    [describe, onEvent, say, keepBest, seeCrash],
  );
  const handleRef = useRef(handleEvents);
  useEffect(() => {
    handleRef.current = handleEvents;
  }, [handleEvents]);

  const act = useCallback(
    (a: Parameters<FlightSession["dispatch"]>[0]) => {
      if (a.type === "reset") {
        stopCrash();
        setCrash(null);
      }
      session.dispatch(a);
      handleRef.current(session.tick(0));
      if (a.type === "mode" || a.type === "reset") input.current.manualThrottle = session.sim.sticks.throttle;
      frame.current?.send("set", { state: { frame: session.frame() } });
    },
    [session, stopCrash],
  );
  const toggleFpv = useCallback(() => {
    const next = !fpvRef.current;
    fpvRef.current = next;
    setFpv(next);
    frame.current?.send("set", { state: { fpv: next } });
    say(next ? t("msg.fpvOn") : t("msg.fpvOff"));
  }, [say, t]);
  const toggleWind = useCallback(() => {
    const on = !session.getState().windOn;
    act({ type: "wind", on });
    const w = course.wind;
    const dir = dict.dirs[Math.round((((w.from % 360) + 360) % 360) / (360 / DIRS)) % DIRS];
    say(on ? t("msg.windOn", { speed: w.speed, dir }) : t("msg.windOff"));
  }, [act, course.wind, dict.dirs, say, session, t]);

  // one-shot keys: Space arms, R resets, V toggles the goggles
  const command = useCallback(
    (code: string) => {
      if (code === "Space") act({ type: "toggleArm" });
      else if (code === "KeyR") act({ type: "reset" });
      else if (code === "KeyV") toggleFpv();
    },
    [act, toggleFpv],
  );
  const keyDown = useCallback(
    (code: string, repeat: boolean) => {
      if (STICK_KEYS.has(code)) input.current.keys.add(code);
      else if (!repeat) command(code);
    },
    [command],
  );
  const keyUp = useCallback((code: string) => {
    input.current.keys.delete(code);
  }, []);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const tag = (e.target as HTMLElement).tagName;
    if (!FLIGHT_KEYS.has(e.code) || tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
    if (e.code === "Space" && tag === "BUTTON") return; // Space still presses a focused button
    e.preventDefault();
    keyDown(e.code, e.repeat);
  };
  const onKeyUp = (e: KeyboardEvent<HTMLDivElement>) => {
    if (FLIGHT_KEYS.has(e.code)) keyUp(e.code);
  };

  const onFigureEvent = useCallback(
    (e: FigureEvent) => {
      if (e.type === "part" && e.act === "key" && e.id) {
        if (e.data.down === "1") keyDown(e.id, e.data.repeat === "1");
        else keyUp(e.id);
      } else if (e.type === "focus" && !e.on) input.current.keys.clear();
      else if (e.type === "state" && typeof e.state.fpv === "boolean") {
        fpvRef.current = e.state.fpv;
        setFpv(e.state.fpv);
      }
    },
    [keyDown, keyUp],
  );

  // the loop: input -> fixed-step physics -> events -> one frame to the range page
  const padButtons = useRef<boolean[]>([]);
  useEffect(() => {
    let raf = 0;
    let last = 0;
    let lastSticks = "";
    let lastGhosts = "";
    let idleFrames = 0;
    const ghostFrames = (s: FlightSession["sim"], g: typeof ghosts.current): PeerGhost[] => {
      const clock = lapClock(s) ?? 0;
      const out: PeerGhost[] = [];
      const at = (track: GhostTrack, label: string, col: string) => {
        const [x, y, z, yaw, pitch, roll] = ghostAt(track, clock);
        out.push({ x, y, z, yaw, pitch, roll, label, col });
      };
      if (g.on.best && g.best) at(g.best, t("ghosts.labelBest", { time: g.best.time.toFixed(1) }), GHOST_BEST);
      // the demo flies the autopilot's own line: its ghost would sit on top of it
      if (g.on.pace && g.pace && s.mode.task !== "demo") at(g.pace, dict.ghosts.labelPace, GHOST_PACE);
      for (const p of g.peers?.() ?? []) out.push(p);
      return out;
    };
    const loop = (ts: number) => {
      const dt = last ? Math.min(0.1, (ts - last) / 1000) : 1 / 60;
      last = ts;
      const gp = navigator.getGamepads ? [...navigator.getGamepads()].find((g) => g) : null;
      const inp = input.current;
      if (gp) {
        const m = padRef.current;
        inp.pad = padSticks(gp.axes, m);
        const pressed = gp.buttons.map((b) => b.pressed);
        const was = padButtons.current;
        if (pressed[m.arm] && !was[m.arm]) command("Space");
        if (pressed[m.fpv] && !was[m.fpv]) command("KeyV");
        if (pressed[m.reset] && !was[m.reset]) command("KeyR");
        padButtons.current = pressed;
      } else inp.pad = null;
      const sticks: Sticks = readSticks(inp, climbRef.current, dt);
      const key = `${sticks.throttle.toFixed(3)},${sticks.yaw.toFixed(3)},${sticks.pitch.toFixed(3)},${sticks.roll.toFixed(3)}`;
      if (key !== lastSticks) {
        lastSticks = key;
        session.dispatch({ type: "sticks", sticks });
      }
      const events = session.tick(dt);
      if (events.length) handleRef.current(events);
      const s = session.sim;
      const moving = s.armed || s.p[2] > 0.001 || Math.hypot(s.v[0], s.v[1], s.v[2]) > 0.01 || s.u > 0.001;
      const g = ghosts.current;
      if (moving) {
        const f = session.frame();
        g.onPose?.({ p: [f.x, f.y, f.z], q: [f.yaw, f.pitch, f.roll], course: course.id });
      }
      // the crash replay owns the picture until it ends; the live craft lies where it fell meanwhile
      const rp = replayRef.current;
      if (rp) {
        rp.t += dt * SLOW_MO;
        const i = Math.min(rp.r.frames.length - 1, Math.floor(rp.t / STEP));
        frame.current?.send("set", { state: { frame: { ...rp.r.frames[i], replay: true } } });
        if (i >= rp.r.frames.length - 1) {
          replayRef.current = null;
          setReplaying(false);
          idleFrames = 0;
        }
        raf = requestAnimationFrame(loop);
        return;
      }
      const list = ghostFrames(s, g);
      const ghostKey = list.map((x) => `${x.x.toFixed(2)},${x.y.toFixed(2)},${x.z.toFixed(2)}`).join("|");
      idleFrames = moving || ghostKey !== lastGhosts ? 0 : idleFrames + 1;
      lastGhosts = ghostKey;
      if (idleFrames < 3) frame.current?.send("set", { state: { frame: { ...session.frame(), ghosts: list } } });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [session, command, course.id, t, dict]);

  const figureStrings = useMemo(() => {
    const s: Record<string, string> = { figureTitle: dict.figureTitle, replay: dict.why.badge };
    for (const [k, v] of Object.entries(dict.osd)) s[`osd.${k}`] = v;
    for (const m of modes) s[`mode.${m.id}`] = modeTitle(m.id);
    for (const cp of course.checkpoints) s[cp.label] = label(cp.label);
    for (const p of course.prims) if ((p.type === "flat" || p.type === "disc") && p.label) s[p.label] = label(p.label);
    return s;
  }, [dict, modes, course, label, modeTitle]);

  const initial = useMemo(
    () => ({
      course,
      solids: buildSolids(course),
      craft: { fov: craft.fov, camTilt: craft.camTilt, fpvProps: !!craft.fpvProps, fpvLevel: !!craft.fpvLevel, look: craft.look },
      frame: session.frame(),
      fpv: false,
      strings: figureStrings,
    }),
    // the frame is streamed after this; only a new course or craft needs a new initial state
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [course, craft, session, figureStrings],
  );

  const fixLabel = (f: CrashFix) =>
    f.kind === "fault" ? dict.why.fix[f.fault] : f.kind === "mode" ? t("why.fix.mode", { mode: modeTitle(f.mode) }) : f.kind === "pace" ? dict.why.fix.pace : dict.why.fix.reset;
  const whyText = (r: CrashReplay) =>
    t(`why.${r.cause}`, { speed: r.speed.toFixed(1), kmh: Math.round(r.speed * 3.6), what: r.hit ? dict.why.what[r.hit] : dict.why.what.obstacle });
  // a fault the page can't take out (no onFix) still gets a fresh go
  const crashFix: CrashFix | null = crash ? (crash.fix.kind === "fault" && !onFix ? { kind: "reset" } : crash.fix) : null;
  const applyFix = () => {
    if (!crashFix) return;
    if (crashFix.kind === "fault") onFix?.(crashFix.fault);
    if (crashFix.kind === "pace") setGhostOn((g) => ({ ...g, pace: true }));
    act({ type: "reset" });
    if (crashFix.kind === "mode") act({ type: "mode", mode: crashFix.mode });
    say(t("why.fixed", { fix: fixLabel(crashFix) }));
  };

  const stateText = snap.crashed ? dict.stats.crashed : snap.armed ? dict.stats.armed : dict.stats.disarmed;
  const next = session.frame().next;
  const nextText =
    next?.kind === "gate"
      ? t("stats.gate", { n: next.n, total: next.total })
      : next?.kind === "checkpoint" || next?.kind === "waypoint"
        ? t("stats.checkpoint", { label: label(next.label), n: next.n, total: next.total })
        : dict.stats.home;
  const isRace = scoresGates(course, mode);
  const best = isRace ? snap.bestLap : snap.bestRun;
  const bestText = best === null ? dict.stats.noBest : isRace ? fmtTime(best) : best.toFixed(1);
  const telemetry = [
    { id: "state", label: dict.stats.state, value: stateText, tone: snap.crashed ? ("bad" as const) : undefined },
    { id: "battery", label: dict.stats.battery, value: t("stats.perCell", { v: snap.perCell.toFixed(2) }), tone: snap.low ? ("bad" as const) : undefined },
    { id: "alt", label: dict.stats.altitude, value: snap.alt.toFixed(1), unit: "m" },
    { id: "speed", label: dict.stats.speed, value: String(snap.speed), unit: "km/h" },
    { id: "throttle", label: dict.stats.throttle, value: String(Math.round(snap.throttle * 100)), unit: "%", wide: true },
    { id: "current", label: dict.stats.current, value: snap.amps.toFixed(1), unit: "A", wide: true },
    { id: "used", label: dict.stats.used, value: String(snap.mah), unit: "mAh", wide: true },
    { id: "next", label: dict.stats.next, value: nextText },
    { id: "best", label: dict.stats.best, value: bestText, unit: best === null ? undefined : "s", wide: true },
    { id: "crashes", label: dict.stats.crashes, value: String(snap.crashes), wide: true },
  ];
  const toggle = (which: "pad" | "legend") => setPanel((p) => (p === which ? null : which));
  const crashCard = crash && crashFix && (
    <section
      aria-labelledby="flight-why-title"
      className="pointer-events-auto w-full max-w-[26rem] rounded-ink-sm border-2 border-line bg-surface p-3 shadow-ink"
      data-testid="crash-why"
      data-cause={crash.cause}
    >
      {crash.hit && crash.cause !== "hit" ? <p className="ink-label">{dict.hit[crash.hit]}</p> : null}
      <h3 id="flight-why-title" className="font-head text-lg leading-tight">
        {dict.why.title}
      </h3>
      <p className="mt-1 text-sm">{whyText(crash)}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="primary" size="sm" onClick={applyFix} data-testid="crash-fix">
          {fixLabel(crashFix)}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => playCrash(crash)} disabled={replaying} data-testid="crash-replay" data-playing={replaying}>
          {replaying ? dict.why.replaying : dict.why.replay}
        </Button>
      </div>
    </section>
  );
  const strip = (
    <div
      className={cx(
        "pointer-events-auto w-full rounded-ink-sm border-[1.5px] border-rule bg-paper/90 px-3 py-1.5 shadow-ink-sm",
        coarse ? "grid grid-cols-[repeat(3,auto)] justify-between gap-x-3 gap-y-1 [&_.tabular]:text-base" : "flex flex-wrap gap-x-4 gap-y-1",
      )}
      data-testid="flight-telemetry"
    >
      {telemetry
        .filter((s) => !coarse || !s.wide)
        .map(({ id, wide: _wide, ...stat }) => (
          <Stat key={id} size="sm" className="shrink-0" {...stat} />
        ))}
    </div>
  );

  return (
    <div
      className={cx("flex min-h-0 min-w-0 flex-col gap-2", className)}
      data-testid="flight-range"
      data-course={course.id}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && input.current.keys.clear()}
    >
      <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto [scrollbar-width:none] sm:gap-2">
        <Select
          label={dict.mode}
          hideLabel
          value={snap.mode}
          onChange={(e) => act({ type: "mode", mode: e.target.value })}
          className="w-auto min-w-[9rem] max-w-[16rem] max-sm:max-w-[11rem]"
        >
          {modes.map((m) => (
            <option key={m.id} value={m.id}>
              {modeTitle(m.id)}
            </option>
          ))}
        </Select>
        <Button
          variant={snap.armed ? "danger" : "primary"}
          aria-keyshortcuts="Space"
          onClick={() => act({ type: "toggleArm" })}
          className="shrink-0 whitespace-nowrap"
        >
          {snap.armed ? dict.buttons.disarm : dict.buttons.arm}
        </Button>
        {coarse ? (
          <>
            <CockpitIcon glyph="reset" label={dict.buttons.reset} onClick={() => act({ type: "reset" })} />
            <CockpitIcon glyph="fpv" label={dict.buttons.fpv} pressed={fpv} onClick={toggleFpv} />
            <CockpitIcon glyph="wind" label={dict.buttons.wind} pressed={snap.windOn} onClick={toggleWind} />
          </>
        ) : (
          <>
            <Button aria-keyshortcuts="R" onClick={() => act({ type: "reset" })} className="shrink-0 whitespace-nowrap">
              {dict.buttons.reset}
            </Button>
            <Button aria-pressed={fpv} aria-keyshortcuts="V" onClick={toggleFpv} className="shrink-0 whitespace-nowrap">
              {dict.buttons.fpv}
            </Button>
            <Button aria-pressed={snap.windOn} onClick={toggleWind} className="shrink-0 whitespace-nowrap">
              {dict.buttons.wind}
            </Button>
            <span className="ms-auto" />
            <Button variant="ghost" size="sm" aria-expanded={panel === "pad"} onClick={() => toggle("pad")} className="shrink-0 whitespace-nowrap">
              {dict.buttons.gamepad}
            </Button>
            <Button variant="ghost" size="sm" aria-expanded={panel === "legend"} onClick={() => toggle("legend")} className="shrink-0 whitespace-nowrap">
              {dict.buttons.legend}
            </Button>
          </>
        )}
      </div>
      <div className="relative min-h-0 flex-1">
        <FigureFrame
          ref={setFrame}
          src="/figures/flight/range.html"
          title={dict.figureTitle}
          initial={initial}
          onEvent={onFigureEvent}
          strings={figureStrings}
          controls={false}
          fill
          className="h-full"
        />
        {coarse && (
          <TouchSticks
            climb={climb}
            manualThrottle={snap.stick}
            labels={dict.sticks}
            onLeft={(v) => (input.current.left = v)}
            onRight={(v) => (input.current.right = v)}
          />
        )}
        <div className={cx("pointer-events-none absolute inset-x-2 flex flex-col items-start gap-2", coarse ? "top-2" : "bottom-2 justify-end")}>
          {coarse ? strip : null}
          {modeHint || snap.pendingDesign ? (
            <div className="max-w-[min(32rem,100%)] rounded-ink-sm bg-paper/85 px-2.5 py-1 text-xs text-ink shadow-ink-sm">
              {modeHint ? <p className="max-sm:line-clamp-3">{modeHint}</p> : null}
              {snap.pendingDesign ? <p className="font-semibold">{dict.pendingDesign}</p> : null}
            </div>
          ) : null}
          {crashCard}
          {coarse ? null : strip}
        </div>
        {panel ? (
          <div
            className="absolute end-2 top-2 z-20 max-h-[calc(100%-1rem)] w-[min(26rem,calc(100%-1rem))] overflow-y-auto rounded-ink-sm border-2 border-line bg-surface p-3 text-sm shadow-ink-lg animate-ink-fade"
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.stopPropagation();
                setPanel(null);
              }
            }}
          >
            {panel === "pad" ? (
              <GamepadPanel t={dict.gamepad} mapping={pad} onChange={setPad} />
            ) : (
              <section aria-labelledby="flight-legend-title">
                <h3 id="flight-legend-title" className="mb-2 font-head text-lg">
                  {dict.legend.title}
                </h3>
                <dl className="divide-y divide-rule">
                  {(["throttle", "yaw", "pitch", "roll", "arm", "fpv", "reset"] as const).map((k) => (
                    <div key={k} className="flex items-center justify-between gap-4 py-1.5">
                      <dt>
                        <Kbd>{dict.legend.keys[k]}</Kbd>
                      </dt>
                      <dd className="text-end">{dict.legend[k]}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-2 space-y-1 text-muted">
                  <p>{climb ? dict.legend.throttleAlt : dict.legend.throttleManual}</p>
                  <p>{mode.attitude === "acro" ? dict.legend.acroNote : dict.legend.angleNote}</p>
                  <p>{dict.legend.focusNote}</p>
                </div>
              </section>
            )}
          </div>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-0">
        <p role="status" aria-live="polite" className="min-h-6 min-w-0 flex-1 basis-60 truncate text-sm font-semibold" data-testid="flight-message">
          {message}
        </p>
        <div
          className="flex max-w-full flex-wrap items-center gap-x-4 gap-y-1"
          role="group"
          aria-labelledby="flight-ghosts-title"
          data-testid="ghosts"
        >
          <span id="flight-ghosts-title" className="ink-kicker shrink-0">
            {dict.ghosts.title}
          </span>
          <div data-testid="ghost-best" data-on={ghostOn.best && bestGhost !== null} className="min-w-0 max-sm:basis-full sm:whitespace-nowrap">
            <Toggle
              checked={ghostOn.best && bestGhost !== null}
              disabled={!bestGhost}
              onChange={(on) => setGhostOn((g) => ({ ...g, best: on }))}
              label={bestGhost ? t("ghosts.best", { time: bestGhost.time.toFixed(2) }) : dict.ghosts.bestNone}
              className="!gap-2"
            />
          </div>
          {pace && (
            <div data-testid="ghost-pace" data-on={ghostOn.pace} className="min-w-0 max-sm:basis-full sm:whitespace-nowrap">
              <Toggle
                checked={ghostOn.pace}
                onChange={(on) => setGhostOn((g) => ({ ...g, pace: on }))}
                label={t("ghosts.pace", { time: pace.time.toFixed(1) })}
                className="!gap-2"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const GLYPHS = {
  // a loop back to the start
  reset: "M5 9.2A7.6 7.6 0 1 1 6.3 17M5 4.2v5h5",
  // goggles: two lenses on a strap
  fpv: "M3 9.5h18v6h-6.5l-2.5-2-2.5 2H3zM3 12H1.5M21 12h1.5",
  // wind: three gusts
  wind: "M3 8.5h10.5a2.5 2.5 0 1 0-2.5-2.5M3 12.5h15a2.5 2.5 0 1 1-2.5 2.5M3 16.5h7",
};

/** A 44 px cockpit button with a glyph, for the phone's one row (its name stays the full label). */
function CockpitIcon({ glyph, label, pressed, onClick }: { glyph: keyof typeof GLYPHS; label: string; pressed?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-line bg-surface text-ink aria-pressed:bg-ink aria-pressed:text-paper"
    >
      <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={GLYPHS[glyph]} />
      </svg>
    </button>
  );
}
