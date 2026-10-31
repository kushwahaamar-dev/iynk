// Netlist generator from the same case description. mode 'matched': every device is the solver's piecewise-linear model
// written as a behavioural (B) source, so only solver error remains. mode 'realistic': LED and diode are exponential
// .model cards, transistors are Gummel-Poon.
import { Simulation } from 'eecircuit-engine';

const RAIL_R = .5, PIN_R = 25, RBE = 2, RSAT = .01, GMIN = 1e-9;
const VF = { red: 2.0, yellow: 2.1, green: 2.2, blue: 3.0, white: 3.1 };
const nm = n => 'n_' + n.toLowerCase();
const f = x => Number(x).toPrecision(15);

// dc-motor.js steady(), same constants
const MR = 1.43, KE = 3.06e-4, I0 = .12, IPROP = .08, VSTOP = .6;
export const steady = (v, load = 'prop') => {
  const av = Math.abs(v), sg = Math.sign(v) || 1;
  if (load === 'stalled') return sg * av / MR;
  if (av < VSTOP) return sg * av / MR;
  let rpm = Math.max(0, (av - I0 * MR) / KE);
  for (let k = 0; k < 12; k++) { const i = I0 + (load === 'prop' ? IPROP * Math.pow(rpm / 12500, 2) : 0); rpm = Math.max(0, (av - i * MR) / KE); }
  return sg * (I0 + (load === 'prop' ? IPROP * Math.pow(rpm / 12500, 2) : 0));
};
const motorTable = load => { const pts = []; for (let v = 0; v <= 10.0001; v += .02) pts.push(`${f(v)},${f(steady(v, load))}`); return pts.join(','); };

// the sources: rails from the page's own rail values, pins at logic level behind 25 ohm
export function netlist(cs, { rails, logic }, mode) {
  const L = [`* ${cs.id} ${cs.title} (${mode})`];
  const nodes = new Set(); const sense = [];
  for (const p of cs.parts) for (const n of p.n) if (n !== 'GND') nodes.add(n);
  const g = n => n === 'GND' ? '0' : nm(n);
  const models = [];
  for (const n of nodes) {
    if (Object.prototype.hasOwnProperty.call(rails, n) && ['5V', '3V3', 'VIN'].includes(n)) {
      L.push(`Vsrc_${n} s_${n.toLowerCase()} 0 ${f(rails[n])}`, `Rsrc_${n} s_${n.toLowerCase()} ${nm(n)} ${RAIL_R}`); sense.push({ kind: 'src', name: 'vsrc_' + n.toLowerCase() });
    } else if (/^D\d+$/.test(n) && cs.pins[n] != null) {
      L.push(`Vsrc_${n} s_${n.toLowerCase()} 0 ${f(cs.pins[n] ? logic : 0)}`, `Rsrc_${n} s_${n.toLowerCase()} ${nm(n)} ${PIN_R}`); sense.push({ kind: 'src', name: 'vsrc_' + n.toLowerCase() });
    }
  }
  for (const p of cs.parts) {
    const id = p.id.toLowerCase();
    if (p.k === 'R') L.push(`R_${id} ${g(p.n[0])} ${g(p.n[1])} ${p.ohms}`);
    else if (p.k === 'POT') {
      L.push(`R_${id}_top ${g(p.n[0])} ${g(p.n[1])} ${f(Math.max(p.ohms * p.pos, .5))}`, `R_${id}_bot ${g(p.n[1])} ${g(p.n[2])} ${f(Math.max(p.ohms * (1 - p.pos), .5))}`);
    } else if (p.k === 'LED' || p.k === 'D') {
      const [a, k] = p.n, vf = p.k === 'LED' ? VF[p.color] : .7, rd = p.k === 'LED' ? .5 : .2;
      L.push(`Vs_${id} ${g(a)} x_${id} 0`);
      if (mode === 'matched') L.push(`B_${id} x_${id} ${g(k)} I=max(V(x_${id},${g(k)})-${vf},0)/${rd}`);
      else if (p.k === 'LED') { const N = 2, RS = .5, Vt = .025852, Is = .02 / Math.exp((vf - .02 * RS) / (N * Vt)); models.push(`.model DLED_${id} D(IS=${Is.toExponential(6)} N=${N} RS=${RS})`); L.push(`D_${id} x_${id} ${g(k)} DLED_${id}`); }
      else { models.push('.model D1N4007 D(IS=7.03e-9 N=1.808 RS=0.0342)'); L.push(`D_${id} x_${id} ${g(k)} D1N4007`); }
    } else if (p.k === 'TIP' || p.k === 'Q22') {
      const [b, c, e] = p.n, vbe = p.k === 'TIP' ? 1.3 : .7, vcs = p.k === 'TIP' ? .9 : .2, beta = p.k === 'TIP' ? 1000 : 100;
      L.push(`Vsb_${id} ${g(b)} bi_${id} 0`, `Vsc_${id} ${g(c)} ci_${id} 0`);
      if (mode === 'matched') {
        L.push(`Bb_${id} bi_${id} ${g(e)} I=max(V(bi_${id},${g(e)})-${vbe},0)/${RBE}`,
          `Bc_${id} ci_${id} ${g(e)} I=max(min(${beta}*max(V(bi_${id},${g(e)})-${vbe},0)/${RBE},(V(ci_${id},${g(e)})-${vcs})/${RSAT}),0)`);
      } else if (p.k === 'Q22') {
        models.push('.model Q2N NPN(IS=5e-15 BF=100 BR=5 VAF=100 RB=10 RC=0.5)');
        L.push(`Q_${id} ci_${id} bi_${id} ${g(e)} Q2N`);
      } else {
        models.push('.model QD NPN(IS=5e-15 BF=31.6 BR=5 VAF=100 RB=10 RC=0.3)');
        L.push(`Q_${id}a ci_${id} bi_${id} m_${id} QD`, `Q_${id}b ci_${id} m_${id} ${g(e)} QD`);
      }
    } else if (p.k === 'MOT') {
      L.push(`Vs_${id} ${g(p.n[0])} x_${id} 0`, `B_${id} x_${id} ${g(p.n[1])} I=pwl(V(x_${id},${g(p.n[1])}),${motorTable(p.load).replace(/^/, '-10.0,' + f(-steady(10, p.load)) + ',')})`);
    }
  }
  L.push(...models);
  if (mode === 'matched') for (const n of nodes) L.push(`Rg_${n.toLowerCase()} ${nm(n)} 0 ${1 / GMIN}`);
  L.push('.options reltol=1e-9 abstol=1e-14 vntol=1e-9 itl1=500 gmin=1e-12', '.op', '.end');
  return L.join('\n').replace(/\bn_gnd\b/g, '0');
}

let sim;
export async function run(text) {
  if (!sim) { sim = new Simulation(); await sim.start(); }
  sim.setNetList(text);
  const r = await sim.runSim();
  const out = {}; for (const d of r.data) out[d.name.toLowerCase()] = d.values[0];
  return out;
}
