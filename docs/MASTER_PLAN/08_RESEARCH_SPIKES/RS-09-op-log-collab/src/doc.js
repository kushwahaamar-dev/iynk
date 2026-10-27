// Minimal project document and its operations. Shared by server and client.
import { createHash } from "node:crypto";

export const FILES = ["main.ino", "util.h", "notes.txt"];
export const PART_TYPES = ["led", "resistor", "mcu", "button", "servo"];
export const MAX_PARTS = 200;
export const MAX_INS = 200;

export const emptyState = () => ({ parts: {}, wires: {}, code: Object.fromEntries(FILES.map((f) => [f, ""])) });
export const clone = (s) => structuredClone(s);

const sortObj = (o) => Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]));
export const canonical = (s) =>
  JSON.stringify({ parts: sortObj(s.parts), wires: sortObj(s.wires), code: sortObj(s.code) });
export const hash = (s) => createHash("sha256").update(canonical(s)).digest("hex");

const num = (n) => typeof n === "number" && Number.isFinite(n) && Math.abs(n) < 1e6;
const str = (s, max = 64) => typeof s === "string" && s.length > 0 && s.length <= max;
const endpoint = (e) => e && str(e.p) && Number.isInteger(e.pin) && e.pin >= 0 && e.pin < 16;

export function danglingWires(s) {
  return Object.values(s.wires).filter((w) => !s.parts[w.from.p] || !s.parts[w.to.p]);
}

/** Single-range text op a, transformed to apply after b (b already applied). Server order wins ties. */
export function txText(a, b) {
  const bEnd = b.pos + b.del;
  const bl = b.ins.length;
  const start = (p) => (p < b.pos ? p : p >= bEnd ? p - b.del + bl : b.pos + bl);
  const end = (p) => (p <= b.pos ? p : p >= bEnd ? p - b.del + bl : b.pos);
  const pos = start(a.pos);
  const del = a.del === 0 ? 0 : Math.max(pos, end(a.pos + a.del)) - pos;
  return { ...a, pos, del };
}

const ok = (op, inv) => ({ ok: true, op, inv });
const bad = (reason) => ({ ok: false, reason });

/**
 * Validates and applies one op to `s` (mutates only on success).
 * Returns { ok: true, op, inv } or { ok: false, reason }. `inv` is the inverse op computed against the pre-state.
 */
export function applyOp(s, op, bugs = {}) {
  switch (op.k) {
    case "addPart": {
      if (!str(op.id) || !PART_TYPES.includes(op.type) || !num(op.x) || !num(op.y)) return bad("malformed");
      if (s.parts[op.id]) return bad("duplicate_id");
      if (Object.keys(s.parts).length >= MAX_PARTS) return bad("quota");
      s.parts[op.id] = { id: op.id, type: op.type, x: op.x, y: op.y };
      return ok(op, { k: "delPart", id: op.id });
    }
    case "movePart": {
      const p = s.parts[op.id];
      if (!p) return bad("missing_part");
      if (!num(op.x) || !num(op.y)) return bad("malformed");
      const inv = { k: "movePart", id: op.id, x: p.x, y: p.y };
      p.x = op.x;
      p.y = op.y;
      return ok(op, inv);
    }
    case "delPart": {
      const p = s.parts[op.id];
      if (!p) return bad("missing_part");
      const gone = [];
      if (!bugs.noCascade) {
        for (const w of Object.values(s.wires)) {
          if (w.from.p === op.id || w.to.p === op.id) {
            gone.push(w);
            delete s.wires[w.id];
          }
        }
      }
      delete s.parts[op.id];
      return ok(op, { k: "restorePart", part: p, wires: gone });
    }
    case "restorePart": {
      if (!op.part || !str(op.part.id)) return bad("malformed");
      if (s.parts[op.part.id]) return bad("duplicate_id");
      s.parts[op.part.id] = { ...op.part };
      for (const w of op.wires) {
        if (!s.wires[w.id] && s.parts[w.from.p] && s.parts[w.to.p]) s.wires[w.id] = w;
      }
      return ok(op, { k: "delPart", id: op.part.id });
    }
    case "addWire": {
      if (!str(op.id) || !endpoint(op.from) || !endpoint(op.to)) return bad("malformed");
      if (s.wires[op.id]) return bad("duplicate_id");
      if (!s.parts[op.from.p] || !s.parts[op.to.p]) return bad("dangling_wire");
      if (op.from.p === op.to.p && op.from.pin === op.to.pin) return bad("self_wire");
      s.wires[op.id] = { id: op.id, from: { ...op.from }, to: { ...op.to } };
      return ok(op, { k: "delWire", id: op.id });
    }
    case "delWire": {
      const w = s.wires[op.id];
      if (!w) return bad("missing_wire");
      delete s.wires[op.id];
      return ok(op, { k: "addWire", ...w });
    }
    case "editCode": {
      const t = s.code[op.file];
      if (t === undefined) return bad("missing_file");
      if (!Number.isInteger(op.pos) || !Number.isInteger(op.del) || typeof op.ins !== "string") return bad("malformed");
      if (op.ins.length > MAX_INS) return bad("too_long");
      const pos = Math.max(0, Math.min(op.pos, t.length));
      const del = Math.max(0, Math.min(op.del, t.length - pos));
      const removed = t.slice(pos, pos + del);
      s.code[op.file] = t.slice(0, pos) + op.ins + t.slice(pos + del);
      const applied = { k: "editCode", file: op.file, pos, del, ins: op.ins };
      return ok(applied, { k: "editCode", file: op.file, pos, del: op.ins.length, ins: removed });
    }
    default:
      return bad("unknown_op");
  }
}
