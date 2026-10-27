// Optimistic client: confirmed state (server order) + pending ops replayed on top as the view.
import { createHash } from "node:crypto";
import { applyOp, clone, emptyState, txText } from "./doc.js";

const next = (prev, op) => createHash("sha1").update(prev + JSON.stringify(op)).digest("hex").slice(0, 16);

export class Client {
  constructor(cid, send, bugs = {}) {
    this.cid = cid;
    this.send = send;
    this.bugs = bugs;
    this.confirmed = emptyState();
    this.lastSeq = 0;
    this.chain = "";
    this.pending = []; // {opId, op, baseRev?, undo}
    this.inflight = null;
    this.undoStack = [];
    this.connected = false;
    this.ready = false; // welcome processed
    this.n = 0;
    this._view = null;
    this.acked = new Map(); // opId -> seq, the oracle for "no lost acknowledged op"
    this.stats = { generated: 0, localInvalid: 0, rejected: 0, undos: 0, resends: 0, snapshots: 0, tails: 0, applied: 0 };
    this.rejectedIds = new Set();
  }

  view() {
    if (!this._view) {
      const v = clone(this.confirmed);
      for (const p of this.pending) if (!p.noPreview) applyOp(v, p.op, this.bugs);
      this._view = v;
    }
    return this._view;
  }

  nextId(prefix) {
    return `${this.cid}-${prefix}${++this.n}`;
  }

  /** Optimistic local edit. Returns false when it is already invalid in the local view. */
  submit(op, { undo = false, baseRev, noPreview = false } = {}) {
    this.stats.generated++;
    if (!noPreview) {
      const v = this.view();
      const r = applyOp(v, op, this.bugs);
      if (!r.ok) {
        this._view = null;
        this.stats.localInvalid++;
        return false;
      }
    }
    this.pending.push({ opId: `${this.cid}:${++this.n}`, op, baseRev, undo, noPreview });
    this.pump();
    return true;
  }

  undo() {
    const inv = this.undoStack.pop();
    if (!inv) return false;
    this.stats.undos++;
    const isText = inv.k === "editCode";
    return this.submit(inv, { undo: true, baseRev: inv.baseRev, noPreview: isText });
  }

  pump() {
    if (!this.connected || !this.ready || this.inflight || this.pending.length === 0) return;
    const item = this.pending[0];
    this.inflight = item;
    if (item.baseRev === undefined) item.baseRev = this.lastSeq;
    this.send({ t: "op", cid: this.cid, opId: item.opId, baseRev: item.baseRev, op: item.op });
  }

  onConnect() {
    this.connected = true;
    this.ready = false;
    this.send({ t: "hello", cid: this.cid, lastSeq: this.lastSeq });
  }

  onDisconnect() {
    this.connected = false;
    this.ready = false;
  }

  receive(m) {
    if (m.t === "welcome") {
      if (m.snapshot) {
        const s = JSON.parse(m.snapshot.json);
        this.confirmed = s.state;
        this.chain = s.chain;
        this.lastSeq = m.snapshot.seq;
        this.stats.snapshots++;
      } else this.stats.tails++;
      this._view = null;
      for (const e of m.entries) this.onApply(e);
      this.ready = true;
      if (this.inflight) {
        this.stats.resends++;
        this.send({ t: "op", cid: this.cid, opId: this.inflight.opId, baseRev: this.inflight.baseRev, op: this.inflight.op });
      } else this.pump();
    } else if (m.t === "apply") this.onApply(m);
    else if (m.t === "reject") {
      if (this.inflight && this.inflight.opId === m.opId) {
        this.pending.shift();
        this.inflight = null;
        this.stats.rejected++;
        this.rejectedIds.add(m.opId);
        this._view = null;
        this.pump();
      }
    }
  }

  onApply(f) {
    const mine = f.cid === this.cid && this.inflight && this.inflight.opId === f.opId;
    if (f.seq === this.lastSeq + 1) {
      if (this.bugs.clientDrop && f.seq % this.bugs.clientDrop === 0 && f.cid !== this.cid) {
        this.lastSeq = f.seq; // simulated bug: skips applying one remote op
      } else {
        const r = applyOp(this.confirmed, f.op, this.bugs);
        if (!r.ok) throw new Error(`client ${this.cid} could not apply seq ${f.seq}: ${r.reason}`);
        this.lastSeq = f.seq;
        this.chain = next(this.chain, f.op);
        if (this.chain !== f.chain && !this.bugs.clientDrop) throw new Error(`chain mismatch at ${f.seq}`);
        this.stats.applied++;
        if (!mine && f.op.k === "editCode") {
          for (const p of this.pending) {
            if (p !== this.inflight && !p.undo && p.op.k === "editCode" && p.op.file === f.op.file) p.op = txText(p.op, f.op);
          }
        }
      }
    } else if (f.seq > this.lastSeq + 1) {
      throw new Error(`gap: have ${this.lastSeq}, got ${f.seq}`);
    }
    if (mine) {
      const wasUndo = this.inflight.undo;
      this.pending.shift();
      this.inflight = null;
      this.acked.set(f.opId, f.seq);
      if (!wasUndo && f.inv) {
        this.undoStack.push(f.inv.k === "editCode" ? { ...f.inv, baseRev: f.seq } : f.inv);
        if (this.undoStack.length > 50) this.undoStack.shift();
      }
      this.pump();
    }
    this._view = null;
  }
}
