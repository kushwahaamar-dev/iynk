// Validates project example documents against project.schema.json and the two domain schemas.
// V1 canonical bytes, V2 JSON Schema 2020-12 (strict Ajv, project + robotics.domain + drone.domain),
// V3 references and invariants, V4 limits, V5 hygiene, V7 domain rules (ROBOTICS 4.5 RB-E-*, DRONE 8.1 DB-C-12, 5.3 rules),
// V8 the shared definitions copied into the domain schemas still equal the project schema's.
// Usage: node validate-project.mjs <project.json>...   (run npm install in this folder first)
import { readFileSync } from 'node:fs';
import { canon, file, chainStep, projectSchema, robotSchema, droneSchema, validate, domainRules, driftErrors } from './project-lib.mjs';

const paths = process.argv.slice(2);

const strip = (hole) => {
  const m = /^([a-j])(\d+)$/.exec(hole);
  return m ? `${m[2]}${'abcde'.includes(m[1]) ? 'u' : 'l'}` : null;
};

function semantic(doc) {
  const errs = [];
  const err = (code, msg) => errs.push(`${code}: ${msg}`);

  // unique global ids
  const ids = new Map();
  const reg = (id, where) => { if (ids.has(id)) err('V3-ID-DUP', `${id} in ${where} and ${ids.get(id)}`); else ids.set(id, where); };
  doc.actors.forEach((a) => reg(a.id, 'actors'));
  reg(doc.id, 'project');
  doc.boards.forEach((b) => reg(b.id, 'boards'));
  doc.components.forEach((c) => reg(c.id, 'components'));
  doc.nets.forEach((n) => reg(n.id, 'nets'));
  doc.views.forEach((v) => { reg(v.id, 'views'); v.wires.forEach((w) => reg(w.id, 'wires')); (v.junctions || []).forEach((j) => reg(j.id, 'junctions')); });
  doc.sources.forEach((s) => reg(s.id, 'sources'));
  doc.assets.forEach((a) => reg(a.id, 'assets'));
  doc.parameters.forEach((p) => reg(p.id, 'parameters'));
  doc.simulation.runtimes.forEach((r) => reg(r.id, 'runtimes'));
  doc.simulation.faults.forEach((f) => reg(f.id, 'faults'));
  (doc.simulation.instruments || []).forEach((i) => reg(i.id, 'instruments'));
  if (doc.mechanical) for (const k of ['frames', 'bodies', 'joints', 'mounts']) doc.mechanical[k].forEach((e) => reg(e.id, 'mechanical.' + k));

  // hygiene: keys that can poison a prototype are never valid anywhere
  const bad = [];
  const walk = (o, path) => {
    if (o && typeof o === 'object') {
      for (const k of Object.keys(o)) {
        if (k === '__proto__' || k === 'constructor' || k === 'prototype') bad.push(path + '/' + k);
        walk(o[k], path + '/' + k);
      }
    }
  };
  walk(doc, '');
  bad.forEach((b) => err('V5-KEY', b));

  // access
  const actors = new Set(doc.actors.map((a) => a.id));
  doc.access.owners.forEach((o) => { if (!actors.has(o)) err('V3-ACTOR', `owner ${o} not in actors`); });
  doc.access.grants.forEach((g) => { if (!actors.has(g.actor)) err('V3-ACTOR', `grant to ${g.actor} not in actors`); });

  // definitions
  const deps = new Map(doc.dependencies.components.map((d) => [d.ref + '@' + d.version, d]));
  if (deps.size !== doc.dependencies.components.length) err('V3-DEP-DUP', 'duplicate component dependency');
  const inst = new Map();
  const refdes = new Set();
  for (const e of [...doc.boards, ...doc.components]) {
    const d = deps.get(e.definition.ref + '@' + e.definition.version);
    if (!d) { err('V3-DEF', `${e.id} uses ${e.definition.ref}@${e.definition.version} which is not in dependencies`); continue; }
    inst.set(e.id, d);
    if (refdes.has(e.refdes)) err('V3-REFDES', `duplicate refdes ${e.refdes}`);
    refdes.add(e.refdes);
    const known = new Set(d.interface.params.map((p) => p.id));
    for (const [k, v] of Object.entries(e.params || {})) {
      if (!known.has(k)) err('V3-PARAM', `${e.id} sets unknown param ${k}`);
      if (v && typeof v === 'object' && !ids.has(v.param)) err('V3-PARAM-REF', `${e.id}.${k} binds missing ${v.param}`);
    }
  }
  const unused = [...deps.keys()].filter((k) => ![...inst.values()].some((d) => d.ref + '@' + d.version === k));
  unused.forEach((k) => err('V3-DEP-UNUSED(warn)', k));

  const pinOk = (c, p) => inst.get(c)?.interface.pins.some((x) => x.id === p);

  // nets
  const pinNet = new Map();
  const netNames = new Set();
  for (const n of doc.nets) {
    if (n.name) { if (netNames.has(n.name)) err('V3-NET-NAME', `duplicate net name ${n.name}`); netNames.add(n.name); }
    for (const m of n.connections) {
      if (!pinOk(m.c, m.p)) err('V3-PIN', `${n.id}: ${m.c}.${m.p} does not exist`);
      const k = m.c + '.' + m.p;
      if (pinNet.has(k)) err('V3-PIN-TWICE', `${k} in ${pinNet.get(k)} and ${n.id}`);
      pinNet.set(k, n.id);
    }
  }

  // views
  const netById = new Map(doc.nets.map((n) => [n.id, n]));
  const holeOwner = new Map();
  for (const v of doc.views) {
    const strips = new Map(); // strip -> set of net ids
    const touch = (hole, netId, who) => {
      const s = strip(hole);
      if (!s) { err('V3-HOLE', `${v.id}: bad hole ${hole}`); return; }
      if (!strips.has(s)) strips.set(s, new Map());
      strips.get(s).set(who, netId);
    };
    for (const pl of v.placements) {
      if (!inst.has(pl.c)) err('V3-PLACE', `${v.id}: placement of unknown ${pl.c}`);
      if (pl.legs) {
        if (v.kind !== 'breadboard') err('V3-LEGS', `${v.id}: legs outside a breadboard view`);
        for (const [leg, hole] of Object.entries(pl.legs)) {
          if (!pinOk(pl.c, leg)) err('V3-LEG', `${pl.c}.${leg} does not exist`);
          const key = v.id + ':' + hole;
          if (holeOwner.has(key)) err('V3-HOLE-TWICE', `${key} used by ${holeOwner.get(key)} and ${pl.c}.${leg}`);
          holeOwner.set(key, pl.c + '.' + leg);
          touch(hole, pinNet.get(pl.c + '.' + leg) ?? null, pl.c + '.' + leg);
        }
      }
    }
    for (const w of v.wires) {
      const net = netById.get(w.net);
      if (!net) { err('V3-WIRE-NET', `${w.id}: net ${w.net} missing`); continue; }
      for (const e of [w.from, w.to]) {
        if (e.kind === 'pin') {
          if (!net.connections.some((m) => m.c === e.c && m.p === e.p)) err('V3-WIRE-END', `${w.id}: ${e.c}.${e.p} is not a connection of ${w.net}`);
        } else if (e.kind === 'hole') {
          if (e.surface !== v.surface) err('V3-WIRE-SURFACE', `${w.id}: surface ${e.surface} is not the view surface`);
          touch(e.hole, w.net, w.id);
        } else if (e.kind === 'junction') {
          const j = (v.junctions || []).find((x) => x.id === e.id);
          if (!j || j.net !== w.net) err('V3-WIRE-JCT', `${w.id}: junction ${e.id} missing or on another net`);
        }
      }
    }
    // a strip may carry only one net
    for (const [s, who] of strips) {
      const nets = new Set([...who.values()].filter((x) => x));
      if (nets.size > 1) err('V3-STRIP-SHORT', `${v.id}: strip ${s} joins nets ${[...nets].join(', ')}`);
    }
    // a pin placed in a hole with no net while other pins share the strip is a looks-connected-but-is-not case
    for (const [s, who] of strips) {
      const unnet = [...who.entries()].filter(([, n]) => !n && !String(s).startsWith('x')).map(([k]) => k);
      if (unnet.length && who.size > 1) err('V3-STRIP-IMPLIED(warn)', `${v.id}: strip ${s} shares ${unnet.join(', ')} with other legs but no net joins them`);
    }
  }

  // sources
  const paths = new Set();
  for (const s of doc.sources) {
    const k = s.path.toLowerCase();
    if (paths.has(k)) err('V3-PATH', `duplicate path ${s.path}`);
    paths.add(k);
    if (s.board && !doc.boards.some((b) => b.id === s.board)) err('V3-SRC-BOARD', `${s.id}: board ${s.board} missing`);
  }
  const srcIds = new Set(doc.sources.map((s) => s.id));
  for (const b of doc.boards) if (b.firmware) {
    if (!srcIds.has(b.firmware.entry)) err('V3-FW', `${b.id}: entry missing`);
    if (!b.firmware.sources.includes(b.firmware.entry)) err('V3-FW', `${b.id}: entry not in sources`);
    b.firmware.sources.forEach((s) => { if (!srcIds.has(s)) err('V3-FW', `${b.id}: source ${s} missing`); });
  }

  // simulation
  const boardIds = new Set(doc.boards.map((b) => b.id));
  doc.simulation.runtimes.forEach((r) => { if (!boardIds.has(r.board)) err('V3-RT', `${r.id}: board missing`); });
  const inputIds = new Set(doc.simulation.world.inputs.map((i) => i.id));
  if (inputIds.size !== doc.simulation.world.inputs.length) err('V3-INPUT-DUP', 'duplicate input id');
  for (const i of doc.simulation.world.inputs) {
    if (!inst.has(i.component)) err('V3-INPUT', `${i.id}: component missing`);
    (i.pins || []).forEach((p) => { if (!pinOk(p.c, p.p)) err('V3-INPUT-PIN', `${i.id}: ${p.c}.${p.p}`); });
  }
  doc.simulation.world.script.forEach((e) => { if (!inputIds.has(e.input)) err('V3-SCRIPT', `event for unknown input ${e.input}`); });
  for (const f of doc.simulation.faults) {
    const t = f.target;
    if (t.component && !inst.has(t.component)) err('V3-FAULT', `${f.id}: component`);
    if (t.component && t.pin && !pinOk(t.component, t.pin)) err('V3-FAULT', `${f.id}: pin`);
    [t.net, ...(t.nets || [])].filter(Boolean).forEach((n) => { if (!netById.has(n)) err('V3-FAULT', `${f.id}: net ${n}`); });
  }

  // tests
  for (const t of doc.tests) {
    const cids = new Set();
    for (const c of t.checks) {
      if (cids.has(c.id)) err('V3-CHECK-DUP', `${t.id}.${c.id}`);
      cids.add(c.id);
      if (c.pin) {
        const b = c.board || (doc.boards.length === 1 ? doc.boards[0].id : null);
        const d = b && inst.get(b);
        if (!d || !d.interface.pins.some((p) => p.id === c.pin || p.net === c.pin)) err('V3-CHECK-PIN', `${t.id}.${c.id}: pin ${c.pin}`);
      }
      if (c.net && !netById.has(c.net)) err('V3-CHECK-NET', `${t.id}.${c.id}: net ${c.net}`);
      if (c.source && !srcIds.has(c.source)) err('V3-CHECK-SRC', `${t.id}.${c.id}: source`);
      if (c.kind === 'responds' && !inputIds.has(c.after.input)) err('V3-CHECK-INPUT', `${t.id}.${c.id}`);
    }
  }
  if (doc.guide?.starter && !srcIds.has(doc.guide.starter.source)) err('V3-GUIDE', 'starter source missing');
  const noStarter = structuredClone(doc); if (noStarter.guide) delete noStarter.guide.starter;
  const unresolved = JSON.stringify(noStarter).match(/\{\{[pt]:/g);
  if (unresolved) err('V3-TOKEN', 'unrendered template tokens in the document outside guide.starter: ' + unresolved.length);

  // mechanical
  if (doc.mechanical) {
    const fr = new Map(doc.mechanical.frames.map((f) => [f.id, f]));
    for (const f of fr.values()) {
      if (f.parent !== 'world' && !fr.has(f.parent)) err('V3-FRAME', `${f.id}: parent`);
      let cur = f, hops = 0;
      while (cur && cur.parent !== 'world' && hops++ < 600) cur = fr.get(cur.parent);
      if (hops >= 600) err('V3-FRAME-CYCLE', f.id);
    }
    doc.mechanical.bodies.forEach((b) => { if (!fr.has(b.frame)) err('V3-BODY', b.id); });
    doc.mechanical.mounts.forEach((m) => { if (!fr.has(m.frame) || !inst.has(m.component)) err('V3-MOUNT', m.id); });
  }

  // history: seq continuity and the hash chain
  let prev = doc.history.baseRevision;
  let chain = doc.history.baseChain;
  for (const e of doc.history.ops) {
    if (e.seq !== prev + 1) err('V3-HIST-SEQ', `expected ${prev + 1}, got ${e.seq}`);
    prev = e.seq;
    chain = chainStep(chain, e);
  }
  if (prev !== doc.revision) err('V3-HIST-HEAD', `last seq ${prev} but revision ${doc.revision}`);
  doc.history.checkpoints.forEach((c) => { if (c.revision > doc.revision) err('V3-HIST-CP', `checkpoint ${c.revision} is ahead`); });
  return { errs, chain };
}

let failed = false;
const drift = driftErrors(projectSchema, robotSchema, droneSchema);
console.log(drift.length ? 'V8 shared definitions: FAIL\n  ' + drift.join('\n  ') : 'V8 shared definitions in the domain schemas equal the project schema: ok');
if (drift.length) failed = true;
for (const p of paths) {
  const text = readFileSync(p, 'utf8');
  const doc = JSON.parse(text);
  const out = [];
  out.push(file(doc) === text ? 'V1 canonical bytes: ok' : 'V1 canonical bytes: DIFFER');
  if (file(doc) !== text) failed = true;
  const ok = validate(doc);
  out.push(ok ? 'V2 JSON Schema 2020-12 (strict Ajv): ok' : 'V2 JSON Schema: FAIL\n  ' + validate.errors.filter((e) => !/must be equal to constant|oneOf/.test(e.message)).slice(0, 25).map((e) => `${e.instancePath} ${e.message} ${JSON.stringify(e.params)}`).join('\n  '));
  if (!ok) failed = true;
  const { errs, chain } = semantic(doc);
  const hard = errs.filter((e) => !e.includes('(warn)'));
  out.push(hard.length ? 'V3 references and invariants: FAIL\n  ' + hard.join('\n  ') : 'V3 references and invariants: ok');
  errs.filter((e) => e.includes('(warn)')).forEach((w) => out.push('  warning ' + w));
  if (hard.length) failed = true;
  const dom = domainRules(doc);
  const domHard = dom.filter((e) => !e.includes('(warn)'));
  out.push(domHard.length ? 'V7 domain rules: FAIL\n  ' + domHard.join('\n  ') : `V7 domain rules: ok (${[doc.domains?.robotics && 'robotics', doc.domains?.drone && 'drone'].filter(Boolean).join(', ') || 'no domain data'})`);
  dom.filter((e) => e.includes('(warn)')).forEach((w) => out.push('  warning ' + w));
  if (domHard.length) failed = true;
  const bytes = Buffer.byteLength(canon(doc));
  const big = doc.sources.find((s) => Buffer.byteLength(s.content) > 262144);
  out.push(`V5 hygiene: ${hard.some((e) => e.startsWith('V5')) ? 'FAIL' : 'ok (no __proto__, constructor or prototype keys)'}`);
  out.push(`V4 limits: canonical ${bytes} bytes (max 5242880), ${doc.components.length} components, ${doc.nets.length} nets, ${doc.sources.length} sources${big ? ' SOURCE TOO BIG' : ': ok'}`);
  if (bytes > 5242880 || big) failed = true;
  out.push(`head chain ${chain.slice(0, 16)}...`);
  console.log(`\n== ${p.split('/').pop()}\n` + out.join('\n'));
}
console.log(failed ? '\nRESULT: FAIL' : '\nRESULT: all documents pass');
process.exit(failed ? 1 : 0);
