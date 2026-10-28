import { INTERP_LANGUAGE } from "@/lib/interp";
import type { BoardId } from "@/lib/interp/profiles";
import { serveWorker, type WorkerScopeLike } from "@/protocol";
import { createDigitalNets } from "@/sim/digital/nets";
import { createInterpEngine } from "./engines/interp-engine";
import { createSimHandler } from "./handler";

/** A part reference such as `core.uno-r3@1.0.0` names the board profile `uno-r3`. */
const boardIdOf = (descriptor: string): BoardId => descriptor.replace(/^core\./, "").replace(/@.*$/, "") as BoardId;

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
  }),
);
