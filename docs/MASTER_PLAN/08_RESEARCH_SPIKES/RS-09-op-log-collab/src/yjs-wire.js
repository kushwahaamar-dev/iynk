// Same document in Yjs: what happens to wires and ids under offline concurrent edits (informs RS-20).
import * as Y from "yjs";
import { Server } from "./server.js";
import fc from "fast-check";
import { runScenario, stepArb } from "./sim.js";

const mk = () => {
  const d = new Y.Doc();
  return { d, parts: d.getMap("parts"), wires: d.getMap("wires"), code: d.getMap("code") };
};
const sync = (a, b) => {
  const ua = Y.encodeStateAsUpdate(a.d, Y.encodeStateVector(b.d));
  const ub = Y.encodeStateAsUpdate(b.d, Y.encodeStateVector(a.d));
  Y.applyUpdate(b.d, ua);
  Y.applyUpdate(a.d, ub);
};
const part = (m, id, x, y) => { const p = new Y.Map(); p.set("type", "led"); p.set("x", x); p.set("y", y); m.set(id, p); };
const wire = (m, id, f, t) => { const w = new Y.Map(); w.set("from", f); w.set("to", t); m.set(id, w); };
const dangling = (s) => [...s.wires.entries()].filter(([, w]) => !s.parts.has(w.get("from").p) || !s.parts.has(w.get("to").p)).map(([id]) => id);
const base = () => {
  const A = mk(), B = mk();
  part(A.parts, "p1", 0, 0); part(A.parts, "p2", 10, 10);
  A.code.set("main.ino", new Y.Text("hello"));
  sync(A, B);
  return { A, B };
};
const out = {};

// 1. A deletes part p2 while B (offline) wires p1 to p2
{
  const { A, B } = base();
  A.parts.delete("p2");
  wire(B.wires, "w1", { p: "p1", pin: 0 }, { p: "p2", pin: 1 });
  sync(A, B);
  out.deleteVsOfflineWire = { aDangling: dangling(A), bDangling: dangling(B), partsA: [...A.parts.keys()], wiresA: [...A.wires.keys()], converged: JSON.stringify(A.d.toJSON()) === JSON.stringify(B.d.toJSON()) };
  // a deterministic sweep run on both replicas after merge
  for (const s of [A, B]) for (const id of dangling(s)) s.wires.delete(id);
  sync(A, B);
  out.afterSweepOnBoth = { aDangling: dangling(A), bDangling: dangling(B), converged: JSON.stringify(A.d.toJSON()) === JSON.stringify(B.d.toJSON()) };
}
// 2. two clients add the same id offline
{
  const { A, B } = base();
  part(A.parts, "dup", 1, 1);
  part(B.parts, "dup", 99, 99);
  sync(A, B);
  out.sameIdAddedOffline = { survivor: A.parts.get("dup").toJSON(), same: JSON.stringify(A.d.toJSON()) === JSON.stringify(B.d.toJSON()), note: "one add silently overwritten, no rejection" };
}
// 3. delete vs concurrent move
{
  const { A, B } = base();
  A.parts.delete("p1");
  B.parts.get("p1").set("x", 55);
  sync(A, B);
  out.deleteVsMove = { partExists: A.parts.has("p1") };
}
// 4. concurrent code edits
{
  const { A, B } = base();
  A.code.get("main.ino").insert(0, "AA");
  B.code.get("main.ino").insert(5, "BB");
  sync(A, B);
  out.concurrentCodeEdits = { text: A.code.get("main.ino").toString(), same: A.code.get("main.ino").toString() === B.code.get("main.ino").toString() };
}
// 5. undo with Y.UndoManager: A undoes own move after B moved the same part
{
  const { A, B } = base();
  const um = new Y.UndoManager(A.parts, { trackedOrigins: new Set(["a"]) });
  A.d.transact(() => A.parts.get("p1").set("x", 7), "a");
  sync(A, B);
  B.parts.get("p1").set("x", 8);
  sync(A, B);
  um.undo();
  sync(A, B);
  out.undoAfterRemoteMove = { x: A.parts.get("p1").get("x"), note: "UndoManager only undoes tracked origins; result after remote overwrite" };
}

// 6. cost: replay the op-log workload into Yjs, compare sizes and load time
const [steps] = fc.sample(fc.array(stepArb, { minLength: 26000, maxLength: 26000 }), { numRuns: 1, seed: 7 });
const srv = runScenario(steps, { keep: true }).server;
const Y1 = mk();
let t0 = performance.now();
for (const { op } of srv.log) {
  switch (op.k) {
    case "addPart": part(Y1.parts, op.id, op.x, op.y); break;
    case "movePart": { const p = Y1.parts.get(op.id); if (p) { p.set("x", op.x); p.set("y", op.y); } break; }
    case "delPart": Y1.parts.delete(op.id); for (const [id, w] of [...Y1.wires.entries()]) if (w.get("from").p === op.id || w.get("to").p === op.id) Y1.wires.delete(id); break;
    case "restorePart": part(Y1.parts, op.part.id, op.part.x, op.part.y); break;
    case "addWire": wire(Y1.wires, op.id, op.from, op.to); break;
    case "delWire": Y1.wires.delete(op.id); break;
    case "editCode": { let t = Y1.code.get(op.file); if (!t) { t = new Y.Text(); Y1.code.set(op.file, t); } if (op.del) t.delete(op.pos, op.del); if (op.ins) t.insert(op.pos, op.ins); break; }
  }
}
const replayMs = performance.now() - t0;
const upd = Y.encodeStateAsUpdate(Y1.d);
t0 = performance.now();
const Y2 = mk();
Y.applyUpdate(Y2.d, upd);
const loadMs = performance.now() - t0;
out.costOfSameWorkload = { opsReplayed: srv.log.length, replayMs: Math.round(replayMs), yjsFullUpdateBytes: upd.length, yjsLoadMs: +loadMs.toFixed(1), opLogJsonBytes: JSON.stringify(srv.log.map((e) => e.op)).length, opLogSnapshotJsonBytes: JSON.stringify(srv.state).length, codeCharsEqualToOpLog: ["main.ino", "util.h", "notes.txt"].every((f) => Y2.code.get(f).toString() === srv.state.code[f]) };
console.log(JSON.stringify(out, null, 2));
