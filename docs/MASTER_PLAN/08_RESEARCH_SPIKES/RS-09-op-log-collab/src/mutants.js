// Checker sensitivity: each injected bug must make the property test fail.
import fc from "fast-check";
import { runScenario, stepArb } from "./sim.js";

const [steps] = fc.sample(fc.array(stepArb, { minLength: 11000, maxLength: 11000 }), { numRuns: 1, seed: 42 });
const cases = {
  "no bug (control)": {},
  "server skips wire cascade on part delete": { noCascade: true },
  "server has no dedup of resent ops": { noDedup: true },
  "client skips one remote op in 500": { clientDrop: 500 },
};
const extra = { "server has no dedup (snapshot path: retention 25, long offline)": { bugs: { noDedup: true }, retention: 25, evUp: 5 }, "control with same snapshot-heavy settings": { bugs: {}, retention: 25, evUp: 5 } };
for (const [name, o] of [...Object.entries(cases).map(([n, b]) => [n, { bugs: b }]), ...Object.entries(extra)]) {
  try {
    runScenario(steps, o);
    console.log(`${name}: NOT DETECTED (passes)`);
  } catch (e) {
    console.log(`${name}: detected -> ${e.message.slice(0, 160)}`);
  }
}
