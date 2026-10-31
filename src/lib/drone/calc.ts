// Drone Lab design calculator. The maths matches the original Drone Engineer site formula for formula, so its
// golden tables (docs/research: Appendix A of drone-lab-a.md and drone-lab-b-calc-matrix.md, 342 builds of 13
// crafts) reproduce at their printed precision; see calc.test.ts. Each craft's options (batteries, motors, props,
// fixed parts) and its constants (CalcModel) live in its content file under design.

import { checkAll, firstNonFinite, type OutOfRange, type Range } from '@/sim/flight/guards';

export type CostCategory = 'Electrical' | 'Mechanical';

export type CalcBattery = {
  cells: number;
  mah: number;
  g: number;
  price: number;
  /** Li-ion (21700) pack: each parallel cell gives about 45 A before the voltage sags hard. */
  liion?: boolean;
  /** Cells in parallel per series group (the "2p" of 4S2P); 1 when omitted. */
  parallel?: number;
  /** Continuous discharge rating, used by the over-current check when given. */
  cRating?: number;
  /** Where the pack puts the centre of gravity on a wing. */
  cg?: 'ok' | 'nose' | 'tail';
};

export type CalcMotor = {
  kv: number;
  g: number;
  price: number;
  /** Stator size factor (cinewhoop thrust scales with it). */
  sz?: number;
  /** Highest cell count the winding is made for. */
  maxCells?: number;
  /** Physically too big for the frame's mounts (Crazyflie 8x20). */
  big?: boolean;
};

export type CalcProp = {
  /** Thrust factor relative to the craft's reference prop. */
  pf: number;
  /** Efficiency factor relative to the craft's reference prop. */
  eff: number;
  g: number;
  /** Price per pair, or per prop when the model says `propPrice: 'each'`. */
  price: number;
  /** Prop radius in mm, for the clash check on crafts with an arm radius. */
  r?: number;
};

export type CalcFixedPart = { id: string; g: number; price: number; category: CostCategory };

/** When the motor spins the props too fast for the motor and ESC ("over"). */
export type OverRule =
  | { kind: 'kvCells'; max: number } // kv * cells > max
  | { kind: 'kvCellsPf'; max: number } // kv * cells * pf > max: prop size counts
  | { kind: 'motorCells' } // cells > motor.maxCells
  | { kind: 'maxAmps'; max: number } // full-throttle current past the ESC
  | { kind: 'bigMotor' }; // motor.big

/** Full-throttle thrust per motor in grams, and the full-throttle current that goes with it. */
export type ThrustRule =
  // thrust = k * pf * krpm^2 (times motor.sz when motorSize), capped at overCap grams when the build is over;
  // max current = n * thrust / (maxGPerW * eff) / V
  | { kind: 'krpm'; k: number; maxGPerW: number; motorSize?: boolean; overCap?: number }
  // thrust = grams * (kv / refKv)^2 * pf; max current = n * amps * (kv / refKv)^2 * pf
  | { kind: 'reference'; refKv: number; grams: number; amps: number };

/** How the craft stays up, which sets the hover (or cruise) current and the two flight times. */
export type FlightRule =
  // hoverA = AUW / (gPerW * eff) / V; flyMin = flyFactor * hoverMin
  | { kind: 'multirotor'; gPerW: number; flyFactor: number }
  // hovers like a multirotor, then the wing carries it at `speed` m/s: flyMin is the cruise time
  | { kind: 'vtol'; gPerW: number; speed: number; liftToDrag: number; efficiency: number }
  // one pusher motor and no hover: hoverA and hoverMin are the cruise current and time
  | {
      kind: 'wing';
      speedK: number; // minimum flying speed = speedK * sqrt(kg / loadRef)
      loadRef: number;
      stallRatio: number;
      cruiseRatio: number;
      liftToDrag: number;
      efficiency: number; // prop + motor efficiency in cruise
      flyFactor: number;
    };

export type CalcModel = {
  motors: number;
  thrust: ThrustRule;
  flight: FlightRule;
  /** Share of the capacity that is usable. */
  usable: number;
  minTW: number;
  over: OverRule;
  /** Payload carried on every flight (the agri tank's 10 L of liquid). */
  payloadG?: number;
  /** A prop price covers a pair (the cost is price * ceil(n / 2)) or one prop (price * n). */
  propPrice: 'pair' | 'each';
  /** Centre-to-motor distance on a round frame; enables the prop clash check. */
  armRadiusMm?: number;
  /** Continuous rating of each motor's ESC, for the over-current check. */
  escAmps?: number;
  /** Hover throttle above which the hover-high check warns, when the craft's motor data allows more than 60 %. */
  hoverLimit?: number;
};

export type CalcInput = {
  model: CalcModel;
  fixed: readonly CalcFixedPart[];
  battery: CalcBattery;
  motor: CalcMotor;
  prop: CalcProp;
};

export type CalcCruise = {
  /** Cruise speed, m/s. */
  speed: number;
  /** Current in cruise, A. */
  amps: number;
  /** Minimum flying speed (full lift), m/s; wing only. */
  minSpeed?: number;
  /** Stall speed, m/s; wing only. */
  stall?: number;
  /** Top speed, m/s; wing only. */
  top?: number;
  /** Drag at cruise, N; wing only. */
  dragN?: number;
};

export type CalcResult = {
  n: number;
  /** Nominal pack voltage. */
  V: number;
  /** No-load kilo-rpm. */
  krpm: number;
  /** Full-throttle thrust per motor, g. */
  thrust: number;
  /** All-up weight, g. */
  auw: number;
  /** Thrust to weight. */
  tw: number;
  /** Throttle share at hover (wing: the cruise throttle). Above 1 means it cannot hover. */
  hoverThr: number;
  /** Current at hover (wing: at cruise), A. */
  hoverA: number;
  /** Minutes of hover (wing: of cruise). */
  hoverMin: number;
  /** Minutes of aggressive flying (VTOL: of cruise). */
  flyMin: number;
  /** Full-throttle current, A. */
  maxA: number;
  over: boolean;
  weak: boolean;
  cost: { electrical: number; mechanical: number; total: number };
  cruise?: CalcCruise;
};

const G = 9.81;

function spinsTooFast(rule: Exclude<OverRule, { kind: 'maxAmps' }>, b: CalcBattery, m: CalcMotor, pr: CalcProp) {
  switch (rule.kind) {
    case 'kvCells':
      return m.kv * b.cells > rule.max;
    case 'kvCellsPf':
      return m.kv * b.cells * pr.pf > rule.max;
    case 'motorCells':
      return b.cells > (m.maxCells ?? Infinity);
    case 'bigMotor':
      return m.big === true;
  }
}

export function calc({ model, fixed, battery: b, motor: m, prop: pr }: CalcInput): CalcResult {
  const n = model.motors;
  const V = b.cells * 3.7;
  const krpm = (m.kv * V) / 1000;
  const t = model.thrust;

  // "over" decides the thrust cap, except on the current-limited wing, where it needs the thrust first.
  const rule = model.over;
  const overSpin = rule.kind !== 'maxAmps' && spinsTooFast(rule, b, m, pr);

  let thrust: number;
  let maxA: number;
  if (t.kind === 'krpm') {
    thrust = t.k * (t.motorSize ? (m.sz ?? 1) : 1) * pr.pf * krpm ** 2;
    if (t.overCap !== undefined && overSpin) thrust = Math.min(t.overCap, thrust);
    maxA = (n * thrust) / (t.maxGPerW * pr.eff) / V;
  } else {
    const scale = (m.kv / t.refKv) ** 2 * pr.pf;
    thrust = t.grams * scale;
    maxA = n * t.amps * scale;
  }
  const over = rule.kind === 'maxAmps' ? maxA > rule.max : overSpin;

  const auw = fixed.reduce((sum, p) => sum + p.g, 0) + n * m.g + n * pr.g + b.g + (model.payloadG ?? 0);
  const tw = (n * thrust) / auw;
  const usableAh = (b.mah / 1000) * model.usable;
  const minutesAt = (amps: number) => (usableAh / amps) * 60;

  const f = model.flight;
  let hoverThr = Math.sqrt(auw / (n * thrust));
  let hoverA: number;
  let flyMin: number;
  let cruise: CalcCruise | undefined;
  if (f.kind === 'multirotor') {
    hoverA = auw / (f.gPerW * pr.eff) / V;
    flyMin = minutesAt(hoverA) * f.flyFactor;
  } else if (f.kind === 'vtol') {
    hoverThr = Math.min(1, hoverThr);
    hoverA = auw / (f.gPerW * pr.eff) / V;
    const amps = (((auw * G) / 1000) * f.speed) / f.liftToDrag / f.efficiency / V;
    flyMin = minutesAt(amps);
    cruise = { speed: f.speed, amps };
  } else {
    const kg = auw / 1000;
    const minSpeed = f.speedK * Math.sqrt(kg / f.loadRef);
    const speed = f.cruiseRatio * minSpeed;
    const dragN = (kg * G) / f.liftToDrag;
    const thrustN = (thrust / 1000) * G;
    hoverThr = Math.sqrt(Math.min(1, dragN / thrustN));
    hoverA = (kg * G * speed) / f.liftToDrag / f.efficiency / pr.eff / V;
    flyMin = minutesAt(hoverA) * f.flyFactor;
    const cd = dragN / speed ** 2;
    cruise = { speed, amps: hoverA, minSpeed, stall: f.stallRatio * minSpeed, top: Math.sqrt(thrustN / cd), dragN };
  }

  let electrical = n * m.price + b.price;
  let mechanical = pr.price * (model.propPrice === 'pair' ? Math.ceil(n / 2) : n);
  for (const p of fixed) {
    if (p.category === 'Electrical') electrical += p.price;
    else mechanical += p.price;
  }

  return {
    n,
    V,
    krpm,
    thrust,
    auw,
    tw,
    hoverThr,
    hoverA,
    hoverMin: minutesAt(hoverA),
    flyMin,
    maxA,
    over,
    weak: tw < model.minTW,
    cost: { electrical, mechanical, total: electrical + mechanical },
    cruise,
  };
}

const GRAMS: Range = { min: 0, max: 1e5 };
const PRICE: Range = { min: 0, max: 1e6 };
const POSITIVE: Range = { min: 0, max: 1e6, minExclusive: true };
const SHARE: Range = { min: 0, max: 1, minExclusive: true };

/** Allowed range of every number `calc` reads, by dotted path into the input; `fixed[]` stands for each fixed part. */
export const CALC_RANGES: Readonly<Record<string, Range>> = {
  'model.motors': { min: 1, max: 12, integer: true },
  'model.usable': SHARE,
  'model.minTW': POSITIVE,
  'model.payloadG': GRAMS,
  'model.armRadiusMm': POSITIVE,
  'model.escAmps': POSITIVE,
  'model.hoverLimit': SHARE,
  'model.thrust.k': POSITIVE,
  'model.thrust.maxGPerW': POSITIVE,
  'model.thrust.overCap': POSITIVE,
  'model.thrust.refKv': POSITIVE,
  'model.thrust.grams': POSITIVE,
  'model.thrust.amps': POSITIVE,
  'model.flight.gPerW': POSITIVE,
  'model.flight.flyFactor': POSITIVE,
  'model.flight.speed': POSITIVE,
  'model.flight.liftToDrag': POSITIVE,
  'model.flight.efficiency': POSITIVE,
  'model.flight.speedK': POSITIVE,
  'model.flight.loadRef': POSITIVE,
  'model.flight.stallRatio': POSITIVE,
  'model.flight.cruiseRatio': POSITIVE,
  'battery.cells': { min: 1, max: 24, integer: true },
  'battery.mah': { min: 0, max: 1e6, minExclusive: true },
  'battery.g': GRAMS,
  'battery.price': PRICE,
  'battery.parallel': { min: 1, max: 24, integer: true },
  'battery.cRating': POSITIVE,
  'motor.kv': { min: 0, max: 60_000, minExclusive: true },
  'motor.g': GRAMS,
  'motor.price': PRICE,
  'motor.sz': POSITIVE,
  'motor.maxCells': { min: 1, max: 24, integer: true },
  'prop.pf': { min: 0, max: 20, minExclusive: true },
  'prop.eff': { min: 0, max: 20, minExclusive: true },
  'prop.g': GRAMS,
  'prop.price': PRICE,
  'prop.r': POSITIVE,
  'fixed[].g': GRAMS,
  'fixed[].price': PRICE,
};

function numbersOf(prefix: string, o: object, required: readonly string[], optional: readonly string[] = []) {
  const record = o as Record<string, unknown>;
  const present = optional.filter((k) => record[k] !== undefined);
  return [...required, ...present].map((k) => [`${prefix}.${k}`, record[k]] as [string, unknown]);
}

/** The first input number outside `CALC_RANGES`, in a fixed order; optional fields are checked when present. */
export function validateCalcInput(i: CalcInput): OutOfRange | null {
  const t = i.model.thrust;
  const f = i.model.flight;
  const fields: [string, unknown][] = [
    ...numbersOf('model', i.model, ['motors', 'usable', 'minTW'], ['payloadG', 'armRadiusMm', 'escAmps', 'hoverLimit']),
    ...(t.kind === 'krpm'
      ? numbersOf('model.thrust', t, ['k', 'maxGPerW'], ['overCap'])
      : numbersOf('model.thrust', t, ['refKv', 'grams', 'amps'])),
    ...(f.kind === 'multirotor'
      ? numbersOf('model.flight', f, ['gPerW', 'flyFactor'])
      : f.kind === 'vtol'
        ? numbersOf('model.flight', f, ['gPerW', 'speed', 'liftToDrag', 'efficiency'])
        : numbersOf('model.flight', f, [
            'speedK', 'loadRef', 'stallRatio', 'cruiseRatio', 'liftToDrag', 'efficiency', 'flyFactor',
          ])),
    ...numbersOf('battery', i.battery, ['cells', 'mah', 'g', 'price'], ['parallel', 'cRating']),
    ...numbersOf('motor', i.motor, ['kv', 'g', 'price'], ['sz', 'maxCells']),
    ...numbersOf('prop', i.prop, ['pf', 'eff', 'g', 'price'], ['r']),
  ];
  i.fixed.forEach((p, at) => {
    fields.push([`fixed[${at}].g`, p.g], [`fixed[${at}].price`, p.price]);
  });
  return checkAll(fields.map(([field, value]) => [field, value, CALC_RANGES[field.replace(/\[\d+\]/, '[]')]] as const));
}

/** `calc` for input that may be wrong: a bad field, or any non-finite output, comes back as an error instead of a number. */
export function calcChecked(i: CalcInput): CalcResult | OutOfRange {
  const bad = validateCalcInput(i);
  if (bad) return bad;
  const r = calc(i);
  return firstNonFinite('result', r) ?? r;
}

/** Distance between neighbouring motors on a round frame, mm. */
export function motorChordMm(model: CalcModel): number | undefined {
  if (model.armRadiusMm === undefined) return undefined;
  return 2 * model.armRadiusMm * Math.sin(Math.PI / model.motors);
}

export type DesignCheck =
  | { code: 'over-spin'; kv: number; cells: number }
  | { code: 'weak'; tw: number; minTW: number }
  | { code: 'cannot-hover'; tw: number }
  | { code: 'hover-high'; hoverThr: number }
  | { code: 'esc-overcurrent'; perMotorA: number; escA: number }
  | { code: 'battery-overcurrent'; maxA: number; limitA: number }
  | { code: 'prop-clash'; spanMm: number; chordMm: number }
  | { code: 'tail-heavy' }
  | { code: 'short-flight'; flyMin: number };

export type CheckLevel = 'danger' | 'warn' | 'info';

/** Hover throttle above this leaves too little headroom to correct and climb (a model's hoverLimit overrides it). */
export const HOVER_THR_LIMIT = 0.6;
/** Highest current a 21700 Li-ion cell gives without sagging hard, per parallel cell. */
export const LIION_CELL_A = 45;
/** Fewer minutes of aggressive flying than this is worth a note. */
export const SHORT_FLIGHT_MIN = 2;

export const checkLevel: Record<DesignCheck['code'], CheckLevel> = {
  'over-spin': 'danger',
  weak: 'danger',
  'cannot-hover': 'danger',
  'prop-clash': 'danger',
  'esc-overcurrent': 'warn',
  'battery-overcurrent': 'warn',
  'hover-high': 'warn',
  'tail-heavy': 'warn',
  'short-flight': 'info',
};

/** Battery current limit in amps, when the pack's chemistry or rating gives one. */
export function batteryLimitA(b: CalcBattery): number | undefined {
  if (b.cRating !== undefined) return (b.mah / 1000) * b.cRating;
  if (b.liion) return LIION_CELL_A * (b.parallel ?? 1);
  return undefined;
}

/**
 * Every design problem of a build, most serious first. The original site only had "over" and "weak";
 * these add what it never compared: current against the ESC and the pack, hover headroom, prop clearance.
 * The VTOL hovers on its motors, so its hover checks apply; the wing never hovers, so they don't.
 */
export function designChecks(input: CalcInput, r: CalcResult = calc(input)): DesignCheck[] {
  const { model, battery: b, motor: m, prop: pr } = input;
  const checks: DesignCheck[] = [];
  const hovers = model.flight.kind !== 'wing';

  if (r.over) checks.push({ code: 'over-spin', kv: m.kv, cells: b.cells });
  if (hovers && r.tw < 1) checks.push({ code: 'cannot-hover', tw: r.tw });
  else if (r.weak) checks.push({ code: 'weak', tw: r.tw, minTW: model.minTW });

  const chord = motorChordMm(model);
  if (chord !== undefined && pr.r !== undefined && 2 * pr.r > chord) {
    checks.push({ code: 'prop-clash', spanMm: 2 * pr.r, chordMm: chord });
  }
  if (model.escAmps !== undefined && r.maxA / r.n > model.escAmps) {
    checks.push({ code: 'esc-overcurrent', perMotorA: r.maxA / r.n, escA: model.escAmps });
  }
  const limit = batteryLimitA(b);
  if (limit !== undefined && r.maxA > limit) checks.push({ code: 'battery-overcurrent', maxA: r.maxA, limitA: limit });
  const hoverLimit = model.hoverLimit ?? HOVER_THR_LIMIT;
  if (hovers && r.tw >= 1 && r.hoverThr > hoverLimit) checks.push({ code: 'hover-high', hoverThr: r.hoverThr });
  if (model.flight.kind === 'wing' && b.cg === 'tail') checks.push({ code: 'tail-heavy' });
  if (r.flyMin < SHORT_FLIGHT_MIN) checks.push({ code: 'short-flight', flyMin: r.flyMin });
  return checks;
}

/** The original site's verdict lines, in its order: "over" and "weak" can both apply; "ok" only alone. */
export type Verdict = 'over' | 'weak' | 'ok';

export function verdicts(r: CalcResult): Verdict[] {
  const out: Verdict[] = [];
  if (r.over) out.push('over');
  if (r.weak) out.push('weak');
  return out.length ? out : ['ok'];
}

/** Decimals the original showed on each design tile; format with Intl.NumberFormat in the viewer's locale. */
export const tileDigits = {
  auw: 0,
  tw: 1,
  hoverThrPercent: 0,
  maxA: 0,
  hoverMin: 1,
  flyMin: 1,
  speedKmh: 0,
} as const;
