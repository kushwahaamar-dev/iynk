// Reads the figure data (circuits, header pin tables, bench wires, part legs) without a browser.
//
// A figure file is plain JavaScript that registers itself on `SL.bench`. Each file runs in its own `node:vm` context
// against a stub of that object; every browser global a file touches at load time answers with a tolerant proxy.
// Geometry never runs, so nothing here needs a canvas. Method and measurements: docs/MASTER_PLAN/08_RESEARCH_SPIKES/AX-B2-02.

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Language built-ins a figure file may use at load. Everything else it asks for is a browser global.
const BUILTINS = [
  'undefined', 'NaN', 'Infinity', 'Error', 'TypeError', 'RangeError', 'SyntaxError', 'ReferenceError', 'String', 'Number',
  'Boolean', 'Symbol', 'BigInt', 'Date', 'RegExp', 'Promise', 'Reflect', 'Proxy', 'WeakMap', 'WeakSet', 'parseInt',
  'parseFloat', 'isNaN', 'isFinite', 'encodeURIComponent', 'decodeURIComponent',
];

// A value that tolerates any use: call it, read from it, index it, join it into a string.
const tolerant = new Proxy(function () {}, {
  get: (_, key) => (key === Symbol.toPrimitive ? () => '' : key === 'then' ? undefined : tolerant),
  apply: () => tolerant,
  construct: () => tolerant,
});

const clean = (value) => JSON.parse(JSON.stringify(value));

const copyDef = (v) =>
  Array.isArray(v)
    ? v.map(copyDef)
    : v && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype
      ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, copyDef(x)]))
      : v;

let loaded;

function loadRegistry() {
  if (loaded) return loaded;
  const defs = { board: {}, module: {}, bench: {} };
  const parts = {};
  const kinds = new Set();
  const byFile = new Map();
  const failures = [];
  let current = null;

  const store = { defs, parts, kinds: {}, T: (s) => s, note: () => {} };
  const B = new Proxy(store, { get: (t, k) => (k in t ? t[k] : tolerant) });
  const register = (type) => (def) => {
    if (def && typeof def.id === 'string') defs[type][def.id] = def;
    if (current) byFile.set(current, { kind: type, def });
  };
  store.board = register('board');
  store.module = register('module');
  store.bench = register('bench');
  store.part = (name, def) => {
    parts[name] = def;
    if (current) byFile.set(current, { kind: 'part', def });
  };
  store.kind = (name, def) => {
    kinds.add(name);
    store.kinds[name] = def;
  };
  store.prop = () => {};
  store.withVariant = (def, variant) => {
    const v = def && def.variants && variant ? def.variants[variant] : null;
    return v && typeof v.patch === 'function' ? v.patch(copyDef(def)) || def : def;
  };

  const load = (rel) => {
    const src = readFileSync(join(root, rel), 'utf8');
    const g = { SL: { bench: B }, CF_T: (s) => s, CF_Q: new URLSearchParams(''), location: { pathname: '/' }, console, Math, Object, Array, JSON, Set, Map };
    for (const name of BUILTINS) g[name] = globalThis[name];
    g.window = g;
    const scope = new Proxy(g, {
      has: () => true,
      get: (t, k) => (k === Symbol.unscopables ? undefined : k in t ? t[k] : tolerant),
    });
    current = rel;
    try {
      new vm.Script(`with (__scope) {\n${src}\n}`, { filename: rel, lineOffset: -1 }).runInContext(vm.createContext({ __scope: scope }), { timeout: 2000 });
    } catch (e) {
      const at = /:(\d+)(?::\d+)?\)?$/m.exec((e.stack || '').split('\n').find((l) => l.includes(rel)) || '');
      failures.push(`${rel}${at ? `:${at[1]}` : ''}: ${e.name}: ${e.message}`);
    }
    current = null;
  };

  // Benches read `B.defs.module.<id>` and the part models at load, so parts and modules come before them.
  for (const f of ['bench-bb', 'bench-kinds', 'bench-props']) load(`figures/engine/${f}.js`);
  for (const folder of ['parts', 'modules', 'boards', 'robotics']) {
    for (const f of readdirSync(join(root, 'figures', folder)).filter((n) => n.endsWith('.js')).sort()) load(`figures/${folder}/${f}`);
  }
  if (failures.length) throw new Error(`figure files failed to load:\n${failures.join('\n')}`);

  loaded = { defs, parts, kinds, byFile, withVariant: store.withVariant };
  return loaded;
}

const registered = (type, id) => {
  const def = loadRegistry().defs[type][id];
  if (!def) throw new Error(`no ${type} figure "${id}"`);
  return def;
};

// The board as the page shows it: the default variant applied.
const withDefaultVariant = (def) => loadRegistry().withVariant(def, def.variant);

// The header parts of a figure board, as the engine's prep() reads them: a part with a registered kind, a unique id
// and a `pins` array. A `null` entry keeps its position, so `IOH.5` is always the fifth entry.
function headersOf(def) {
  const { kinds } = loadRegistry();
  const seen = new Set();
  const headers = [];
  for (const part of def.parts || []) {
    if (!part || !kinds.has(part.kind) || !part.id || seen.has(part.id)) continue;
    seen.add(part.id);
    if (Array.isArray(part.pins)) headers.push({ id: part.id, pins: clean(part.pins) });
  }
  return headers;
}

export async function extractFigure(file) {
  const rel = relative(root, resolve(root, file));
  const found = loadRegistry().byFile.get(rel);
  if (!found) throw new Error(`${rel} registered no figure`);
  return { kind: found.kind, def: found.def };
}

export async function extractBoardCircuits(boardId) {
  return clean(withDefaultVariant(registered('board', boardId)).circuits || {});
}

export async function extractBoardHeaders(boardId) {
  return headersOf(withDefaultVariant(registered('board', boardId)));
}

export async function extractBench(id) {
  const { defs, withVariant } = loadRegistry();
  const def = registered('bench', id);
  const reg = def.board ? defs.board[def.board] || defs.module[def.board] : null;
  if (def.board && !reg) throw new Error(`bench ${id}: no figure for its board "${def.board}"`);
  const base = reg ? withVariant(reg, def.variant || reg.variant) : null;

  const inherited = (base && base.circuits) || {};
  const circuits = Object.fromEntries(
    Object.entries(def.circuits || {}).filter(([key, circuit]) => !inherited[key] || JSON.stringify(inherited[key]) !== JSON.stringify(circuit)),
  );

  const periph = def.periph || [];
  const periphHeaders = {};
  for (const item of periph) {
    const board = item.board && (defs.board[item.board] || defs.module[item.board]);
    if (board) periphHeaders[item.id] = headersOf(withVariant(board, item.variant || board.variant));
  }

  return clean({
    id,
    board: def.board ?? null,
    ...(base && (def.variant || reg.variant) ? { variant: def.variant || reg.variant } : {}),
    periph: periph.map(({ id: periphId, board, part, variant }) => ({ id: periphId, board, part, variant })),
    wires: (def.wires || []).map(({ from, to, color }) => ({ from, to, color })),
    pinMap: def.pinMap || {},
    circuits,
    headers: base ? headersOf(base) : [],
    periphHeaders,
  });
}

export async function extractPartLegs(file) {
  const { kind, def } = await extractFigure(file);
  if (kind !== 'part') throw new Error(`${file} is a ${kind} figure, not a part`);
  return clean(def.legs || []);
}
