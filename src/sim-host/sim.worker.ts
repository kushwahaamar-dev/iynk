import { INTERP_LANGUAGE } from "@/lib/interp";
import { pinNet } from "@/lib/interp/pins";
import { getProfile } from "@/lib/interp/profiles";
import type { Descriptor } from "@/parts/descriptor";
import { builtinRegistry } from "@/parts/builtin";
import { serveWorker, type WorkerScopeLike } from "@/protocol";
import { simDiag } from "@/sim/core/diagnostic";
import { cyclesToNs } from "@/sim/core/clock";
import { createDigitalNets } from "@/sim/digital/nets";
import type { HexProgram, SimDiagnostic, SimNetlist } from "@/sim/engine";
import { defaultRules } from "@/sim/faults/rules";
import { createProbeTap } from "@/sim/probe/tap";
import { loadRegistry } from "@/sim/registry/entries";
import { RATE, type Avr8js, type AvrEngine } from "@/sim/mcu/avr8js";
import { createFirmwareEngine, I2C_BUS, netlistBus } from "@/sim/mcu/firmware";
import { NOMINAL_CELL } from "@/core/battery";
import { createLoader, detectFeatures } from "./engines/loader";
import { createInterpEngine, type InterpEngine } from "./engines/interp-engine";
import { boardIdOf, createSimHandler, type SimEngine } from "./handler";
import { prepareMech, robotReport } from "./mech";

const parts = builtinRegistry();

const describe = (id: string): Descriptor | undefined => {
  const [ref = "", version = ""] = id.split("@");
  return parts.get(ref, version);
};

/** The worker has no solver to drive the board's pins; the engine's own pin events carry them to the nets. */
const unwired = {
  drive: () => undefined,
  mode: () => undefined,
  level: () => null,
  volts: () => null,
};

const loadFromManifest = createLoader({ fetch: (input, init) => fetch(input, init), features: { wasm: new Set(), deviceMemoryGb: undefined, desktop: true } });

let avr: Avr8js | null = null;

const engineFailure = (message: string): SimDiagnostic[] => [simDiag("engine-load-failed", "error", {}, { message })];

/** Fetches the avr8js engine the first time a compiled program is loaded; its files are checked against the manifest. */
async function loadAvr(): Promise<SimDiagnostic[]> {
  if (avr) return [];
  const offer = await loadFromManifest("avr8js");
  if (!offer.ok) return engineFailure(offer.detail);
  const fetched = await offer.fetchFiles();
  if (!fetched.ok) return engineFailure(fetched.reason === "integrity" ? "engine file failed its check" : fetched.detail);
  const script = fetched.files.find((f) => f.kind === "js");
  if (!script) return engineFailure("the engine has no script file");
  const url = URL.createObjectURL(new Blob([script.bytes], { type: "text/javascript" }));
  try {
    avr = (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ url)) as Avr8js;
  } catch (error) {
    return engineFailure(error instanceof Error ? error.message : String(error));
  } finally {
    URL.revokeObjectURL(url);
  }
  return [];
}

function firmwareEngine(program: HexProgram, net: SimNetlist): SimEngine {
  const board = net.parts.find((p) => p.kind === "board");
  const boardId = boardIdOf(board?.descriptor ?? "");
  if (!avr) throw new Error("the AVR engine is not loaded");
  if (!board || (boardId !== "uno-r3" && boardId !== "nano")) throw new Error(`${boardId} does not run on the AVR engine`);
  const supplyV = getProfile(boardId).logicV;
  const running: { engine?: AvrEngine } = {};
  const bus = netlistBus(net, board.id, supplyV, (part) => describe(part.descriptor), () => cyclesToNs(running.engine?.cycles ?? 0, RATE));
  const made = createFirmwareEngine(avr, { board: boardId, hex: program.hex, elf: program.elf, wiring: { pins: unwired, bus, busId: I2C_BUS, vref: supplyV } });
  if (!made.ok) throw new Error("message" in made.error ? made.error.message : made.error.kind);
  running.engine = made.engine;
  return made.engine;
}

/** The run has no analog solver in the worker yet, so a probe reads "not modelled" until one is wired in. */
const noAnalog = {
  netVolts: () => null,
  pinVolts: () => null,
  componentResult: () => null,
  nodeIndex: () => null,
  whatIf: (): never => {
    throw new Error("no analog solver in the worker");
  },
};

/**
 * Reads the I2C pins from the sketch's `Wire.begin` as it runs, and probes by writing an address to the interpreter's bus.
 * The pins come out as the board's net names, which are the names on the headers.
 */
function scanTap(engine: SimEngine) {
  const { world } = (engine as InterpEngine).run;
  let bound: { sda: number; scl: number } | undefined;
  const inner = world.i2cBinder;
  world.i2cBinder = (sda, scl) => {
    bound = { sda, scl };
    inner?.(sda, scl);
  };
  return {
    probe: (addr: number) => (world.i2cTransfer(addr, [], 0).ack ? ("ack" as const) : ("nack" as const)),
    pins() {
      const pins = bound ?? world.profile.i2c;
      return pins ? { sda: pinNet(world.profile, pins.sda), scl: pinNet(world.profile, pins.scl) } : null;
    },
  };
}

const loadPhysics = createLoader({ fetch: (input, init) => fetch(input, init), features: detectFeatures() });

const latestPart = (ref: string): Descriptor | undefined => parts.latest(ref);

/**
 * The worker has no analog solver, so the motors are fed the nominal voltage of the pack in the netlist.
 * Sensor readings and encoder edges have no way into the firmware's pins yet.
 */
function mechRunIo(net: SimNetlist) {
  const cells = net.parts.flatMap((p) => {
    const [ref = ""] = p.descriptor.split("@");
    const count = latestPart(ref)?.mechanics?.battery?.cells;
    return count === undefined ? [] : [count];
  })[0];
  const supply = cells === undefined ? 0 : cells * NOMINAL_CELL;
  return { supplyV: () => supply, setAnalog: () => undefined, setParam: () => undefined, driveEdge: () => undefined };
}

serveWorker(
  self as unknown as WorkerScopeLike,
  createSimHandler({
    diag: self.name === "sim-diag",
    wallMs: () => performance.now(),
    schedule: (fn) => void setTimeout(fn, 0),
    prepareHex: loadAvr,
    makeEngine: (program, net, opts) => {
      if (program.kind === "hex") return firmwareEngine(program, net);
      const board = net.parts.find((p) => p.kind === "board");
      return createInterpEngine({
        id: board?.id ?? "mcu",
        board: boardIdOf(board?.descriptor ?? ""),
        language: INTERP_LANGUAGE[program.language as keyof typeof INTERP_LANGUAGE] ?? "arduino",
        seed: opts.seed,
      });
    },
    makeDigital: createDigitalNets,
    scan: scanTap,
    mech: {
      prepare: (doc, net, onState) => prepareMech(doc, net, { loadEngine: loadPhysics, describe: latestPart, onState }),
      runIo: mechRunIo,
      report: (doc) => robotReport(doc, latestPart),
    },
    faults: {
      describe,
      rules: defaultRules,
    },
    makeTap: () => createProbeTap({ analog: noAnalog, registry: loadRegistry(), modelOf: () => [] }),
  }),
);
