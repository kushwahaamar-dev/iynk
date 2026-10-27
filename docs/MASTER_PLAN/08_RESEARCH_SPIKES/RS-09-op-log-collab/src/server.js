// Transport-agnostic ordering server: assigns seq, validates, keeps log, checkpoints and dedup.
import { createHash } from "node:crypto";
import { applyOp, clone, emptyState, txText } from "./doc.js";

const next = (prev, op) => createHash("sha1").update(prev + JSON.stringify(op)).digest("hex").slice(0, 16);

export class Server {
  constructor({ retention = Infinity, ckptEvery = 1000, bugs = {} } = {}) {
    this.state = emptyState();
    this.seq = 0;
    this.retention = retention;
    this.ckptEvery = ckptEvery;
    this.bugs = bugs;
    this.log = []; // entries {seq, cid, opId, op, inv, chain}
    this.logStart = 1; // seq of log[0]
    this.chains = [""]; // chains[seq], kept in full for the test oracle
    this.textLog = new Map(); // file -> [{seq, pos, del, ins}]
    this.ckpts = [{ seq: 0, json: JSON.stringify({ state: this.state, chain: "" }) }];
    this.last = new Map(); // cid -> {opId, res}
    this.counters = { accepted: 0, rejected: 0, dups: 0, staleBase: 0 };
    this.rejectReasons = {};
  }

  /** Returns { type: 'apply', entry, dup } | { type: 'reject', opId, reason, dup }. */
  submit(cid, opId, baseRev, op) {
    const prev = this.last.get(cid);
    if (!this.bugs.noDedup && prev && prev.opId === opId) {
      this.counters.dups++;
      return { ...prev.res, dup: true };
    }
    let res;
    let cand = op;
    if (op.k === "editCode") {
      if (baseRev < this.logStart - 1) {
        this.counters.staleBase++;
        res = { type: "reject", opId, reason: "stale_base" };
      } else {
        for (const h of this.textLog.get(op.file) ?? []) if (h.seq > baseRev) cand = txText(cand, h);
      }
    }
    if (!res) {
      const r = applyOp(this.state, cand, this.bugs);
      if (!r.ok) {
        res = { type: "reject", opId, reason: r.reason };
      } else {
        const seq = ++this.seq;
        const chain = next(this.chains[seq - 1], r.op);
        this.chains[seq] = chain;
        const entry = { seq, cid, opId, op: r.op, inv: r.inv, chain };
        this.log.push(entry);
        if (r.op.k === "editCode") {
          const l = this.textLog.get(r.op.file) ?? [];
          l.push({ seq, pos: r.op.pos, del: r.op.del, ins: r.op.ins });
          this.textLog.set(r.op.file, l);
        }
        if (seq % this.ckptEvery === 0) this.ckpts.push({ seq, json: JSON.stringify({ state: this.state, chain }) });
        while (this.log.length > this.retention) {
          this.log.shift();
          this.logStart++;
        }
        res = { type: "apply", entry };
      }
    }
    if (res.type === "reject") {
      this.counters.rejected++;
      this.rejectReasons[res.reason] = (this.rejectReasons[res.reason] ?? 0) + 1;
    } else this.counters.accepted++;
    this.last.set(cid, { opId, res });
    return res;
  }

  /** Reconnect: tail if the client's last seq is still in the log, else latest checkpoint plus tail. */
  hello(lastSeq) {
    if (lastSeq > this.seq) lastSeq = -1;
    let snapshot = null;
    let from = lastSeq;
    if (lastSeq < 0 || lastSeq + 1 < this.logStart) {
      const c = this.ckpts.filter((k) => k.seq + 1 >= this.logStart).pop() ?? this.ckpts[this.ckpts.length - 1];
      snapshot = { seq: c.seq, json: c.json };
      from = c.seq;
    }
    const entries = this.log.slice(Math.max(0, from + 1 - this.logStart));
    return { snapshot, entries, seq: this.seq };
  }

  frame(entry, cid) {
    const f = { t: "apply", seq: entry.seq, cid: entry.cid, opId: entry.opId, op: entry.op, chain: entry.chain };
    if (entry.cid === cid) f.inv = entry.inv;
    return f;
  }
}
