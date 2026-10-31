import type { OrchestratorSnapshot } from "../engine.ts";
import type { Orchestrator } from "../orchestrator.ts";
import type { ReplayRecord } from "./record.ts";

/** The `data` of an interpreter's `EngineSnapshot`: a cut point, not machine state. */
export interface InterpSnapshotData {
  sourceHash: string;
  virtualNs: number;
  inputCursor: number;
}

export function takeSnapshot(o: Orchestrator, rec: Pick<ReplayRecord, "docHash" | "inputs">): OrchestratorSnapshot {
  const later = rec.inputs.findIndex((i) => i.at > o.now);
  return o.snapshot({ docHash: rec.docHash, logCursor: later === -1 ? rec.inputs.length : later });
}
