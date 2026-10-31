import { INTERP_LANGUAGE } from "@/lib/interp";
import { builtinRegistry } from "@/parts/builtin";
import { serveWorker, type WorkerScopeLike } from "@/protocol";
import { createDigitalNets } from "@/sim/digital/nets";
import { defaultRules } from "@/sim/faults/rules";
import { createProbeTap } from "@/sim/probe/tap";
import { loadRegistry } from "@/sim/registry/entries";
import { createInterpEngine } from "./engines/interp-engine";
import { boardIdOf, createSimHandler } from "./handler";

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
