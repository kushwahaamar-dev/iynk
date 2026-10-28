// @vitest-environment node
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { checkAll, generate, validateExamples } from './schema-gen.mjs';
import * as projectValidators from '../src/project/generated/validate.mjs';
import { validateComponent } from '../src/parts/generated/validate.mjs';
import { GENERATED_FROM as PROJECT_HASHES } from '../src/project/generated/types.ts';
import { GENERATED_FROM as COMPONENT_HASHES } from '../src/parts/generated/types.ts';

const SCHEMAS = 'docs/MASTER_PLAN/04_ARCHITECTURE/schemas';
const readText = (path) => readFileSync(path, 'utf8');
const readJson = (path) => JSON.parse(readText(path));
const projectExample = (name) => readJson(`${SCHEMAS}/examples/${name}.project.json`);
const componentExample = (name) => readJson(`${SCHEMAS}/examples/components/${name}.component.json`);
const examplesIn = (dir, suffix) => readdirSync(dir).filter((name) => name.endsWith(suffix)).sort();

const robotics = (d) => d.domains.robotics.data;
const drone = (d) => d.domains.drone.data;
const ROBOT = 'robot-line-follower';
const DRONE = 'drone-quad';

const badProjects = [
  ['robot: friction above 3', ROBOT, (d) => { robotics(d).bodies.bdy_chassis.friction = 3.5; }],
  ['robot: surface reflectance above 1', ROBOT, (d) => { robotics(d).surfaces[0].reflectance = 1.2; }],
  ['robot: rolling resistance above 0.2', ROBOT, (d) => { robotics(d).wheels.jnt_wheel_l.crr = 0.5; }],
  ['robot: sleeping bodies', ROBOT, (d) => { robotics(d).physics.sleeping = true; }],
  ['robot: collider thinner than 5 mm', ROBOT, (d) => { robotics(d).bodies.bdy_chassis.collider = { kind: 'box', size_mm: [100, 100, 2] }; }],
  ['robot: body key that is not a body id', ROBOT, (d) => { robotics(d).bodies.chassis = robotics(d).bodies.bdy_chassis; }],
  ['robot: missing wheels record', ROBOT, (d) => { delete robotics(d).wheels; }],
  ['robot: unknown field in a body', ROBOT, (d) => { robotics(d).bodies.bdy_chassis.colour = 'red'; }],
  ['robot: track with one point', ROBOT, (d) => { robotics(d).arena.tracks[0].points_mm = [[0, 0]]; }],
  ['drone: two motors', DRONE, (d) => { drone(d).motors = drone(d).motors.slice(0, 2); }],
  ['drone: step rate 750 Hz', DRONE, (d) => { drone(d).flight.step_hz = 750; }],
  ['drone: spin given as a word', DRONE, (d) => { drone(d).motors[0].spin = 'clockwise'; }],
  ['drone: gain below zero', DRONE, (d) => { drone(d).fcParams.pid.p_roll = -1; }],
];

const badComponents = [
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
  ['pin positioned with a string', 'led-5mm', d => { d.pins[0].position.x = '0'; }],
];

describe('generated project validator', () => {
  it('accepts the project examples', () => {
    const names = examplesIn(`${SCHEMAS}/examples`, '.project.json');
    expect(names).toHaveLength(5);
    for (const name of names) {
      const doc = readJson(`${SCHEMAS}/examples/${name}`);
      expect(projectValidators.validateProject(doc), `${name}: ${JSON.stringify(projectValidators.validateProject.errors?.[0])}`).toBe(true);
    }
  });

  it.each(badProjects)('rejects %s', (_name, example, mutate) => {
    const doc = projectExample(example);
    mutate(doc);
    expect(projectValidators.validateProject(doc)).toBe(false);
    expect(projectValidators.validateProject.errors?.length).toBeGreaterThan(0);
  });

  it('rejects schemaVersion 2.0 with an error on /schemaVersion', () => {
    const doc = projectExample('uno-blink-d12');
    doc.schemaVersion = '2.0';
    expect(projectValidators.validateProject(doc)).toBe(false);
    expect(projectValidators.validateProject.errors?.some((e) => e.instancePath === '/schemaVersion')).toBe(true);
  });

  it('validates an op, and rejects one with an unknown kind', () => {
    expect(projectValidators.validateOp({ k: 'net.disconnect', pin: { c: 'cmp_a', p: 'D12' } })).toBe(true);
    expect(projectValidators.validateOp({ k: 'net.explode' })).toBe(false);
    expect(projectValidators.validateOp({ k: 'net.connect', net: 'net_a' })).toBe(false);
  });

  it('exports every section validator the op handlers need', () => {
    for (const name of ['validateProject', 'validateOp', 'validateOpEnvelope', 'validateProposal', 'validateReplayLog', 'validateFileEnvelope', 'validateSimulation', 'validateDomains', 'validateFrame', 'validateBody', 'validateJoint', 'validateMount', 'validateBoard', 'validateComponent']) {
      expect(typeof projectValidators[name], name).toBe('function');
    }
  });
});

describe('generated component validator', () => {
  it('accepts the component examples', () => {
    const names = examplesIn(`${SCHEMAS}/examples/components`, '.component.json');
    expect(names).toHaveLength(9);
    for (const name of names) {
      const doc = readJson(`${SCHEMAS}/examples/components/${name}`);
      expect(validateComponent(doc), `${name}: ${JSON.stringify(validateComponent.errors?.[0])}`).toBe(true);
    }
  });

  it.each(badComponents)('rejects %s', (_name, example, mutate) => {
    const doc = componentExample(example);
    mutate(doc);
    expect(validateComponent(doc)).toBe(false);
  });
});

describe('scripts/schema-gen.mjs', () => {
  it('writes the same bytes twice, and the committed files match', async () => {
    const first = await generate();
    const second = await generate();
    expect([...second]).toEqual([...first]);
    expect(checkAll(first)).toEqual([]);
  }, 60_000);

  it('checkAll names a file that differs by one byte', async () => {
    const files = await generate();
    const path = 'src/project/generated/types.ts';
    files.set(path, `${files.get(path)} `);
    expect(checkAll(files)).toEqual([path]);
  }, 60_000);

  it('finds no invalid example', async () => {
    expect(await validateExamples(await generate())).toEqual([]);
  }, 60_000);

  it('records the hashes of the schema files it read', () => {
    const sha = (name) => createHash('sha256').update(readText(`${SCHEMAS}/${name}`)).digest('hex');
    expect(PROJECT_HASHES['project.schema.json']).toBe(sha('project.schema.json'));
    expect(PROJECT_HASHES['robotics.domain.schema.json']).toBe(sha('robotics.domain.schema.json'));
    expect(PROJECT_HASHES['drone.domain.schema.json']).toBe(sha('drone.domain.schema.json'));
    expect(COMPONENT_HASHES['component.schema.json']).toBe(sha('component.schema.json'));
  });

  it('emits no eval, no new Function and no require in the validators', () => {
    for (const path of ['src/project/generated/validate.mjs', 'src/parts/generated/validate.mjs']) {
      const text = readText(path);
      expect(text, path).not.toMatch(/\beval\(|new Function|\brequire\(/);
    }
  });

  it('keeps the validators inside the size budget', () => {
    for (const [path, bytes, gzip] of [
      ['src/project/generated/validate.mjs', 1_800_000, 200_000],
      ['src/parts/generated/validate.mjs', 800_000, 100_000],
    ]) {
      const text = readText(path);
      expect(Buffer.byteLength(text), `${path} bytes`).toBeLessThanOrEqual(bytes);
      expect(gzipSync(text).length, `${path} gzip`).toBeLessThanOrEqual(gzip);
    }
  });
});
