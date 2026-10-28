import { INTERP_LANGUAGE } from "@/lib/interp";
import type { BoardId } from "@/lib/interp/profiles";
import { serveWorker, type WorkerScopeLike } from "@/protocol";
import type { DigitalLayer } from "@/sim/engine";
import { createInterpEngine } from "./engines/interp-engine";
import { createSimHandler } from "./handler";

const noDigital = (): DigitalLayer => ({
  load: () => [],
  onPin: () => undefined,
  partStates: () => [],
  stateHash: () => "",
});

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
        board: (board?.descriptor ?? "") as BoardId,
        language: INTERP_LANGUAGE[program.language as keyof typeof INTERP_LANGUAGE] ?? "arduino",
        seed: opts.seed,
      });
    },
    makeDigital: noDigital,
  }),
);
