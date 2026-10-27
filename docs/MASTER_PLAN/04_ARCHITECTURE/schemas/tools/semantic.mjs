// Cross-reference checks that JSON Schema cannot express. Mirrors section 6 of COMPONENT_SCHEMA.md.
import fs from 'node:fs';
const problems = [];
const bad = (f, m) => problems.push(`${f}: ${m}`);
for (const file of process.argv.slice(2)) {
  const n = file.split('/').pop();
  const d = JSON.parse(fs.readFileSync(file, 'utf8'));
  const dup = (arr, what) => { const s = new Set(); for (const x of arr) { if (s.has(x)) bad(n, `duplicate ${what} ${x}`); s.add(x); } return s; };
  const pins = dup(d.pins.map(p => p.id), 'pin id');
  const srcs = dup(d.sources.map(s => s.id), 'source id');
  const layers = dup(d.behaviour.layers.map(l => l.id), 'layer id');
  const params = dup((d.parameters || []).map(p => p.id), 'parameter id');
  const phys = new Set([...(d.physical_inputs || []), ...(d.physical_outputs || [])].map(c => c.id));
  const nets = new Set(d.internal_nets || []);
  const rat = d.ratings;
  const ratKeys = new Set(Object.keys(rat));
  const checkSrc = (r, where) => { if (r && !srcs.has(r.src)) bad(n, `${where}: unknown source ${r.src}`); };
  const checkRat = (k, where) => { if (k !== undefined && !ratKeys.has(k)) bad(n, `${where}: unknown rating ${k}`); };
  const checkPin = (p, where) => { if (!pins.has(p)) bad(n, `${where}: unknown pin ${p}`); };
  if (d.identity.primary_source && !srcs.has(d.identity.primary_source)) bad(n, 'identity.primary_source unknown');
  for (const c of d.connectors || []) c.pins.forEach(p => checkPin(p, `connector ${c.id}`));
  const conns = new Set((d.connectors || []).map(c => c.id));
  for (const p of d.pins) {
    if (p.connector && !conns.has(p.connector)) bad(n, `pin ${p.id}: unknown connector`);
    if (p.pull) { checkRat(p.pull.rating, `pin ${p.id}.pull`); if (p.pull.unless_parameter && !params.has(p.pull.unless_parameter)) bad(n, `pin ${p.id}: unknown parameter`); if (p.pull.rail && !nets.has(p.pull.rail) && !pins.has(p.pull.rail)) bad(n, `pin ${p.id}: unknown rail ${p.pull.rail}`); }
    if (d.dimensions?.board && p.position && (p.position.x < 0 || p.position.y < 0 || p.position.x > d.dimensions.board.w || p.position.y > d.dimensions.board.h)) bad(n, `pin ${p.id} lies outside the board outline`);
  }
  for (const g of d.groups || []) g.pins.forEach(p => checkPin(p, `group ${g.id}`));
  const protos = new Set((d.protocols || []).map(x => x.id));
  const isKnown = id => protos.has(id) || pins.has(id) || layers.has(id) || params.has(id) || phys.has(id) || nets.has(id);
  const slotOf = (k) => rat[k]?.used_by_model;
  const memberOk = (k, pick, loose) => { if (loose && slotOf(k) === 'none') { const q0 = rat[k].manufacturer || rat[k].simulation || rat[k].measured; return q0 && q0[pick] !== undefined; } const s = slotOf(k); if (!s || s === 'none') return false; const q = rat[k][s]; return q && q[pick] !== undefined; };
  for (const [k, r] of Object.entries(rat)) {
    for (const s of ['manufacturer', 'simulation', 'measured']) checkSrc(r[s]?.source, `rating ${k}.${s}`);
    (r.scope?.pins || []).forEach(p => checkPin(p, `rating ${k}`));
    if (r.scope?.layer && !layers.has(r.scope.layer)) bad(n, `rating ${k}: unknown layer ${r.scope.layer}`);
    for (const ref of r.simulation?.derived_from || []) { const [rk, slot] = ref.split('.'); if (!ratKeys.has(rk) || !rat[rk][slot]) bad(n, `rating ${k}: derived_from ${ref} does not exist`); }
  }
  const usedElements = new Set();
  const checkParams = (pm, where) => {
    for (const [name, v] of Object.entries(pm || {})) {
      if (v.from_rating) { checkRat(v.from_rating, `${where}.${name}`); if (!memberOk(v.from_rating, v.pick || 'value')) bad(n, `${where}.${name}: rating ${v.from_rating} has no '${v.pick || 'value'}' in the slot it is used from (${slotOf(v.from_rating)})`); const ru = rat[v.from_rating]?.[slotOf(v.from_rating)]?.unit; if (v.unit && ru && v.unit !== ru) bad(n, `${where}.${name}: unit ${v.unit} differs from rating unit ${ru}`); }
      if (v.by_parameter) { if (!params.has(v.by_parameter.parameter)) bad(n, `${where}.${name}: unknown parameter`); for (const [val, rk] of Object.entries(v.by_parameter.map)) { checkRat(rk, `${where}.${name}[${val}]`); if (!memberOk(rk, v.pick || 'value')) bad(n, `${where}.${name}[${val}]: rating ${rk} lacks '${v.pick}'`); } const pdef = d.parameters.find(p => p.id === v.by_parameter.parameter); if (pdef?.values) for (const val of pdef.values) if (!(val in v.by_parameter.map)) bad(n, `${where}.${name}: parameter value ${val} has no mapping`); }
      checkSrc(v.source, `${where}.${name}`);
    }
  };
  for (const l of d.behaviour.layers) {
    for (const id of [...(l.reads || []), ...(l.drives || [])]) if (!isKnown(id)) bad(n, `layer ${l.id}: unknown name ${id}`);
    const m = l.model;
    if (m.kind === 'element') { usedElements.add(m.element); Object.values(m.terminals).forEach(p => checkPin(p, `layer ${l.id} terminal`)); }
    if (m.kind === 'subcircuit') m.instances.forEach(i => i.element && usedElements.add(i.element));
    if (m.kind === 'element' || m.kind === 'builtin' || m.kind === 'subcircuit') checkParams(m.params, `layer ${l.id}`);
    if (m.kind === 'extension') for (const perm of m.permissions) { const [, arg] = perm.split(':'); if (perm.startsWith('param.read:') && !params.has(arg)) bad(n, `extension permission ${perm}: unknown parameter`); if (perm.startsWith('world.') && !phys.has(arg)) bad(n, `extension permission ${perm}: unknown channel`); }
  }
  for (const e of usedElements) if (!(d.simulation.solver_requires || []).includes(e)) bad(n, `solver_requires lacks ${e}`);
  for (const f of d.failure_modes || []) {
    for (const c of f.when) { if (!(c.target === 'part' || pins.has(c.target) || layers.has(c.target))) bad(n, `failure ${f.id}: unknown target ${c.target}`); if (c.threshold.rating) { checkRat(c.threshold.rating, `failure ${f.id}`); if (!memberOk(c.threshold.rating, c.threshold.pick || 'value', f.implemented_as !== 'threshold')) bad(n, `failure ${f.id}: rating ${c.threshold.rating} lacks '${c.threshold.pick}' in its used slot`); } }
    checkSrc(f.source, `failure ${f.id}`);
    if (f.implemented_as === 'threshold' && f.basis === 'manufacturer' && !f.source) bad(n, `failure ${f.id}: manufacturer basis needs a source`);
  }
  for (const f of d.injectable_faults || []) { (f.target?.pins || []).forEach(p => checkPin(p, `fault ${f.id}`)); if (f.target?.parameter && !params.has(f.target.parameter)) bad(n, `fault ${f.id}: unknown parameter`); if (f.target?.rail && !isKnown(f.target.rail)) bad(n, `fault ${f.id}: unknown rail`); }
  for (const p of d.parameters || []) for (const a of p.affects || []) if (!(isKnown(a) || ratKeys.has(a))) bad(n, `parameter ${p.id}: affects unknown ${a}`);
  for (const pr of d.protocols || []) { Object.values(pr.pins).forEach(p => checkPin(p, `protocol ${pr.id}`)); checkRat(pr.speed_max, `protocol ${pr.id}`); }
  for (const i of d.power?.inputs || []) { [...i.pins, ...i.ground].forEach(p => checkPin(p, `power input ${i.id}`)); checkRat(i.voltage, `power ${i.id}`); checkRat(i.current, `power ${i.id}`); }
  for (const o of d.power?.outputs || []) { checkPin(o.pin, `power output ${o.id}`); checkRat(o.dropout, `power ${o.id}`); checkRat(o.current_max, `power ${o.id}`); }
  for (const c of d.power?.consumption || []) checkRat(c.rating, `power consumption ${c.id}`);
  for (const p of d.power?.protection || []) checkSrc(p.source, 'protection');
  for (const r of d.compatibility?.rules || []) { const q = r.params; if (q.pin) checkPin(q.pin, `rule ${r.id}`); if (q.limit_rating) checkRat(q.limit_rating, `rule ${r.id}`); if (q.rating) checkRat(q.rating, `rule ${r.id}`); if (q.parameter && !params.has(q.parameter)) bad(n, `rule ${r.id}: unknown parameter`); if (q.protocol && !(d.protocols || []).some(x => x.id === q.protocol)) bad(n, `rule ${r.id}: unknown protocol`); }
  for (const l of d.visual.breadboard?.legs || []) checkPin(l, 'visual.breadboard.legs');
  for (const l of d.software?.environments || []) for (const lib of l.libraries || []) checkSrc(lib.source, `library ${lib.name}`);
  for (const t of d.simulation.tests || []) checkSrc(t.source, `test ${t.id}`);
  for (const [k, v] of Object.entries(d.mechanics || {})) if (v && v.source) checkSrc(v.source, `mechanics.${k}`);
  if (d.simulation.status === 'not-modelled-yet' && d.behaviour.layers.some(l => l.model.kind !== 'none')) bad(n, 'status not-modelled-yet but a layer has a model');
  if (!d.provenance.license) bad(n, 'license missing');
  console.log(`${n}: ${d.pins.length} pins, ${ratKeys.size} ratings, ${d.behaviour.layers.length} layers, ${(d.failure_modes || []).length} failure modes, ${(d.injectable_faults || []).length} injectable faults`);
}
if (problems.length) { console.log('\nPROBLEMS'); problems.forEach(p => console.log(' - ' + p)); process.exit(1); }
console.log('semantic checks passed');
