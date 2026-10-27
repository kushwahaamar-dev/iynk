import RAPIER from '@dimforge/rapier3d-deterministic-compat';
import initJolt from 'jolt-physics/wasm';
import { runRapier, initRapier } from './rapier-run.mjs';
import { runJolt } from './jolt-run.mjs';
await initRapier(RAPIER);
const Jolt = await initJolt();
const out = { runtime: 'node ' + process.version, runs: [] };
for (let i = 0; i < 3; i++) {
  out.runs.push(runRapier(RAPIER));
  out.runs.push(runJolt(Jolt));
}
console.log(JSON.stringify(out));
