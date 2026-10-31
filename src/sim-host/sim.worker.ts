import { INTERP_LANGUAGE } from "@/lib/interp";
import { pinNet } from "@/lib/interp/pins";
import { builtinRegistry } from "@/parts/builtin";
import { serveWorker, type WorkerScopeLike } from "@/protocol";
import { createDigitalNets } from "@/sim/digital/nets";
import { defaultRules } from "@/sim/faults/rules";
import { createProbeTap } from "@/sim/probe/tap";
import { loadRegistry } from "@/sim/registry/entries";
import { createInterpEngine, type InterpEngine } from "./engines/interp-engine";
import { boardIdOf, createSimHandler, type SimEngine } from "./handler";

const parts = builtinRegistry();

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

serveWorker(
  self as unknown as WorkerScopeLike,
  createSimHandler({
    diag: self.name === "sim-diag",
    wallMs: () => performance.now(),
    schedule: (fn) => void setTimeout(fn, 0),
    makeEngine: (program, net, opts) => {
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
    faults: {
      describe: (id) => {
        const [ref = "", version = ""] = id.split("@");
        return parts.get(ref, version);
      },
      rules: defaultRules,
    },
    makeTap: () => createProbeTap({ analog: noAnalog, registry: loadRegistry(), modelOf: () => [] }),
  }),
);
