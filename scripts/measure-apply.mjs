#!/usr/bin/env node
// What one edit costs on a large project (T-B2-16).
//
//   node scripts/measure-apply.mjs [--parts N] [--wires N] [--ops N]
//
// Runs `--ops` generated ops per family (default 2000) through a ProjectSession on a project with `--parts`
// resistors (default 500) and `--wires` drawn wires (default 1000), then times the whole-document passes. Wall-clock
// numbers vary with the machine, so this is run on demand and is not part of `npm test`.

import os from 'node:os';
import { rng } from '../src/core/prng.ts';
import { stateHash } from '../src/project/hash.ts';
import { netlist } from '../src/project/netlist.ts';
import { checkBatch } from '../src/project/semantic.ts';
import { OP_FAMILIES, bigProject, generateOp } from '../src/project/testing/generators.ts';
import { ownerOf, session } from '../src/project/testing/harness.ts';
import { validateValue } from '../src/project/validate.ts';

const HOT = ['view.place', 'net.connect', 'wire.add', 'component.set'];
const THRESHOLD_US = 1000;

function parseArgs(argv) {
  const args = { parts: 500, wires: 1000, ops: 2000 };
  for (let i = 0; i < argv.length; i += 2) {
    const name = argv[i]?.replace(/^--/, '');
    const value = Number(argv[i + 1]);
    if (!(name in args) || !Number.isInteger(value) || value < 1) return null;
    args[name] = value;
  }
  return args;
}

const micros = (from) => Number(process.hrtime.bigint() - from) / 1000;

function percentile(sorted, p) {
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];
}

function summarize(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  return { n: sorted.length, p50: percentile(sorted, 50), p95: percentile(sorted, 95), p99: percentile(sorted, 99), max: sorted.at(-1) };
}

function measureFamily(start, family, ops) {
  const live = session(start, 1, 1);
  const author = ownerOf(start);
  const r = rng(1, family);
  const samples = [];
  let rejected = 0;
  for (let i = 0; i < ops; i++) {
    const op = generateOp(live.state, r, { [family]: 1 });
    if (!op) continue;
    const from = process.hrtime.bigint();
    const outcome = live.apply(op, author);
    const took = micros(from);
    if (outcome.ok) samples.push(took);
    else rejected++;
  }
  return { family, rejected, ...summarize(samples) };
}

function timeWhole(label, run, reps = 20) {
  run();
  const samples = [];
  for (let i = 0; i < reps; i++) {
    const from = process.hrtime.bigint();
    run();
    samples.push(micros(from));
  }
  return { label, ...summarize(samples) };
}

const fmt = (us) => us.toFixed(1).padStart(10);

function main(argv) {
  const args = parseArgs(argv);
  if (!args) {
    console.error('usage: node scripts/measure-apply.mjs [--parts N] [--wires N] [--ops N]');
    return 2;
  }
  const start = bigProject(args.parts, args.wires, 1);
  const drawn = start.views.reduce((sum, view) => sum + view.wires.length, 0);
  console.log(`project: ${start.components.length} parts, ${start.nets.length} nets, ${drawn} wires`);
  console.log(`machine: ${os.cpus()[0].model}, node ${process.version}, load ${os.loadavg().map((l) => l.toFixed(2)).join(' ')}`);
  console.log('');

  const rows = OP_FAMILIES.map((family) => measureFamily(start, family, args.ops));
  console.log(`${'family'.padEnd(18)}${'n'.padStart(6)}${'rejected'.padStart(10)}${'p50 us'.padStart(10)}${'p95 us'.padStart(10)}${'p99 us'.padStart(10)}${'max us'.padStart(10)}`);
  for (const row of rows) {
    console.log(`${row.family.padEnd(18)}${String(row.n).padStart(6)}${String(row.rejected).padStart(10)}${fmt(row.p50)}${fmt(row.p95)}${fmt(row.p99)}${fmt(row.max)}`);
  }

  const live = session(start, 1, 1);
  const op = generateOp(live.state, rng(1, 'whole'), { 'view.place': 1 });
  live.apply(op, ownerOf(start));
  const whole = [
    timeWhole('stateHash', () => stateHash(start)),
    timeWhole('validateValue', () => validateValue(start)),
    timeWhole('checkBatch (one place)', () => checkBatch(live.state, start)),
    timeWhole('netlist', () => netlist(start)),
  ];
  console.log('');
  console.log(`${'whole document'.padEnd(24)}${'median us'.padStart(12)}${'max us'.padStart(12)}`);
  for (const row of whole) console.log(`${row.label.padEnd(24)}${fmt(row.p50).padStart(12)}${fmt(row.max).padStart(12)}`);

  const over = rows.filter((row) => HOT.includes(row.family) && row.p95 > THRESHOLD_US);
  console.log('');
  console.log(
    over.length === 0
      ? `hot families (${HOT.join(', ')}): p95 at or under ${THRESHOLD_US} us, so apply can stay on the main thread`
      : `hot families over ${THRESHOLD_US} us at p95: ${over.map((row) => row.family).join(', ')}, so apply moves into the ProjectWorker for them`,
  );
  return 0;
}

process.exitCode = main(process.argv.slice(2));
