// Each mutation must make a valid example invalid. Prints PASS when the schema rejects it.
import Ajv2020 from 'ajv/dist/2020.js';
import fs from 'node:fs';
import path from 'node:path';
const here = path.dirname(new URL(import.meta.url).pathname);
const root = process.env.SCHEMA_DIR || path.join(here, '..');
const schema = JSON.parse(fs.readFileSync(path.join(root, 'component.schema.json'), 'utf8'));
const ajv = new Ajv2020({ strict: true, strictRequired: false, strictTypes: 'log', allowUnionTypes: true, allErrors: true });
const validate = ajv.compile(schema);
const load = n => JSON.parse(fs.readFileSync(path.join(root, 'examples/components', n), 'utf8'));
const cases = [
  ['no license', 'led-5mm', d => { delete d.provenance.license; }],
  ['old British spelling of license', 'led-5mm', d => { d.provenance.licence = d.provenance.license; delete d.provenance.license; }],
  ['refdes prefix in lower case', 'led-5mm', d => { d.identity.refdes_prefix = 'r'; }],
  ['1025 pins', 'led-5mm', d => { d.pins = Array.from({ length: 1025 }, (_, i) => ({ ...d.pins[0], id: 'P' + i })); }],
  ['257 groups', 'led-5mm', d => { d.groups = Array.from({ length: 257 }, (_, i) => ({ id: 'G' + i, kind: 'strip', pins: ['A', 'K'] })); }],
  ['empty mechanics block', 'led-5mm', d => { d.mechanics = {}; }],
  ['motor with neither kv nor ke', 'dc-gear-motor', d => { delete d.mechanics.motor.ke_vs_per_rad; }],
  ['motor with a prefixed field name', 'dc-gear-motor', d => { d.mechanics.motor.r_mohm = 6000; }],
  ['negative resistance', 'dc-gear-motor', d => { d.mechanics.motor.r_ohm = -1; }],
  ['propeller without ct0', 'dc-gear-motor', d => { d.mechanics = { prop: { diameter_mm: 127, pitch_mm: 100, cp0: 0.1 } }; }],
  ['battery efficiency above 1 in gear', 'dc-gear-motor', d => { d.mechanics.motor.gear.efficiency = 1.2; }],
  ['no fidelity status', 'led-5mm', d => { delete d.simulation.status; }],
  ['no fallback renderer', 'led-5mm', d => { delete d.visual.fallback; }],
  ['manufacturer slot without a source', 'l298n-module', d => { delete d.ratings.vs_abs_max.manufacturer.source; }],
  ['simulation slot without a rationale', 'led-5mm', d => { delete d.ratings.forward_current_continuous.simulation.rationale; }],
  ['simulation slot without a confidence', 'led-5mm', d => { delete d.ratings.forward_current_continuous.simulation.confidence; }],
  ['measured slot without a method', 'led-5mm', d => { d.ratings.forward_current_continuous.measured = { unit: 'A', value: 0.021, source: { src: 'factsheet' }, samples: 3, date: '2026-10-27' }; }],
  ['used_by_model names an empty slot', 'led-5mm', d => { d.ratings.forward_current_continuous.used_by_model = 'manufacturer'; }],
  ['rating with no slot at all', 'led-5mm', d => { d.ratings.empty = { measure: 'current', role: 'abs_max', used_by_model: 'none' }; }],
  ['prefixed unit (mA)', 'led-5mm', d => { d.ratings.forward_current_continuous.simulation.unit = 'mA'; }],
  ['value together with min', 'led-5mm', d => { d.ratings.forward_current_continuous.simulation.min = 0.01; }],
  ['non-generic part with no datasheet', 'mpu6050-gy521', d => { d.identity.generic = false; d.sources = d.sources.filter(s => !['datasheet', 'schematic', 'product-page', 'reseller-guide'].includes(s.kind)); }],
  ['modelled part with no tests', 'led-5mm', d => { d.simulation.tests = []; }],
  ['not-modelled-yet with a tier', 'led-5mm', d => { d.simulation.status = 'not-modelled-yet'; }],
  ['T3 with no reference test', 'led-5mm', d => { d.simulation.tier = 'T3'; d.simulation.tests = d.simulation.tests.filter(t => t.kind === 'golden-trace' && false).concat([{ id: 'x', kind: 'property', file: 'a.json' }]); }],
  ['unknown pin type', 'led-5mm', d => { d.pins[0].type = 'wiggly'; }],
  ['unknown solver element', 'led-5mm', d => { d.behaviour.layers[0].model.element = 'flux-capacitor'; }],
  ['literal model param without rationale', 'l298n-module', d => { delete d.behaviour.layers[0].model.params.enable_threshold.rationale; }],
  ['model param with both from_rating and value', 'led-5mm', d => { d.behaviour.layers[0].model.params.rd.value = 0.5; }],
  ['enum parameter without values', 'led-5mm', d => { delete d.parameters[0].values; }],
  ['number parameter without range', 'led-5mm', d => { d.parameters.push({ id: 'r', kind: 'setting', type: 'number', default: 1 }); }],
  ['failure mode without a derivation', 'led-5mm', d => { delete d.failure_modes[0].derivation; }],
  ['failure mode without implemented_as', 'led-5mm', d => { delete d.failure_modes[0].implemented_as; }],
  ['extension without limits', 'led-5mm', d => { d.behaviour.layers.push({ id: 'x', domain: 'digital', model: { kind: 'extension', abi: 'iynk.model/1', entry: 'model.js', sha256: 'a'.repeat(64), permissions: [] } }); }],
  ['extension with a network permission', 'led-5mm', d => { d.behaviour.layers.push({ id: 'x', domain: 'digital', model: { kind: 'extension', abi: 'iynk.model/1', entry: 'model.js', sha256: 'a'.repeat(64), permissions: ['net.fetch'], limits: { memory_bytes: 1048576, ops_per_step: 100000, step_wall_ms: 10 } } }); }],
  ['extension with a path that climbs out', 'led-5mm', d => { d.behaviour.layers.push({ id: 'x', domain: 'digital', model: { kind: 'extension', abi: 'iynk.model/1', entry: '../model.js', sha256: 'a'.repeat(64), permissions: [], limits: { memory_bytes: 1048576, ops_per_step: 100000, step_wall_ms: 10 } } }); }],
  ['extension memory above the cap', 'led-5mm', d => { d.behaviour.layers.push({ id: 'x', domain: 'digital', model: { kind: 'extension', abi: 'iynk.model/1', entry: 'model.js', sha256: 'a'.repeat(64), permissions: [], limits: { memory_bytes: 1073741824, ops_per_step: 100000, step_wall_ms: 10 } } }); }],
  ['imported part with an executable figure page', 'led-5mm', d => { d.provenance.origin = 'imported-pack'; }],
  ['imported part with an html asset', 'led-5mm', d => { d.provenance.origin = 'imported-pack'; delete d.visual.breadboard; d.visual.assets = [{ path: 'art/a.html', media_type: 'text/html', sha256: 'b'.repeat(64), license: 'MIT' }]; }],
  ['bad version', 'led-5mm', d => { d.version = '1.0'; }],
  ['bad component id', 'led-5mm', d => { d.id = 'LED'; }],
  ['unknown top-level field', 'led-5mm', d => { d.colour = 'red'; }],
  ['logic rule without required params', 'l298n-module', d => { d.compatibility.rules[0].params = {}; }],
  ['pin positioned with a string', 'led-5mm', d => { d.pins[0].position.x = '0'; }]
];
// a well-formed extension layer must be accepted
{
  const d = load('led-5mm.component.json');
  d.behaviour.layers.push({ id: 'x', domain: 'digital', model: { kind: 'extension', abi: 'iynk.model/1', entry: 'model.js', sha256: 'a'.repeat(64), language: 'js', permissions: ['pin.read', 'pin.drive', 'time.schedule', 'rng', 'world.read:light'], limits: { memory_bytes: 8388608, ops_per_step: 200000, step_wall_ms: 20 }, uses_rng: true } });
  console.log((validate(d) ? 'PASS (accepted)  ' : 'FAIL (rejected)  ') + 'well-formed extension layer');
}
{
  const d = load('led-5mm.component.json'); d.provenance.origin = 'local-user'; delete d.visual.breadboard;
  d.visual.assets = [{ path: 'art/led.svg', media_type: 'image/svg+xml', sha256: 'b'.repeat(64), license: 'CC0-1.0' }];
  console.log((validate(d) ? 'PASS (accepted)  ' : 'FAIL (rejected)  ') + 'local part with sanitised svg art and no figure page');
}
let ok = 0;
for (const [name, ex, mutate] of cases) {
  const d = load(ex + '.component.json'); mutate(d);
  const valid = validate(d);
  const why = valid ? '' : '  <- ' + validate.errors.filter(e => !['oneOf', 'anyOf', 'if', 'not', 'allOf'].includes(e.keyword)).slice(0, 1).map(e => `${e.instancePath || '/'} ${e.message}`).join('');
  console.log((valid ? 'FAIL (accepted)  ' : 'PASS (rejected)  ') + name + why);
  if (!valid) ok++;
}
console.log(`${ok} of ${cases.length} bad documents rejected`);
process.exit(ok === cases.length ? 0 : 1);
