// Flight range types. Units: metres, seconds, degrees for angles in data,
// grams and mAh where the drone calculator uses them. World axes: x east,
// y north, z up. Yaw is measured from +x, counter-clockwise.

export type CraftClass = "multirotor" | "tricopter" | "wing" | "vtol" | "swarm";
export type Chemistry = "lipo" | "lihv" | "liion";

/** What the drone calculator hands the range for the current design. */
export interface CalcOutputs {
  auw: number; // g, all-up weight
  thrustPerMotor: number; // g per motor at full throttle on a nominal (3.7 V/cell) pack
  motors: number; // lifting motors (a wing: 1)
  cells: number;
  mah: number;
  hoverThrottle: number; // 0..1, sqrt(auw / (motors * thrustPerMotor))
  hoverAmps: number; // A at hover
  maxAmps: number; // A at full throttle
  chemistry?: Chemistry;
  overKv?: boolean; // KV x cells above the motor's rating: the ESC heats and desyncs
}

/** Bench state that changes how the craft flies. */
export interface CraftFaults {
  fcReversed?: boolean;
  propsSwapped?: boolean;
  motorDirUnchecked?: boolean;
  accUncalibrated?: boolean;
  servosReversed?: boolean; // wing / VTOL elevons, tricopter tail servo
  tailHeavy?: boolean; // wing CG behind the mark
  propBackwards?: boolean; // wing pusher
}

export interface WingParams {
  vstall: number; // m/s, the nose drops below this
  vmin: number; // m/s, full lift from here up
  cd: number; // N per (m/s)^2 of airspeed
  launchSpeed: number; // m/s after a hand launch
  bankLimit: number; // deg in angle mode
  pitchLimit: number; // deg in angle mode
  rollRate: number; // deg/s per unit stick in manual
  pitchRate: number; // deg/s per unit stick in manual
}

export interface VtolParams extends WingParams {
  transitionS: number; // s to tilt the motors from up to forward
  hoverMotors: number; // motors that lift in hover (the tilt pair + tail)
}

export interface TailServoParams {
  maxDeg: number; // servo travel each way
  rateDegS: number; // servo slew rate
}

export interface SwarmParams {
  count: number; // craft in the swarm, the leader included
  spacing: number; // m between neighbours in the formation
}

export interface CraftLook {
  arms: number; // motors drawn (a wing: 0)
  armLen: number; // m, centre to motor
  propR: number; // m
  body: [number, number, number]; // m, length, width, height of the stack
  palette: "tomato" | "mustard" | "mint" | "cobalt" | "blush";
  ducted?: boolean;
  span?: number; // m, wings
  chord?: number; // m, wings
  isoScale?: number; // drawing scale in the chase view (1 = life size)
  frame?: "x" | "plus" | "y" | "h";
}

/** Per-craft flight parameters (one record per drone id). */
export interface FlightCraft {
  id: string;
  class: CraftClass;
  drag: number; // 1/m, the original's 0.045 for a 5-inch
  ceiling: number; // m, top of the soft height limit
  hitRadius: number; // m, matches the real size of the craft
  angleLimit: number; // deg, Betaflight angle_limit
  acroRate: number; // deg/s at full stick
  yawRate: number; // deg/s at full stick
  levelRate: number; // 1/s, how fast angle mode reaches the stick target
  climbRate: number; // m/s at full stick in altitude-hold modes
  spool: number; // 1/s motor spool-up
  camTilt: number; // deg, FPV camera uptilt
  fov: number; // deg, horizontal FPV field of view
  fpvLevel?: boolean; // gimbal: the FPV view keeps the horizon level
  fpvProps?: boolean; // props visible at the top of the FPV image
  wing?: WingParams;
  vtol?: VtolParams;
  tailServo?: TailServoParams;
  swarm?: SwarmParams;
  loiterSpeed?: number; // m/s, GPS modes at full stick
  rtlAlt?: number; // m
  loiterRadius?: number; // m, the circle a wing flies round home
  payloadG?: number; // g a mission's drop releases (a delivery parcel): the craft flies lighter after it
  look: CraftLook;
  modes: FlightMode[];
}

export type AttitudeMode = "angle" | "acro";
export type ThrottleMode = "manual" | "climb";
export type ModeTask =
  | "free"
  | "race"
  | "range"
  | "rtl"
  | "mission"
  | "figure8"
  | "swarm"
  | "motorfail"
  | "transition"
  | "qrtl"
  | "rth"
  | "yawdemo"
  | "demo"; // the autopilot flies the course's own route (src/lib/flight/route.ts); its times never count

export interface FlightMode {
  id: string; // key under flight.modes in the i18n namespace
  attitude: AttitudeMode;
  throttle: ThrottleMode;
  position?: boolean; // GPS / flow position hold: the sticks ask for a velocity
  task: ModeTask;
  angleLimit?: number; // overrides the craft for this mode (cine soft limits)
  rateScale?: number; // scales acroRate and yawRate (cine soft rates)
  expo?: number; // 0..1 stick expo
  missionId?: string; // course mission flown by mission / swarm tasks
}

export type HitKind =
  | "tree"
  | "roof"
  | "wall"
  | "pole"
  | "gate"
  | "building"
  | "pillar"
  | "tower"
  | "barrel"
  | "obstacle";

interface PrimBase {
  x: number;
  y: number;
  col?: string;
  kind?: HitKind; // what the crash message says
  solid?: boolean; // false: drawn, but the craft flies through it
}

export type Prim =
  | (PrimBase & { type: "box"; z?: number; w: number; d: number; h: number; yaw?: number })
  | (PrimBase & { type: "house"; w: number; d: number; h: number; yaw?: number; roof?: number; roofCol?: string })
  | (PrimBase & { type: "cyl"; z?: number; r: number; h: number; r1?: number; n?: number; rot?: number })
  | (PrimBase & { type: "tree"; h?: number })
  | (PrimBase & { type: "pole"; h: number; r?: number })
  | (PrimBase & { type: "flat"; w: number; d: number; yaw?: number; label?: string; ink?: boolean })
  | (PrimBase & { type: "disc"; r: number; label?: string });

/** A race gate: a frame you fly through along `heading`. Built as solid posts and a top bar. */
export interface Gate {
  x: number;
  y: number;
  heading: number; // deg, the direction you must fly through it
  w: number; // m, inside width
  h: number; // m, inside height
  z?: number; // m, bottom of the opening (0 = on the ground)
  col?: string;
}

/** A range checkpoint: a ring (with heading) you fly through, or a sphere you touch. */
export interface Checkpoint {
  label: string; // English label, translated through courseText.labels
  x: number;
  y: number;
  z: number;
  r: number;
  heading?: number; // deg; present = ring
  land?: boolean; // must be touched on the ground (z below 0.3 m, slow)
  action?: Waypoint["action"]; // what happens there: a `drop` releases the craft's payload
}

export interface Waypoint {
  x: number;
  y: number;
  z: number;
  label: string;
  hold?: number; // s to wait there
  action?: "photo" | "drop" | "spray-on" | "spray-off" | "land";
  speed?: number; // m/s on the leg to this point
  r?: number; // m, how close counts as reached (default 1)
  leg?: number; // demo routes: the course target (gate or checkpoint index) this point leads to
}

export interface Mission {
  id: string;
  waypoints: Waypoint[];
  rtl?: boolean; // return and land at the end
  loopFrom?: number; // set: after the last waypoint it carries on from this one (a gate race)
}

export interface WindSpec {
  speed: number; // m/s mean wind
  from: number; // deg, where it blows from (0 = from the east)
  gust: number; // m/s gust amplitude
}

/**
 * What the course scores. Gates count laps and checkpoints count a timed run in every flight mode; a mission is a
 * checkpoint run that ends in `missionDone`. Without a kind, gates count only in race modes and checkpoints only in
 * range modes (one field holding both).
 */
export type CourseKind = "gates" | "checkpoints" | "mission";

export interface Course {
  id: string;
  kind?: CourseKind;
  title: string; // English, translated through courseText.title
  brief: string;
  field: number; // m, side of the square field
  pad: [number, number];
  ground: string;
  ceiling?: number; // m, overrides the craft
  camTilt?: number;
  wind: WindSpec;
  prims: Prim[];
  gates: Gate[];
  checkpoints: Checkpoint[];
  missions?: Mission[];
}

/** Translations of the course's own words, passed in by the host page. */
export interface CourseText {
  title?: string;
  labels?: Record<string, string>;
  /** The craft's own flight-mode titles, by mode id (else the flight namespace's generic ones). */
  modes?: Record<string, string>;
  /** One line under the mode picker for each of the craft's modes, by mode id. */
  hints?: Record<string, string>;
}

/** RC channels: throttle 0..1 (stick position), the rest -1..1. */
export interface Sticks {
  throttle: number;
  yaw: number;
  pitch: number;
  roll: number;
}

export type FlightAction =
  | { type: "arm" }
  | { type: "disarm" }
  | { type: "toggleArm" }
  | { type: "reset" }
  | { type: "mode"; mode: string }
  | { type: "wind"; on: boolean }
  | { type: "sticks"; sticks: Sticks }
  | { type: "design"; calc: CalcOutputs; faults?: CraftFaults };

export type BlockReason = "crashed" | "air" | "throttle" | "battery" | "acc";

export type FlightEvent = { t: number } & (
  | { type: "armed"; mode: string }
  | { type: "disarmed" }
  | { type: "blocked"; why: BlockReason }
  | { type: "takeoff" }
  | { type: "landed"; mah: number; belly?: boolean }
  | { type: "crash"; why: HitKind | "ground" | "groundWing" | "flipFc" | "flipProps" | "flipMotor" | "flipServo" }
  | { type: "gate"; index: number; total: number; split: number | null }
  | { type: "lap"; time: number; best: boolean; splits: number[]; demo?: boolean }
  | { type: "checkpoint"; index: number; total: number; label: string }
  | { type: "run"; time: number; best: boolean; demo?: boolean }
  | { type: "battery"; level: "low" | "empty"; chemistry: Chemistry; perCell: number }
  | { type: "missionStep"; index: number; total: number; label: string; action?: Waypoint["action"] }
  | { type: "missionDone"; time?: number; best?: boolean; demo?: boolean }
  | { type: "drop"; g: number }
  | { type: "outOfField" }
  | { type: "farOut" }
  | { type: "ceiling"; m: number }
  | { type: "desync"; motor: number }
  | { type: "motorOut"; motor: number }
  | { type: "stall" }
  | { type: "launch" }
  | { type: "transition"; to: "cruise" | "hover" }
  | { type: "mode"; mode: string }
);

/** What the range page draws each frame. Small and flat: it is posted to the iframe. */
export interface FlightFrame {
  t: number;
  x: number;
  y: number;
  z: number;
  yaw: number; // deg
  pitch: number; // deg, nose down positive
  roll: number; // deg, left bank positive
  speed: number; // m/s ground speed
  vz: number;
  thr: number; // 0..1 motor output
  spin: number; // prop phase, radians
  armed: boolean;
  crashed: boolean;
  launched: boolean; // wings: out of the hand
  volt: number;
  amps: number;
  mah: number;
  cells: number;
  low: boolean;
  timer: number; // s since arming
  mode: string;
  wind: [number, number]; // m/s
  windOn: boolean;
  next: { x: number; y: number; z: number; kind: "gate" | "checkpoint" | "home" | "waypoint"; n: number; total: number; label: string } | null;
  gate: number; // index of the next race gate
  checkpoint: number; // index of the next checkpoint
  servo: number; // deg, tricopter tail / VTOL tilt (0 = up, 90 = forward)
  motorsOut: number[];
  followers: Array<[number, number, number, number]>; // swarm: x, y, z, yaw
  spray: boolean;
  cargo: boolean; // the payload hangs under the craft (until the drop)
  parcel: [number, number] | null; // where the dropped payload lies
}
