# AX-B2-02: reading the figure circuits of all 38 items without a browser

Task T-B2-18, phase B2. Date 2026-10-28. Method: a plain Node script (`node:vm`, no jsdom, no browser) run over the figure files at `build/v1` (79d623f). Nothing in the repo was edited. All numbers below are MEASURED by the script at the end of this report unless a line says otherwise.

## Verdict

| Question | Verdict | Number |
|---|---|---|
| Q1 Boards | PASS. All 12 files yield `circuits`; every non-null `Lesson.circuit` key exists | 12 of 12 boards; 57 circuit keys; 71 lessons, 57 with a circuit, 14 without; 0 missing keys, 0 unused keys |
| Q2 Benches | PASS. Every wire endpoint of every bench resolves | 13 of 13 benches resolve every wire (10 or more needed); 0 deferred |
| Q3 Part legs | 28 of 29 files declare a non-empty `legs` array (vm); a regex finds 27 | `breadboard.js` has `legs: []`; `mpu6050.js` has `legs: LABELS`, which a regex misses |
| Q4 Spellings | 0 unresolved endpoints in 64 circuits and 13 benches | 512 circuit endpoints plus 184 bench-wire endpoints; spelling table below |
| Q5 Crafts | CONFIRMED: no craft has a pin-level wire | 13 of 13 crafts; 109 wiring entries, all between part ids |

Whole run: 46 ms (limit 10 s). The script needed no jsdom and no change to a figure file. Loading threw no error in any of the 12 board files, 12 module files, 29 part files, 13 bench files or the three engine files `bench-bb.js`, `bench-kinds.js`, `bench-props.js`.

Consequence for the exit gate: the figure side of "38 of 38" is reachable. The 12 boards and 13 benches can be read in Node; the 13 crafts need no figure.

## How the reader works (what T-B2-14 must copy)

1. One `SL.bench` stub `B` for the whole run, backed by a store with the registries the engine has: `B.defs.{board,module,bench}`, `B.parts`, `B.kind` (names kept), `B.part`, `B.board`, `B.module`, `B.bench`, `B.withVariant` (the engine's copy of `bench.js:1227`), `B.T`. Any other `B.*` read returns a callable Proxy that tolerates being called, indexed or concatenated.
2. Each file runs in its own `vm` context under `with (scopeProxy) { ... }`. The scope proxy answers `has` with true and returns a tolerant Proxy for any browser global (`CF_*`, `INK`, `rod`, `matOf`, ...), so top-level helpers like `mpu6050.js:22` do not throw.
3. Load order: `engine/bench-bb.js` (so `B.bbGeom` and `B.hole` are the real engine code, with the real regexes at `bench-bb.js:23-30`), `engine/bench-kinds.js` and `engine/bench-props.js` (to learn the 142 registered kind names), the 29 parts, the 12 modules, the 12 boards, then the 13 benches. The `// @cf use` lines are comments and are ignored; loading everything in this order replaces them. Benches read `B.defs.module.<id>` and `B.parts['tt-motor'].model` at load, so parts and modules must load first.
4. Pins are rebuilt as `prep()` does (`bench.js:78-87`): a part with a registered kind, a unique id and a `pins` array yields pin id `<part id>.<1-based index>` and a net; a null entry is skipped. Geometry is not needed to resolve an endpoint, so the 3D kinds never run.
5. A bench is merged as `B.benchToBoard` does (`bench.js:1236-1246`): variant patch of the base, then the bench over it. A bench's own circuits are the merged `circuits` entries that are not the same object as the base's (`uno-r3-build` spreads the Uno circuits into its own list).
6. The endpoint rule is the one in `bench-solve.js:33-39` `end()`: a breadboard hole or rail (`B.hole`), then `<circuit part>.<leg>` through the part's `legs`, then a board pin id (`md.pins`), then a net name (`md.netPins`). Anything else is unresolved. The script reports it; the figure drops it silently (`bench-solve.js:41-42`). The mutation check below proves the script does report.

## Q1. Boards (12 files, 57 circuits)

`Lesson.circuit` is read from `src/content/boards/<id>.ts` with one regex (a line starting `circuit: '<key>',` or `language: '...', circuit: '<key>',`). `esp32-s3-devkitc-1.ts` writes the field inline, the other files on its own line.

| Board | Default | Circuit keys | Parts | Wires | Lessons | With circuit | Missing keys |
|---|---|---|---|---|---|---|---|
| basys3 | pmod-led | 1 | 2 | 2 | 5 | 1 | none |
| de10-lite | arduino-led | 1 | 2 | 2 | 5 | 1 | none |
| esp32-devkitc | blink | 5 | 10 | 11 | 5 | 5 | none |
| esp32-s3-devkitc-1 | blink | 4 | 9 | 11 | 4 | 4 | none |
| microbit-v2 | blink | 3 | 7 | 9 | 5 | 3 | none |
| nano | blink | 4 | 8 | 16 | 4 | 4 | none |
| nodemcu | blink | 4 | 9 | 12 | 4 | 4 | none |
| nucleo-f401re | blink | 5 | 8 | 18 | 5 | 5 | none |
| pi4-pi5 | blink | 5 | 15 | 19 | 5 | 5 | none |
| pico | blink | 5 | 11 | 17 | 6 | 5 | none |
| uno-r3 | blink | 15 | 50 | 89 | 16 | 15 | none |
| uno-r4 | blink | 5 | 9 | 17 | 7 | 5 | none |
| Total | | 57 | 140 | 223 | 71 | 57 | 0 |

PASS. The measured 57 and 14 match PDM 11.1 (VERIFIED there). The key set equals the lesson set exactly: no circuit is unused. Six uno-r3 circuits carry a `props` list (light, distance, heat, plant, force 2, parking): `c.props` are non-part items the converter must also read (`B.props[p.prop]`, `bench-bb.js` `bbParams`); the script counts them but does not resolve them.

## Q2. Benches (13 files)

Bench wires are the mat wires (`def.periph`, `def.wires`, `def.pinMap`); two benches also have breadboard circuits of their own. Ends resolve as `matEnd` in `bench.js:883-896`: `ID.pin` on a periph board (pin id, then net, then label), `ID.leg` on a periph part, else a base pin or net. `pinMap` keys and values must both be nets of the base or of a periph board.

| Bench | Base | Periph | Mat wires | Ends resolved | pinMap | Own circuits (parts / wires) | Unresolved |
|---|---|---|---|---|---|---|---|
| a4988 | a4988 | 4 | 9 | 18 of 18 | 5 | 0 | none |
| esp32-s3-build | esp32-s3-devkitc-1 (variant) | 0 | 0 | 0 of 0 | 0 | 0 | none |
| hc-sr04 | hc-sr04 | 2 | 6 | 12 of 12 | 2 | 0 | none |
| l298n | l298n | 4 | 11 | 22 of 22 | 4 | 0 | none |
| led-resistor | none | 0 | 0 | 0 of 0 | 0 | 0 | none |
| lm2596 | lm2596 | 3 | 4 | 8 of 8 | 0 | 0 | none |
| mpu6050 | mpu6050 | 2 | 6 | 12 of 12 | 2 | 0 | none |
| pca9685 | pca9685 | 3 | 15 | 30 of 30 | 2 | 0 | none |
| pi5-ros2 | pi4-pi5 (variant pi5) | 0 | 0 | 0 of 0 | 0 | 0 | none |
| qtr-8rc | qtr-8rc | 6 | 26 | 52 of 52 | 16 | 0 | none |
| tb6612fng | tb6612fng | 4 | 15 | 30 of 30 | 7 | 0 | none |
| transistor-switch | nano | 2 | 0 | 0 of 0 | 0 | 5 (33 / 27) | none |
| uno-r3-build | uno-r3 | 0 | 0 | 0 of 0 | 0 | 2 (5 / 6) | none |

Decision rule for T-B2-20a: at least 10 of 13 benches resolve every wire. Measured: 13 of 13. Verdict: T-B2-20a derives nets for all 13 and the deferred list `deferred: bench-circuit-unresolved` is empty. The legacy-data fallback (`nets = []` for all 13) is not needed.

Things the card did not say and T-B2-20a must know:
- The bench circuit key is `circuits` (plural) on `transistor-switch` and `uno-r3-build`; the singular `circuit` object form is not used by any of the 13 files. `circuit: 'bench'` in `transistor-switch.js:213` is a key into `circuits`.
- Five benches have no mat wires. Three of them (`esp32-s3-build`, `led-resistor`, `pi5-ros2`) have nothing to derive: the board is the whole bench, or there is no board. Their `nets` come from the base board only.
- Two benches use a base variant (`esp32-s3-build`, `pi5-ros2`). The pin table of the patched base is what the wires use, so the converter must apply the variant before it reads pins.
- `pinMap` maps a controller pin to a module net (`D8: 'IN1'`). The controller board is a periph item, the module is the base. It is data for the model, not a wire: the converter should not turn it into nets.
- Mat wires carry no current in the figure ("The wires carry no current", `bench.js:166`), so they are documentation wires. The converter still gets nets from them because the project model wants them.

## Q3. Part legs (29 files)

| Measure | Count |
|---|---|
| Files in `figures/parts/` | 29 |
| Non-empty `legs` by running the file (vm) | 28 |
| Non-empty `legs` by regex `legs:\s*\[...\]` | 27 |
| Empty `legs` | 1 (`breadboard.js`, `legs: []`) |

The regex misses `mpu6050.js:55` (`legs: LABELS`, eight legs: VCC, GND, SCL, SDA, XDA, XCL, AD0, INT). The grep expectation of 28 in the card is right for the vm; PDM 3.4's 27 is the regex number. The C-LEG test in T-B2-13 should use 28 (the measured value from running the files); the per-file legs are in the table printed by the script (`out.q3`). Leg names are strings, and several are not identifiers (`+`, `-`, `V+`, `+VS`), which the endpoint regex `[\w+~-]+` accepts.

## Q4. Endpoint spellings and unresolved endpoints

Counted over every wire end and every part `holes` entry of the 64 circuits (57 board, 7 bench) and the bench mat wires:

| Spelling | Count | Example | Unresolved |
|---|---|---|---|
| breadboard hole `[a-j]<col>` | 694 | `b10`, `c14` | 0 |
| rail `[TB][+-]<n>` | 30 | `T-28`, `T-19` | 0 |
| header pin id `<part>.<n>` | 161 | `IOH.5`, `POWER.6`, `J2.15` | 0 |
| net name | 132 | `D3`, `GND`, `GPIO23` | 0 |
| net or pin names that start with a digit or hold a second dot | 10 | `3V3`, `5V`, `DRV.JP2.8` | 0 |
| part leg `<circuit part>.<leg>` | 115 | `DRV1.IN1`, `NANO.D8`, `MOTA.+` | 0 |

Class of the 512 circuit wire ends only (the rule order of `end()`): hole 254, rail 24, part leg 6, header pin 88, net name 76, net name shared by several board pins 64, unresolved 0.

Findings:
- 0 unresolved endpoints and 0 holes outside the breadboard. The silent skip at `bench-solve.js:41-42` is never hit by the shipped data. The converter must still report `unresolved-endpoint`, because the next added circuit could hit it.
- `RES1.P1` style references do not occur in circuits: resistors use legs `1` and `2` and are placed by `holes`, not wired by leg. Only six circuit ends use `<part>.<leg>`: `DRV1.IN1` to `IN4`, `DRV1.GND` and `DRV1.VCC` in the Uno's stepper circuit (`uno-r3.js:334-339`). The comment above the Uno circuits ("the stepper circuit leaves its four signal wires out") is stale: the wires are there.
- 64 of the 140 net-name ends name a net that has several board pins (`GND`, `3V3`, `5V`). The figure picks the pin nearest the breadboard for drawing (`bench-bb.js:96-105`, geometry), but the solver joins by net, `add('N:' + pin.net)` (`bench-solve.js:39`). Rule for T-B2-14: a net-name endpoint is the net, not one pin; a header pin id (`IOH.4`) is one pin of the net. Picking a pin by distance would make the converter depend on geometry.
- A header pin id is `<board part id>.<1-based index>` in the board's `parts[].pins`; the Uno's `IOH`, `POWER` and the Basys 3's `JB` are such part ids. A `null` entry in `pins` leaves the index taken, so the index is the array position plus one, never a running count. This is the `IOH.n` to pin rule the T-B2-14 card asks for.
- Mutation check (scratch copy, not the repo): changing `IOH.5` to `IOH.99`, a hole to `b64` and `NANO.D8` to `NANO.D88` was reported as three unresolved items with a reason each. So 0 is a real result, not a blind reader.
- Not covered: wires and holes inside the `faults` edits (`{ wires: [...], holes: {...}, cut: [...] }`, `bench-bb.js:40-52`). Seven files have such edits, 11 in all (grep `wires: [{`: esp32-s3-devkitc-1 1, microbit-v2 2, nucleo-f401re 1, pico 3, pi4-pi5 1, uno-r4 2, transistor-switch 1). They use the same spellings, but this spike did not resolve them. T-B2-14 should run the same classifier over them.

## Q5. Crafts (13 files)

`DroneWire` is `{ from, to, kind, label, note }` (`src/content/schema.ts:615`). Every `wiring` entry in the 13 files in `src/content/drones/` joins part ids (`BATT`, `XT60`, `ESC`, `FC`, `RX`, `CAM`); the pad and protocol are in the free-text `label`. No endpoint holds a dot or colon.

| Craft | Wiring entries | Pin-level endpoints |
|---|---|---|
| agrihex | 10 | 0 |
| cinewhoop | 8 | 0 |
| delivery | 13 | 0 |
| gpscam | 9 | 0 |
| longrange | 8 | 0 |
| octo | 9 | 0 |
| quad5 | 7 | 0 |
| racer | 8 | 0 |
| swarm | 6 | 0 |
| tricopter | 8 | 0 |
| vtol | 10 | 0 |
| whoop | 7 | 0 |
| wing | 10 | 0 |

Confirmed: `nets = []` for all 13 crafts. (Entry counts come from a line count of the `wiring:` block; 109 in total.)

## The 38 items

| Type | Items | Circuit data readable in Node | Notes |
|---|---|---|---|
| Board | 12 | 12 of 12, 57 circuits | Q1 |
| Bench | 13 | 13 of 13, 7 own circuits and 92 mat wires | Q2 |
| Craft | 13 | not needed | Q5 |

Total 38 of 38 items have a circuit answer. The 12 module figures in `figures/modules/` are not catalogue items; they are read only as the base of the benches (they supply the header pins of `J1` to `J4`).

## For the builders

- T-B2-14: start from the script below. Move the pure part into `src/project/convert/` and keep the `vm` loading in `scripts/figure-extract.mjs` (the portable folder cannot read files). Keep the load order and the stub; add what the card needs on top (parts' `holes`, `props`, `plug`, fault edits).
- T-B2-13: C-LEG uses 28 non-empty `legs` files.
- T-B2-20a: derive nets for all 13 benches.
- Known limit of the stub: a figure file that reads a value from a browser global at load and branches on it would take the Proxy branch. None of the 12 + 12 + 29 + 13 files does (no load error, every circuit key matches the lessons).
- Reproduce: `node /Users/amar/iynk-master-plan-scratch/buildplan/T-B2-18/extract.mjs <repo> --json` (prints the objects `q1`, `q2`, `q3`, `circuits`, `spellings`).

## The extractor (`extract.mjs`)

```js
// Reads the figure circuits of the Board Bench without a browser. Usage: node extract.mjs <repo> [--json]
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';

const repo = path.resolve(process.argv[2] || '.');
const t0 = performance.now();

// a value that tolerates any use: call it, read from it, index it
const any = new Proxy(function () {}, {
  get: (_, k) => (k === Symbol.toPrimitive ? () => '' : k === 'then' ? undefined : any),
  apply: () => any,
  construct: () => any,
});

const defs = { board: {}, module: {}, bench: {} };
const parts = {};
const kinds = new Set();
const store = { defs, parts, kinds: {}, T: (s) => s, note: () => {} };
const B = new Proxy(store, { get: (t, k) => (k in t ? t[k] : any) });
const register = (type) => (def) => { if (def && typeof def.id === 'string') defs[type][def.id] = def; };
store.board = register('board');
store.module = register('module');
store.bench = register('bench');
store.part = (name, def) => { parts[name] = def; };
store.kind = (name, def) => { kinds.add(name); store.kinds[name] = def; };
store.prop = () => {};
const copyDef = (v) => Array.isArray(v) ? v.map(copyDef)
  : v && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype
    ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, copyDef(x)])) : v;
store.withVariant = (def, vk) => {
  const v = def && def.variants && vk ? def.variants[vk] : null;
  return v && typeof v.patch === 'function' ? v.patch(copyDef(def)) || def : def;
};

const loadErrors = {};
function load(rel) {
  const src = fs.readFileSync(path.join(repo, rel), 'utf8');
  const g = { SL: { bench: B }, CF_T: (s) => s, CF_Q: new URLSearchParams(''), location: { pathname: '/' }, console, Math, Object, Array, JSON, Set, Map };
  g.window = g;
  const scope = new Proxy(g, {
    has: () => true,
    get: (t, k) => (k === Symbol.unscopables ? undefined : k in t ? t[k] : any),
  });
  const ctx = vm.createContext({ __scope: scope });
  try {
    new vm.Script(`with (__scope) {\n${src}\n}`, { filename: rel, lineOffset: -1 }).runInContext(ctx, { timeout: 2000 });
  } catch (e) {
    const line = /:(\d+)(?::\d+)?\)?$/m.exec((e.stack || '').split('\n').find((l) => l.includes(rel)) || '');
    loadErrors[rel] = `${e.name}: ${e.message}${line ? ` (line ${line[1]})` : ''}`;
  }
}
const files = (dir) => fs.readdirSync(path.join(repo, 'figures', dir)).filter((f) => f.endsWith('.js')).sort();

load('figures/engine/bench-bb.js');
load('figures/engine/bench-kinds.js');
load('figures/engine/bench-props.js');
for (const f of files('parts')) load(`figures/parts/${f}`);
for (const f of files('modules')) load(`figures/modules/${f}`);
for (const f of files('boards')) load(`figures/boards/${f}`);
for (const f of files('robotics')) load(`figures/robotics/${f}`);

// the engine's prep(): pin ids and nets of a board def (kinds with no registration are skipped there too)
function pinsOf(def) {
  const pins = {}, netPins = {}, skipped = [], byId = new Set();
  for (const p of def.parts || []) {
    if (!kinds.has(p && p.kind)) { skipped.push(`${p && p.id}: unknown kind ${p && p.kind}`); continue; }
    if (!p.id || byId.has(p.id)) { skipped.push(`${p.id}: duplicate id`); continue; }
    byId.add(p.id);
    if (!Array.isArray(p.pins)) continue;
    p.pins.forEach((net, i) => {
      if (net === null) return;
      const id = `${p.id}.${i + 1}`;
      pins[id] = { id, part: p.id, n: i + 1, net: net || id, label: (p.labels && p.labels[i]) || net || id };
      if (net) (netPins[net] = netPins[net] || []).push(id);
    });
  }
  return { pins, netPins, skipped };
}

// B.benchToBoard, minus the view bookkeeping
function mergeBench(def) {
  const reg = def.board ? defs.board[def.board] || defs.module[def.board] : null;
  const base = reg ? store.withVariant(reg, def.variant || reg.variant) : null;
  const out = Object.assign({}, base || {}, def);
  if (def.circuit && typeof def.circuit === 'object') out.circuits = Object.assign({}, (base && base.circuits) || {}, { bench: def.circuit });
  return { out, base, missingBase: !!def.board && !base };
}

const spelling = (ref) => {
  if (/^[a-j]\d{1,2}$/.test(ref)) return 'hole a-j+col';
  if (/^[TB][+-]\d{1,2}$/.test(ref)) return 'rail T+n';
  if (/^[A-Za-z_][\w-]*\.\d+$/.test(ref)) return 'ID.n (header pin id)';
  if (/^[A-Za-z_][\w-]*\.[\w+~-]+$/.test(ref)) return 'ID.LEG (part leg)';
  if (/^[A-Za-z_][\w-]*$/.test(ref)) return 'NET name';
  return 'other';
};

// the endpoint rule of bench-solve.js netlist(): hole, then part leg, then board pin or net
function classify(ref, c, geo, md) {
  if (typeof ref !== 'string') return ['unresolved', 'not a string'];
  const h = B.hole(geo, ref);
  if (h) return [/^[TB]/.test(ref) ? 'rail' : 'hole'];
  if (spelling(ref).startsWith('hole') || spelling(ref).startsWith('rail')) return ['unresolved', 'hole outside the breadboard'];
  const m = /^([A-Za-z_][\w-]*)\.([\w+~-]+)$/.exec(ref);
  const q = m && (c.parts || []).find((p) => p.id === m[1]);
  if (q) {
    const d = parts[q.part], i = d && d.legs ? d.legs.indexOf(m[2]) : -1;
    if (i >= 0) return ['part-leg'];
    return ['unresolved', d ? `part ${q.part} has no leg ${m[2]}` : `unknown part ${q.part}`];
  }
  if (md.pins[ref]) return ['header-pin'];
  if (md.netPins[ref] && md.netPins[ref].length) return [md.netPins[ref].length > 1 ? 'net-multi' : 'net'];
  return ['unresolved', m ? `no circuit part ${m[1]} and no board pin ${ref}` : `no board pin or net ${ref}`];
}

const tally = () => ({ hole: 0, rail: 0, 'part-leg': 0, 'header-pin': 0, net: 0, 'net-multi': 0, unresolved: 0 });
const spellings = {};
const bump = (ref, cls) => { const s = spelling(ref); spellings[s] = spellings[s] || { count: 0, unresolved: 0, examples: new Set() }; spellings[s].count++; if (cls === 'unresolved') spellings[s].unresolved++; if (spellings[s].examples.size < 4) spellings[s].examples.add(ref); };

function circuitReport(owner, key, c, md) {
  const geo = B.bbGeom(c.breadboard || 'half');
  const r = { owner, key, parts: (c.parts || []).length, props: (c.props || []).length, wires: (c.wires || []).length, endpoints: tally(), unresolved: [], badHoles: [], unknownParts: [] };
  for (const q of c.parts || []) {
    if (!parts[q.part]) r.unknownParts.push(`${q.id}: ${q.part}`);
    (q.holes || []).forEach((hole) => {
      const cls = B.hole(geo, hole) ? 'ok' : 'bad';
      bump(hole, cls === 'bad' ? 'unresolved' : 'ok');
      if (cls === 'bad') r.badHoles.push(`${q.id} ${hole}`);
    });
  }
  (c.wires || []).forEach((w, i) => {
    for (const end of ['from', 'to']) {
      const [cls, why] = classify(w[end], c, geo, md);
      r.endpoints[cls]++;
      bump(w[end], cls);
      if (cls === 'unresolved') r.unresolved.push({ wire: i, end, ref: w[end], why });
    }
  });
  return r;
}

// bench mat wires (bench.js matEnd): periph board pin, periph part leg, or a base pin
function matEndOk(ref, def, md) {
  const m = /^([A-Za-z_][\w-]*)\.(.+)$/.exec(ref), it = m && (def.periph || []).find((p) => p.id === m[1]);
  if (it && it.board) {
    const reg = defs.board[it.board] || defs.module[it.board];
    if (!reg) return [false, `periph board ${it.board} not loaded`];
    const pm = pinsOf(store.withVariant(reg, it.variant || reg.variant));
    const ok = pm.pins[m[2]] || (pm.netPins[m[2]] || []).length || Object.values(pm.pins).some((q) => q.label === m[2]);
    return ok ? [true] : [false, `no pin ${m[2]} on ${it.board}`];
  }
  if (it) {
    const d = parts[it.part];
    if (!d) return [false, `unknown part ${it.part}`];
    return (d.legs || []).includes(m[2]) ? [true] : [false, `part ${it.part} has no leg ${m[2]}`];
  }
  if (md.pins[ref] || (md.netPins[ref] || []).length) return [true];
  return [false, `no base pin or net ${ref}`];
}

// ---- the questions ----
const out = { q1: [], q2: [], q3: [], circuits: [], loadErrors };

const lessonCircuits = (id) => {
  const file = path.join(repo, 'src/content/boards', `${id}.ts`);
  const text = fs.readFileSync(file, 'utf8');
  const lesson = [...text.matchAll(/(?:^\s+|language: '[^']*', )circuit: (?:'([^']+)'|null),/gm)].map((m) => m[1] ?? null);
  const any = [...text.matchAll(/circuit: '([^']+)'/g)].map((m) => m[1]);
  return { lesson, any };
};

for (const [id, def] of Object.entries(defs.board).sort()) {
  const md = pinsOf(def);
  const keys = Object.keys(def.circuits || {});
  const lc = lessonCircuits(id);
  const used = new Set(lc.lesson.filter(Boolean));
  const missing = [...used].filter((k) => !keys.includes(k));
  const referenced = new Set(lc.any);
  const cr = keys.map((k) => circuitReport(`board:${id}`, k, def.circuits[k], md));
  out.circuits.push(...cr);
  out.q1.push({ id, default: def.circuit ?? null, circuits: keys.length, lessons: lc.lesson.length, withCircuit: lc.lesson.filter(Boolean).length, missing, unusedKeys: keys.filter((k) => !referenced.has(k)), parts: cr.reduce((a, c) => a + c.parts, 0), wires: cr.reduce((a, c) => a + c.wires, 0), skippedParts: md.skipped.length });
}

for (const id of Object.keys(defs.bench).sort()) {
  const def = defs.bench[id];
  const { out: merged, base, missingBase } = mergeBench(def);
  const md = pinsOf(merged);
  const inherited = (base && base.circuits) || {};
  const own = Object.entries(merged.circuits || {}).filter(([k, c]) => inherited[k] !== c);
  const cr = own.map(([k, c]) => circuitReport(`bench:${id}`, k, c, md));
  out.circuits.push(...cr);
  const wires = (def.wires || []).filter((w) => w && typeof w.from === 'string' && typeof w.to === 'string');
  const bad = [];
  let resolved = 0;
  for (const w of wires) for (const end of ['from', 'to']) {
    const [ok, why] = matEndOk(w[end], def, md);
    bump(w[end], ok ? 'ok' : 'unresolved');
    if (ok) resolved++; else bad.push(`${w.from} - ${w.to}: ${why}`);
  }
  const pm = def.pinMap || {};
  const nets = new Set(Object.keys(md.netPins));
  for (const it of def.periph || []) {
    const reg = it.board && (defs.board[it.board] || defs.module[it.board]);
    if (reg) Object.keys(pinsOf(reg).netPins).forEach((n) => nets.add(n));
  }
  const pinMapBad = Object.entries(pm).filter(([pin, net]) => !nets.has(pin) || !nets.has(net)).map(([pin, net]) => `${pin} -> ${net}`);
  out.q2.push({ id, board: def.board || null, missingBase, hasBaseDef: !!base, periph: (def.periph || []).length, wires: wires.length, endpoints: wires.length * 2, resolvedEndpoints: resolved, pinMap: Object.keys(pm).length, circuits: cr.length, circuitParts: cr.reduce((a, c) => a + c.parts, 0), circuitWires: cr.reduce((a, c) => a + c.wires, 0), circuitUnresolved: cr.reduce((a, c) => a + c.unresolved.length + c.badHoles.length + c.unknownParts.length, 0), unresolved: bad, pinMapBad, skippedParts: md.skipped.length });
}
out.q2.forEach((b) => { b.allResolved = b.unresolved.length === 0 && b.pinMapBad.length === 0 && b.circuitUnresolved === 0 && !b.missingBase; });

for (const f of files('parts')) {
  const name = f.replace(/\.js$/, '');
  const text = fs.readFileSync(path.join(repo, 'figures/parts', f), 'utf8');
  const m = /\blegs:\s*\[([^\]]*)\]/.exec(text);
  const d = parts[name];
  out.q3.push({ file: f, vm: d && Array.isArray(d.legs) ? d.legs : null, regex: m ? (m[1].match(/'[^']*'/g) || []) .map((s) => s.slice(1, -1)) : null });
}

out.spellings = Object.fromEntries(Object.entries(spellings).map(([k, v]) => [k, { count: v.count, unresolved: v.unresolved, examples: [...v.examples] }]));
out.kinds = kinds.size;
out.ms = Math.round(performance.now() - t0);
if (process.argv.includes('--json')) console.log(JSON.stringify(out, null, 1));
else console.dir(out, { depth: 5 });
```
