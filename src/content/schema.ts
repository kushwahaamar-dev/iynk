// SimLab content contract. Every board, robotics bench and drone is one data module
// (src/content/<lab>/<id>.ts) whose default export satisfies one of the *Content types below.
// Rules: text fields hold keys into src/i18n/content/<lang>/<lab>/<id>.json (never prose);
// identifiers, part numbers, pin names and code stay literal. Content modules may only
// `import type` (scripts/gen-content-index.mjs loads them with Node's type stripping).
// Changes after 14:00 CDT Oct 24 are additive only and logged in docs/ARCHITECTURE.md.

import type {
  CalcBattery,
  CalcFixedPart,
  CalcInput,
  CalcModel,
  CalcMotor,
  CalcProp,
  CalcResult,
} from '@/lib/drone/calc';
import type { BoardId, DroneId, ModuleId, PartId, RoboticsId } from './ids';

/* ---------- shared ---------- */

export type Locale = 'en' | 'es' | 'fr' | 'de' | 'zh' | 'hi';
export type Lab = 'board' | 'robotics' | 'drone';

/** Key into the item's content JSON, e.g. "lessons.blink.title". Scheme: docs/ARCHITECTURE.md §5. */
export type TextKey = string;

export type Palette = 'tomato' | 'mustard' | 'mint' | 'cobalt' | 'blush' | 'mono';
export type Language = 'arduino-cpp' | 'micropython' | 'python' | 'verilog';
/** Jumper colours the Board Bench engine draws (docs/FIGURES-BENCH.md §9). */
export type WireColor = 'red' | 'black' | 'orange' | 'yellow' | 'green' | 'blue' | 'white' | 'purple' | 'brown' | 'grey';
export type LedColor = 'red' | 'green' | 'yellow' | 'orange' | 'blue' | 'white' | 'rgb';

/** A datasheet or official document a fact was checked against. */
export interface Source {
  title: string;
  url: string;
}

/** What a figure reports in its `state` event (guide 2.3; fields per engine in docs/FIGURES-BENCH.md §13, docs/FIGURES-DRONE.md §10). */
export type FigureState = Record<string, unknown>;
/** Dot paths into FigureState and the values they must equal: { build: 'assembled', 'controls.SW1': 1 }. */
// Partial so content can stay `satisfies XContent`: an array of steps whose `done` objects name different paths
// widens to optional-undefined fields, which a plain Record rejects. Evaluators read only the keys that exist.
export type StateCond = Partial<Record<string, string | number | boolean | null>>;

/** One host -> figure bridge message (D6). `set` carries a state patch the figure validates. */
export type BridgeCommand =
  | { type: 'press'; id: string; choice?: string }
  | { type: 'act'; name: string; data?: Record<string, unknown> }
  | { type: 'set'; state: Record<string, unknown> };

/* ---------- figures ---------- */

export type FigureKind = 'boards' | 'parts' | 'modules' | 'robotics' | 'drones' | 'flight';
export type FigurePage = `/figures/${FigureKind}/${string}.html`;

/** Views the figure draws: Board Bench `view` values, plus the drone engine's wiring sheet. */
export type Sheet = 'board' | 'breadboard' | 'schematic' | 'power' | 'wiring';

export type PartRole =
  | 'mcu' | 'soc' | 'fpga' | 'memory' | 'regulator' | 'usb-bridge' | 'debugger' | 'crystal' | 'connector'
  | 'header' | 'led' | 'button' | 'switch' | 'passive' | 'protection' | 'antenna' | 'radio' | 'display'
  | 'sensor' | 'driver' | 'socket' | 'jumper' | 'mechanical' | 'other';

/**
 * Host-side text for one part the figure draws. `id` is the figure's part id (silkscreen designator), as in
 * `part` events and `set {select}`. Geometry, build group, polarity and removability live in the figure file.
 */
export interface FigurePart {
  id: string;
  /** Pill text as the figure prints it ("U1", "USB"); literal. */
  short: string;
  role: PartRole;
  name: TextKey;
  what: TextKey;
}

export interface FigureRef {
  /** The palette is ItemMeta.palette in ids.ts (one source). */
  page: FigurePage;
  parts: FigurePart[];
  sheets: Sheet[];
}

/* ---------- boards ---------- */

export type InterpTarget = 'avr' | 'renesas-ra4m1' | 'esp32' | 'esp32-s3' | 'esp8266' | 'rp2040' | 'rp2350' | 'stm32f4' | 'nrf52' | 'linux' | 'fpga';

export interface Mcu {
  /** Exact part number, e.g. "ATmega328P", "ESP32-S3-WROOM-1-N8R8", "XC7A35T-1CPG236C". */
  part: string;
  /** Core description as documented, e.g. "AVR 8-bit", "Xtensa LX7 dual-core", "Arm Cortex-M4F". */
  core: string;
  cores: number;
  clockHz: number;
  flashBytes?: number;
  ramBytes?: number;
  eepromBytes?: number;
  /** Interpreter target; it fixes C `int` width (16-bit on avr, 32-bit elsewhere) and the API shims. */
  target: InterpTarget;
  adcBits?: number;
  wireless: ('wifi' | 'ble' | 'bt-classic' | '802.15.4')[];
  /** FPGA boards: logic cells and the board oscillator. */
  fpga?: { family: string; logicCells: number; clockHz: number; toolchain: string };
  /** Second chip with its own job (USB bridge, ST-LINK, RP1, nRF52820 interface, ESP32-S3 on UNO R4 WiFi). */
  companions: { part: string; role: TextKey }[];
}

export type Connector =
  | 'usb-b' | 'usb-c' | 'micro-usb' | 'mini-usb' | 'barrel-5.5x2.1' | 'jst-ph-2' | 'header-pin' | 'screw-terminal' | 'battery-pack';

export interface PowerInput {
  id: string;
  connector: Connector;
  /** Figure part id of the connector or pin. */
  part: string;
  volts: { min: number; max: number; recommended?: [number, number] };
  maxCurrentMa?: number;
  reverseProtected: boolean;
  /** What protects it (polyfuse, diode, ideal diode) and what happens outside the limits. */
  protection: TextKey;
}

export interface PowerRail {
  name: string;
  volts: number;
  maxCurrentMa?: number;
  /** Regulator or source part id. */
  from: string;
  note: TextKey;
}

export interface BoardPower {
  inputs: PowerInput[];
  rails: PowerRail[];
  io: { perPinMa: number; absMaxPerPinMa?: number; totalMa?: number; note: TextKey };
  /** Supply voltage at which the board resets (brown-out detector or regulator dropout). */
  brownoutVolts: number;
  idleMa: number;
}

export type PinCap =
  | 'digital' | 'pwm' | 'analog-in' | 'analog-out' | 'interrupt' | 'touch' | 'uart' | 'i2c' | 'spi' | 'i2s'
  | 'can' | 'usb' | 'swd' | 'jtag' | 'pio' | 'fpga-io' | 'clock' | 'led' | 'strapping' | 'input-only'
  | 'power' | 'gnd' | 'reset' | 'nc';

export interface PinRow {
  /** Header or connector as documented: "DIGITAL", "POWER", "CN7", "J1", "GPIO", "JA", "edge". */
  header: string;
  /** Position in that header ("1".."40") or the pin's own name for unnumbered headers. */
  pin: string;
  /** Name as printed or documented: "D13", "GP25", "GPIO38", "3V3", "P0", "SW0", "LD0". */
  label: string;
  /** Alternate functions as documented: "PWM", "INT0", "SPI SCK", "ADC1_CH0", "TOUCH1". */
  functions: string[];
  caps: PinCap[];
  /** Logic level, or the rail voltage of a power pin; null for GND and NC. */
  volts: number | null;
  fiveVoltTolerant?: boolean;
  maxCurrentMa?: number;
  /** Net name shared with the figure and the interpreters ("D13", "GP25", "5V"; docs/FIGURES-BENCH.md §0). */
  net: string;
  /** FPGA package pin (e.g. "U16") used in XDC/QSF snippets. */
  fpgaPin?: string;
  note?: TextKey;
}

export interface OnboardLed {
  /** Figure part id. */
  id: string;
  label: string;
  color: LedColor;
  /** Pin label that drives it, or what lights it. */
  drivenBy: string | 'power' | 'usb-tx' | 'usb-rx' | 'charge' | 'status';
  activeLow: boolean;
  note: TextKey;
}

export interface OnboardControl {
  /** Figure part id. */
  id: string;
  label: string;
  kind: 'reset' | 'boot' | 'bootsel' | 'user-button' | 'slide-switch' | 'dip-switch' | 'jumper' | 'touch' | 'power-switch';
  pin?: string;
  activeLow: boolean;
  /** Figure act that presses or flips it. */
  act: string;
  effect: TextKey;
}

export interface OnboardDisplay {
  id: string;
  kind: 'seven-segment' | 'led-matrix' | 'oled' | 'lcd';
  /** Digits x 1 for 7-segment, columns x rows for matrices. */
  size: [number, number];
  /** Pin labels for segments/anodes/rows, in documented order. */
  pins: string[];
  activeLow: boolean;
  note: TextKey;
}

/** A sensor, actuator or module this board can be wired to, and how. */
export interface Wireable {
  part: PartId | ModuleId;
  /** part pin -> board pin label. */
  connections: { from: string; to: string; color: WireColor }[];
  supplyVolts: number;
  /** Level shifting or current limits the wiring needs (e.g. HC-SR04 echo into a 3.3 V pin). */
  caution?: TextKey;
  note: TextKey;
}

export type FailureKind =
  | 'reverse-polarity' | 'brownout' | 'wrong-voltage' | 'cold-solder' | 'short' | 'missing-part'
  | 'reversed-part' | 'overcurrent' | 'level-mismatch' | 'boot-strap' | 'floating-input' | 'thermal' | 'config';

/** How the user causes a failure from the UI. Every failure must be reachable (S7). */
export type FailureTrigger =
  | { by: 'power-input'; input: string; volts: number }
  | { by: 'reverse'; input: string }
  | { by: 'load'; rail: string; ma: number; part?: PartId | ModuleId }
  | { by: 'cold-joint'; part: string; pin?: string }
  | { by: 'remove-part'; part: string }
  | { by: 'reverse-part'; part: string }
  | { by: 'short'; nets: [string, string] }
  | { by: 'control'; control: string; during: 'boot' | 'run' }
  | { by: 'wiring'; part: PartId | ModuleId; from: string; to: string }
  | { by: 'setting'; key: string; value: string | number | boolean };

export interface FailureEffect {
  power: 'on' | 'off' | 'resetting';
  /** The program stops running. */
  halts: boolean;
  pins?: Record<string, 'stuck-low' | 'stuck-high' | 'noisy' | 'dead'>;
  /** Part ids damaged until replaced (smoke, vented cap, burnt LED). */
  damages?: string[];
  /** Extra supply current while the fault lasts. */
  extraMa?: number;
  /** Serial lines the run prints (e.g. the setup banner repeating on brown-out). */
  serial?: string[];
}

export interface FailureMode {
  id: string;
  kind: FailureKind;
  trigger: FailureTrigger;
  /** Message that triggers it in the figure, e.g. { type: 'set', state: { fault: 'brownout' } } (engine fault ids). */
  figure: BridgeCommand;
  effect: FailureEffect;
  title: TextKey;
  symptom: TextKey;
  explanation: TextKey;
  fix: TextKey;
}

export interface BuildStep {
  id: string;
  /** build = assemble, break = trigger a fault on purpose, test = power-up or measurement check. */
  kind: 'build' | 'break' | 'test';
  /** What the "Do it" button sends; null when the learner does it in the figure. */
  action: BridgeCommand | null;
  /** Figure state that marks the step done. */
  done: StateCond;
  /** Failure shown by a break step. */
  fault?: string;
  /** A quiz follows this step. */
  major: boolean;
  title: TextKey;
  body: TextKey;
  /** Shown when the step is tried out of order (the originals' refusals). */
  refusal?: TextKey;
}

/* ---------- code, circuits, runs and checks ---------- */

/**
 * Starter code. Literal code with two token kinds:
 *  {{p:<paramId>}}  replaced by the param chip's current code text,
 *  {{t:<textKey>}}  replaced by the translated text (use only inside comments and string literals shown to the user).
 */
export interface CodeTemplate {
  source: string;
  /** Library shims the interpreter must provide, e.g. "Servo", "Wire", "Adafruit_SSD1306", "gpiozero", "rclpy". */
  libraries: string[];
  /** Verilog only: the top module (its parameters take `{{p:id}}` overrides). */
  top?: string;
  /** Verilog only: top-level port -> board nets, bit 0 first (the XDC/QSF mapping), e.g. { led: ['LD0', …] }. */
  ports?: Record<string, string[]>;
}

/** A circuit part param the chip also sets in the figure: `set {params: {[part]: {[key]: value}}}`. */
export type ChipTarget = { part: string; key: string };

export type ParamChip =
  | { id: string; kind: 'number'; label: TextKey; default: number; min: number; max: number; step: number; unit?: string; keepApart?: { param: string; op: '<' | '>'; gap: number }; figure?: ChipTarget }
  | { id: string; kind: 'choice'; label: TextKey; default: string; options: { value: string; code: string; figureValue?: string | number; label: TextKey; note?: TextKey }[]; figure?: ChipTarget }
  | { id: string; kind: 'toggle'; label: TextKey; default: boolean; code: { on: string; off: string }; figure?: ChipTarget };

/**
 * How a world input reaches the pins; src/lib/interp implements each device.
 * `pins` on the WorldInput are in the order the device lists them.
 */
export type DeviceModel =
  | { kind: 'button'; pull: 'external-down' | 'external-up' | 'internal-up' | 'internal-down'; bounceMs: number }
  | { kind: 'switch' }
  | { kind: 'pot'; ohms: number }
  | { kind: 'divider'; sensor: 'ldr' | 'fsr' | 'thermistor'; fixedOhms: number; sensorTo: 'vcc' | 'gnd' }
  | { kind: 'linear'; voltsAtMin: number; voltsAtMax: number }
  | { kind: 'tmp36' }
  | { kind: 'hc-sr04' }
  | { kind: 'mpu6050'; address: number }
  | { kind: 'qtr-rc'; sensors: number }
  | { kind: 'onboard'; sensor: 'accelerometer' | 'compass' | 'temperature' | 'light' | 'microphone' | 'touch' }
  /** Wi-Fi/BLE peer: the value picks requests[value] (e.g. "GET /led/on"), sent at the event's time. */
  | { kind: 'network'; ssid: string; ip: string; requests: string[]; password?: string | null };

export type WorldQuantity =
  | 'button' | 'switch' | 'level' | 'distance-cm' | 'light-lux' | 'temperature-c' | 'force-n' | 'angle-deg'
  | 'moisture-pct' | 'voltage' | 'tilt-deg' | 'accel-g' | 'line-position' | 'touch' | 'sound-db' | 'heading-deg'
  | 'request';

/** A world input the learner (or a script) changes while the code runs. */
export interface WorldInput {
  id: string;
  quantity: WorldQuantity;
  device: DeviceModel;
  /** Board pins (net names) the device drives, in the device's order (hc-sr04: [trig, echo]). */
  pins: string[];
  /** Figure part it belongs to (for gestures in the scene and `inputs` reports). */
  part: string;
  min: number;
  max: number;
  step: number;
  default: number;
  unit?: string;
  gesture: 'press' | 'slide' | 'knob' | 'squeeze' | 'tap' | 'drag' | 'tilt';
  label: TextKey;
}

/** World event at a virtual time; checks replay these, so a run is deterministic (D14c). */
export interface WorldEvent {
  t: number;
  input: string;
  value: number;
}

export interface WorldModel {
  inputs: WorldInput[];
  /** Scripted events used by checks and replays. */
  script: WorldEvent[];
}

export type PinMode = 'out' | 'in' | 'pullup' | 'pwm' | 'analog' | 'tone' | 'servo' | 'pulse';

/** What a deterministic run produced. src/lib/interp writes it; checks read it. */
export interface RunTrace {
  ms: number;
  error: { line: number; message: string } | null;
  serial: { t: number; text: string }[];
  /** Pin changes: v is 0/1 for out/in, duty 0..1 for pwm, volts for analog, Hz for tone, degrees for servo. */
  pins: Record<string, { t: number; v: number; mode: PinMode }[]>;
  /** `set` patches sent to the figure, in order. */
  figure: { t: number; state: Record<string, unknown> }[];
  inputs: WorldEvent[];
  /** HTTP requests the world's network inputs sent to the sketch's web server, with the answers. */
  http?: { t: number; method: string; path: string; status: number; body: string }[];
}

/** A completion check, evaluated on a RunTrace (src/lib/interp/checks.ts). */
export type Check =
  | { kind: 'runs'; minMs: number; label: TextKey }
  | { kind: 'serial'; match: string; regex: boolean; minCount: number; byMs?: number; label: TextKey }
  | { kind: 'pin-level'; pin: string; level: 0 | 1; atMs: number; label: TextKey }
  | { kind: 'pin-toggles'; pin: string; periodMs: [number, number]; minCycles: number; label: TextKey }
  | { kind: 'pwm'; pin: string; duty: [number, number]; atMs: number; label: TextKey }
  | { kind: 'tone'; pin: string; hz: [number, number]; atMs: number; label: TextKey }
  | { kind: 'servo'; pin: string; deg: [number, number]; atMs: number; label: TextKey }
  | { kind: 'responds'; after: WorldEvent; pin: string; withinMs: number; mode: PinMode; v: [number, number]; label: TextKey }
  | { kind: 'code'; must: string[]; mustNot: string[]; label: TextKey }
  | { kind: 'state'; atMs: number; equals: StateCond; label: TextKey };

export interface SerialSpec {
  baud: number;
  /** Lines the reference run prints, for the docs and the e2e tests. */
  sample: string[];
}

export interface Lesson {
  id: string;
  /** 1-based order on the board. */
  n: number;
  /** The progression the brief asks for. */
  level: 'intro' | 'io' | 'input' | 'analog' | 'protocol' | 'wireless' | 'project';
  language: Language;
  code: CodeTemplate;
  params: ParamChip[];
  /** Figure circuit key to show (the board figure's `circuits`, docs/FIGURES-BENCH.md §9); null = the bare board. */
  circuit: string | null;
  world: WorldModel;
  serial: SerialSpec;
  /** Virtual run length the checks use. */
  runMs: number;
  checks: Check[];
  /** Variant ids this lesson needs (e.g. Pico W only); empty = all. */
  variants: string[];
  /** Pins the lesson uses, for the pinout table and the schematic. */
  pins: { pin: string; to: TextKey; role: TextKey; color: WireColor }[];
  callouts: { part: string; text: TextKey }[];
  specs: { label: TextKey; value: TextKey }[];
  /** Three or four feature lines; icon is a design-system icon name. */
  features: { icon: string; text: TextKey }[];
  title: TextKey;
  lede: TextKey;
  steps: TextKey[];
  hints: TextKey[];
  quiz?: Quiz;
}

export interface BoardVariant {
  id: string;
  /** Product name, literal: "Arduino UNO R4 WiFi". */
  name: string;
  note: TextKey;
  mcu?: Mcu;
  power?: BoardPower;
  leds?: OnboardLed[];
  controls?: OnboardControl[];
  displays?: OnboardDisplay[];
  /** Rows that replace the rows with the same header + pin. */
  pinPatch?: PinRow[];
  /** Sent to the figure as `set {variant: id}`. */
  figureVariant: string;
}

export interface BoardContent {
  lab: 'board';
  id: BoardId;
  /** Maker, literal: "Arduino", "Espressif", "Digilent". */
  maker: string;
  /** Default variant first; [] when the board has none. */
  variants: BoardVariant[];
  mcu: Mcu;
  logicVolts: number;
  power: BoardPower;
  pinout: PinRow[];
  leds: OnboardLed[];
  controls: OnboardControl[];
  displays: OnboardDisplay[];
  figure: FigureRef;
  wireables: Wireable[];
  failures: FailureMode[];
  assembly: BuildStep[];
  lessons: Lesson[];
  serial: SerialSpec;
  sources: Source[];
  title: TextKey;
  tagline: TextKey;
  overview: TextKey;
}

/* ---------- robotics ---------- */

export interface QuizQuestion {
  id: string;
  q: TextKey;
  options: TextKey[];
  answer: number;
  why: TextKey;
}

export interface Quiz {
  id: string;
  /** Build step it follows; null = end-of-bench quiz. */
  afterStep: string | null;
  questions: QuizQuestion[];
}

/** A program or position the bench can run ("Upload sketch ▾", "Move jumper ▾", "Turn trimpot ▾"). */
export interface BenchMode {
  id: string;
  /** No upload: switches at once, works unplugged. */
  instant: boolean;
  language: Language;
  code: CodeTemplate;
  bytes: number;
  serial: string[];
  title: TextKey;
}

export interface StatusField {
  id: string;
  /** Key in the figure's state report (or 'currentMa' from the current model). */
  key: string;
  format: 'on-off' | 'high-low' | 'running' | 'number' | 'text' | 'ma' | 'volts' | 'percent' | 'rpm' | 'deg' | 'cm' | 'hz';
  label: TextKey;
}

export interface CurrentModel {
  supplies: { id: string; volts: number; limitMa: number; label: TextKey }[];
  /** Loads summed while their condition holds; perUnit scales with a numeric state value (e.g. motor duty). */
  loads: { id: string; supply: string; ma: number; when: StateCond; perUnit?: { key: string; maPerUnit: number }; label: TextKey }[];
}

export interface PracticeTask {
  id: string;
  board: BoardId;
  language: Language;
  starter: CodeTemplate;
  /** Reference solution; the unit tests prove it passes every check. */
  solution: string;
  /** Figure circuit key, or null for the bench as built. */
  circuit: string | null;
  world: WorldModel;
  runMs: number;
  checks: Check[];
  title: TextKey;
  brief: TextKey;
  hints: TextKey[];
}

export interface RoboticsContent {
  lab: 'robotics';
  id: RoboticsId;
  fig: number;
  /** Controller on the mat (null when the bench has its own supply only). */
  board: BoardId | null;
  modules: ModuleId[];
  parts: PartId[];
  figure: FigureRef;
  /** Figure power source key the power button connects (needs/run rules live in the figure file). */
  power: { source: string; label: TextKey; ok: TextKey };
  modes: BenchMode[];
  defaultMode: string;
  steps: BuildStep[];
  faults: FailureMode[];
  status: StatusField[];
  current: CurrentModel;
  tasks: PracticeTask[];
  quizzes: Quiz[];
  sources: Source[];
  title: TextKey;
  sub: TextKey;
  hint: TextKey;
  overview: TextKey;
}

/* ---------- drones ---------- */

export type DroneClass =
  | 'freestyle' | 'whoop' | 'cinewhoop' | 'long-range' | 'racing' | 'gps-camera' | 'delivery' | 'agricultural'
  | 'flying-wing' | 'vtol' | 'nano-swarm' | 'tricopter' | 'heavy-lift';

export type Firmware = 'betaflight' | 'ardupilot-copter' | 'ardupilot-plane' | 'inav' | 'crazyflie';

export type FrameLayout = 'x' | 'stretch-x' | 'h' | 'plus' | 'tri' | 'hex' | 'octo' | 'whoop' | 'wing' | 'quadplane';

/** Motor position in mm from the frame centre (+x nose, +y left), label and spin. */
export type MotorPos = [x: number, y: number, label: string, dir: 'CW' | 'CCW'];

export interface DroneFrame {
  layout: FrameLayout;
  /** Motor-to-motor diagonal (multirotors) or span (wings), mm. */
  sizeMm: number;
  stackMm?: 30.5 | 25.5 | 20 | 16;
  motors: MotorPos[];
  /** Betaflight "props in" or "props out". */
  propDirection?: 'props-in' | 'props-out';
}

export type DesignPick = { batt: string; motor: string; prop: string };

/** The design catalogue. calc input = { model, fixed, battery: batts[pick.batt], motor: motors[..], prop: props[..] }. */
export interface DroneDesign {
  model: CalcModel;
  fixed: (CalcFixedPart & { name: TextKey })[];
  /** Keys as the originals ("6s1100"); `label` is the literal dropdown text ("6S 1100 mAh LiPo"). */
  batts: Record<string, CalcBattery & { label: string }>;
  motors: Record<string, CalcMotor & { label: string }>;
  props: Record<string, CalcProp & { label: string }>;
  default: DesignPick;
  /** Golden rows from drone-lab-a Appendix A / drone-lab-b-calc-matrix (unit tests). */
  golden: { pick: DesignPick; expect: Partial<CalcResult>; verdict: string }[];
}

/** Builds the calculator input for a pick; src/lib/drone implements it as `designInput`. */
export type DesignToCalcInput = (design: DroneDesign, pick: DesignPick) => CalcInput;

/**
 * Host-side text for a craft part. Ids are the figure's part ids (keep FRAME MOTORS ESC WIRES FC XT60 CAM RX VTX TOP
 * BATT PROPS where the craft has them); build order, prerequisites, polarity and drawing live in the figure file
 * (docs/FIGURES-DRONE.md §6).
 */
export interface DronePart {
  id: string;
  short: string;
  name: TextKey;
  what: TextKey;
}

/** One step of the part-by-part build (frame -> motors -> ESC -> wiring -> FC -> VTX -> camera -> RX -> battery -> props). */
export interface DroneBuildStep {
  id: string;
  part: string;
  /** Usually { 'placed.<PART>': 0 } (fitted the right way round). */
  done: StateCond;
  title: TextKey;
  body: TextKey;
  refusal?: TextKey;
}

/**
 * One wiring connection. The figure's wiring sheet draws the same edges (docs/FIGURES-DRONE.md §9, node ids =
 * part ids); the host lists them for keyboard and screen-reader users and the verify agent compares the two.
 */
export interface DroneWire {
  from: string;
  to: string;
  kind: 'power' | 'ground' | 'phase' | 'signal' | 'video' | 'rf';
  /** Literal pad or protocol label: "UART2 · CRSF", "DShot600 M1-M4", "9 V BEC". */
  label: string;
  note: TextKey;
}

export type DroneTestKind =
  | 'smoke-stopper' | 'motor-direction' | 'accel-calibration' | 'compass-calibration' | 'airspeed-calibration'
  | 'cg-check' | 'elevon-check' | 'servo-test' | 'tilt-servo-test' | 'failsafe' | 'gps-lock' | 'arming-checks'
  | 'motor-redundancy' | 'radio-link' | 'transition';

/** A bench test; the figure enforces its prerequisites and reports the result. */
export interface DroneTest {
  id: string;
  kind: DroneTestKind;
  /** Figure button id that runs it (docs/FIGURES-DRONE.md §10.3: smoke, motors, calibrate, or a craft button). */
  button: string;
  /** Figure state that means passed, e.g. { smokeOk: true }. */
  done: StateCond;
  title: TextKey;
  /** What the learner should see when it passes / fails, and why it matters. */
  pass: TextKey;
  fail: TextKey;
}

export interface CliSnippet {
  id: string;
  /** Literal CLI or code, real current syntax for `FirmwareConfig.version`. */
  code: string;
  /** Flight mode it belongs to, or 'build'. */
  mode: string;
  title: TextKey;
  explain: TextKey;
}

/** The CLI emulator: a settings table with validation, and the effects settings have on the sim. */
export interface CliEmulator {
  kind: 'betaflight-cli' | 'inav-cli' | 'mavproxy' | 'cflib-python';
  prompt: string;
  settings: Record<string, string | number>;
  /** Accepted values; anything else is refused with the firmware's real error text. */
  limits: Record<string, { min?: number; max?: number; values?: string[] }>;
  commands: string[];
  /** A setting value that changes the flight or the figure (e.g. motor direction, board alignment). */
  effects: { setting: string; equals: string | number; set: Record<string, string | number | boolean> }[];
}

export interface FirmwareConfig {
  firmware: Firmware;
  /** Version the snippets were checked against: "Betaflight 4.5", "ArduPilot Copter 4.6", "INAV 8". */
  version: string;
  /** Literal tool name shown in headings: "Betaflight CLI", "MAVProxy", "cflib". */
  cliName: string;
  snippets: CliSnippet[];
  emulator: CliEmulator;
  sources: Source[];
}

export type PhysicsClass = 'multirotor' | 'fixed-wing' | 'quadplane' | 'tricopter' | 'swarm';

export interface FlightMode {
  id: string;
  kind:
    | 'angle' | 'horizon' | 'acro' | 'race' | 'range' | 'alt-hold' | 'loiter' | 'pos-hold' | 'rtl' | 'auto' | 'land'
    | 'manual' | 'fbwa' | 'cruise' | 'rth' | 'qhover' | 'qloiter' | 'qrtl' | 'mission' | 'script';
  /** Autopilot missions: phase machine id implemented in src/lib/flight. */
  mission?: string;
  title: TextKey;
  hint: TextKey;
  /** Overrides what `kind` implies (src/lib/flight/registry.ts): an acro gate race is `kind: 'race', attitude: 'acro'`. */
  attitude?: 'angle' | 'acro';
  /** Stick expo 0..1 on roll and pitch (acro defaults to 0.7). */
  expo?: number;
  /** Angle limit in degrees for this mode only (cine soft limits). */
  angleLimit?: number;
  /** Scales the craft's acro and yaw rates in this mode (cine soft rates). */
  rateScale?: number;
}

/** How the flying range draws the craft. Every field is optional: the registry derives the rest from `frame`. */
export interface FlightLook {
  /** Flight stack box, metres: length, width, height. */
  body?: [number, number, number];
  /** Prop radius, metres. */
  propR?: number;
  ducted?: boolean;
  /** Wings: span and chord, metres. */
  span?: number;
  chord?: number;
  /** Drawing scale in the chase view (1 = life size; small crafts draw bigger). */
  isoScale?: number;
}

export interface FlightConfig {
  physics: PhysicsClass;
  /** Per physics class, documented in src/lib/flight (drag, ceiling, hitR, rates, gains, sag ...). */
  params: Record<string, number>;
  look?: FlightLook;
  modes: FlightMode[];
  defaultMode: string;
  fpv: { fovDeg: number; camTiltDeg: number; gimbal: boolean };
  /** OSD elements, e.g. "battery", "rssi", "altitude", "speed", "home-arrow", "flight-mode", "timer". */
  osd: string[];
  failsafes: { id: string; trigger: string; action: string; note: TextKey }[];
  controls: TextKey;
}

/** What a crash into a range solid is called (the flight namespace's `hit.<kind>` line). */
export type RangeHitKind =
  | 'tree' | 'roof' | 'wall' | 'pole' | 'gate' | 'building' | 'pillar' | 'tower' | 'barrel' | 'obstacle';

/** Range primitives in metres, yaw in degrees (drone-lab-a §7.6). `solid: false` is drawn but flown through. */
export type RangePrim =
  | { type: 'box'; x: number; y: number; z?: number; w: number; d: number; h: number; yaw?: number; col: string; solid?: boolean; name?: TextKey; kind?: RangeHitKind }
  | { type: 'house'; x: number; y: number; w: number; d: number; h: number; yaw?: number; col: string; roof?: number; roofCol?: string; kind?: RangeHitKind }
  | { type: 'cyl'; x: number; y: number; z?: number; r: number; h: number; r1?: number; n?: number; col: string; solid?: boolean; name?: TextKey; kind?: RangeHitKind }
  | { type: 'tree'; x: number; y: number; h?: number }
  | { type: 'pole'; x: number; y: number; h: number; r?: number; col?: string; kind?: RangeHitKind }
  | { type: 'flat'; x: number; y: number; w: number; d: number; yaw?: number; col: string; label?: string }
  | { type: 'disc'; x: number; y: number; r: number; col: string; label?: string };

/** A gate (heading set: crossed through a plane) or a checkpoint sphere (no heading). */
export interface Goal {
  x: number;
  y: number;
  z: number;
  r: number;
  heading?: number;
  label: TextKey;
  /** Counts only when the craft touches down inside it, slowly (a landing pad). */
  land?: boolean;
  /** Autopilot missions: seconds to wait there, and what the craft does there. */
  hold?: number;
  action?: 'photo' | 'drop' | 'spray-on' | 'spray-off' | 'land';
  /** Autopilot missions: m/s on the leg to this goal. */
  speed?: number;
}

/** Medal times in seconds (lower is better): gold <= silver <= bronze. */
export interface ParTimes {
  gold: number;
  silver: number;
  bronze: number;
}

export interface Course {
  id: string;
  kind: 'gates' | 'checkpoints' | 'mission';
  field: { w: number; d: number };
  pad: [number, number];
  prims: RangePrim[];
  /** Race gates [x, y, headingDeg], 1.6 x 1.6 m unless gateSize says otherwise. */
  gates: [number, number, number][];
  gateSize?: [number, number];
  goals: Goal[];
  /** Mission flight-mode id that flies it (autopilot crafts). */
  mission?: string;
  /** Target time in seconds for a "par" badge; with no `par`, the medals are derived from it. */
  parS?: number;
  /** Bronze, silver and gold times for this course (src/lib/flight/registry.ts `parOf`). */
  par?: ParTimes;
  /** Height limit of this field in metres (overrides the craft's `ceiling` param). */
  ceiling?: number;
  /** Ground colour of the field, and its wind when the Wind button is on (m/s, from = degrees, 0 = from the east). */
  ground?: string;
  wind?: { speed: number; from: number; gust: number };
  title: TextKey;
  brief: TextKey;
}

export interface DroneContent {
  lab: 'drone';
  id: DroneId;
  fig: number;
  class: DroneClass;
  frame: DroneFrame;
  design: DroneDesign;
  figure: FigureRef;
  parts: DronePart[];
  build: DroneBuildStep[];
  wiring: DroneWire[];
  tests: DroneTest[];
  firmware: FirmwareConfig;
  flight: FlightConfig;
  courses: Course[];
  quizzes: Quiz[];
  sources: Source[];
  title: TextKey;
  sub: TextKey;
  hint: TextKey;
  /** "Meet the {noun}". */
  noun: TextKey;
  overview: TextKey;
  practice: TextKey;
}

/* ---------- index metadata (src/content/ids.ts) ---------- */

export interface ItemMeta {
  fig: number;
  palette: Palette;
  /** Machine tags; their labels live in the lab's UI namespace under "tags.<tag>". */
  tags: string[];
}

export type AnyContent = BoardContent | RoboticsContent | DroneContent;
