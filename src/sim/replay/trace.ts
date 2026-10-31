import { StateHasher } from "../core/hash.ts";
import type { SimTime } from "../core/clock.ts";
import { RANK } from "../engine.ts";
import type { Orchestrator, PinEdge } from "../orchestrator.ts";
import { PROBE_ENGINE_ID } from "../probe/tap.ts";

/** Hash of the pin edges in order: time, net and level of each. */
export function pinTraceHash(edges: readonly PinEdge[]): string {
  const hasher = new StateHasher().int(edges.length);
  for (const edge of edges) hasher.int(edge.at).str(edge.net).str(String(edge.level));
  return hasher.hex();
}

/** Hash of the serial output in order: time and text of each write. */
export function serialHash(lines: ReadonlyArray<{ at: SimTime; text: string }>): string {
  const hasher = new StateHasher().int(lines.length);
  for (const line of lines) hasher.int(line.at).str(line.text);
  return hasher.hex();
}

const ANALOG_ENGINE_ID = "engine:analog-live";
/** A display value is hashed in whole millivolts and whole microamperes: finer changes are not shown. */
const MILLI = 1e3;
const MICRO = 1e6;

interface AnalogSnapshot {
  components: Array<{
    ok: boolean;
    last: {
      v: number[];
      branch: Record<string, { amps: number }>;
      state: Record<string, string>;
    } | null;
  }>;
  damaged: Array<[string, unknown]>;
}

const rounded = (x: number, per: number): number => (Number.isFinite(x) ? Math.round(x * per) : 0);

/**
 * `hb` covers what decides the run: engines, digital nets and the queued events, without the analog solver and the
 * probe tap. `hd` covers what the user sees of the analog side, rounded to what a meter shows.
 */
export function classHashes(o: Orchestrator): { hb: string; hd: string } {
  const snap = o.snapshot({ docHash: "", logCursor: 0 });
  const hb = new StateHasher().str(snap.stateHash).int(snap.at).int(snap.seqNext);
  for (const e of snap.queue) {
    if (e.rank === RANK.analog || e.src === PROBE_ENGINE_ID) continue;
    hb.int(e.at).int(e.phase).int(e.rank).int(e.seq).str(e.src).str(e.kind).obj(JSON.parse(JSON.stringify(e.payload ?? null)));
  }
  const hd = new StateHasher();
  const analog = snap.engines.find((e) => e.engine === ANALOG_ENGINE_ID)?.data as AnalogSnapshot | undefined;
  for (const c of analog?.components ?? []) {
    hd.bool(c.ok);
    if (!c.last) continue;
    for (const v of c.last.v) hd.int(rounded(v, MILLI));
    for (const id of Object.keys(c.last.branch).sort()) hd.str(id).int(rounded(c.last.branch[id].amps, MICRO));
    for (const id of Object.keys(c.last.state).sort()) hd.str(id).str(c.last.state[id]);
  }
  for (const [id] of analog?.damaged ?? []) hd.str(id);
  return { hb: hb.hex(), hd: hd.hex() };
}
