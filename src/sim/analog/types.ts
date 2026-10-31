import type { SolveDiagnostic } from '../core/diagnostic.ts';

export type ElementId = string;

/** What a part can take before the failure rules latch it; a rule with no figure here does not apply. */
export interface PartRating {
  icmaxAmps?: number;
  tjmaxC?: number;
  thetaCPerW?: number;
  vabsVolts?: number;
  pmaxWatts?: number;
}

/** A source that holds its current at `amps` by letting its voltage sag. */
export interface SourceLimit { amps: number; mode: 'droop' }

interface ElementBase { id: ElementId; rating?: PartRating }

export interface ElementR extends ElementBase { kind: 'R'; a: number; b: number; ohms: number }
export interface ElementPot extends ElementBase { kind: 'POT'; a: number; wiper: number; b: number; ohms: number; position: number }
export interface ElementV extends ElementBase { kind: 'V'; a: number; b: number; volts: number; rSeriesOhms: number; limit?: SourceLimit }
export interface ElementPin extends ElementBase { kind: 'PIN'; a: number; level: 0 | 1 | 'Z'; vHighVolts: number; rOutOhms: number; maxAmps: number }
export interface ElementPwm extends ElementBase { kind: 'PWM'; a: number; duty: number; hz: number; vHighVolts: number; rOutOhms: number; mode: 'averaged' | 'edge' | 'cycle'; maxAmps?: number }
/** The Shockley parameters of a junction; `vbrVolts` is the reverse breakdown voltage as a positive number. */
export interface DiodeParams { kind: 'shockley'; isAmps: number; n: number; rsOhms: number; vbrVolts?: number }

/** `junction` is what `mode: 'newton'` solves; `pwl` reads `vf` and `rdOhms`. */
export interface ElementD extends ElementBase { kind: 'D'; a: number; b: number; modelId: string; vf: number; rdOhms: number; maxAmps: number; junction?: DiodeParams }
export interface ElementQ extends ElementBase { kind: 'Q'; c: number; b: number; e: number; polarity: 'npn' | 'pnp'; modelId: string; hfe: number; hfr: number; vbe: number; vcesat: number }
export interface ElementM extends ElementBase { kind: 'M'; a: number; b: number; ohms: number }
export interface ElementSv extends ElementBase { kind: 'SV'; gnd: number; vplus: number; sig: number }
export interface ElementTs extends ElementBase { kind: 'TS'; supplyPos: number; supplyNeg: number; out: number; outVolts?: number }
export interface ElementBz extends ElementBase { kind: 'BZ'; a: number; b: number; active: boolean; vf: number; rdOhms: number }

export type Element = ElementR | ElementPot | ElementV | ElementPin | ElementPwm | ElementD | ElementQ | ElementM | ElementSv | ElementTs | ElementBz;

export interface SolveOptions {
  mode: 'pwl' | 'newton';
  reltol: number;
  vabstol: number;
  iabstol: number;
  maxIter: number;
  gminSiemens: number;
  homotopy: Array<'gmin' | 'source'>;
}

export type DeviceState = 'off' | 'on' | 'sat' | 'active' | 'open' | 'burnt';

export interface SolveResult {
  converged: boolean;
  iterations: number;
  strategy: 'direct' | 'damped' | 'gmin-stepping' | 'source-stepping';
  v: Float64Array;
  branch: Record<ElementId, { amps: number; volts: number; watts: number }>;
  state: Record<ElementId, DeviceState>;
  residual: { maxKclAmps: number; worstNode: number };
  diagnostics: SolveDiagnostic[];
}

export interface RegulatorModel {
  kind: "linear" | "buck" | "boost";
  voutVolts: number;
  dropoutVolts: number;
  ilimitAmps?: number;
  quiescentAmps?: number;
  efficiency?: number;
  thermal?: { thetaJaCperW: number; shutdownCelsius: number };
}

export interface BrownoutDetector {
  thresholdVolts: number;
  hysteresisVolts: number;
  minDwellNs: number;
  resetNs: number;
}
