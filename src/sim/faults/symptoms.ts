/** The robot symptom ids B16 names. Drone symptoms are `x-` ids until B18 and B19 promote them. */
export const ROBOT_SYMPTOMS = [
  "robot-wont-move",
  "robot-turns-wrong-way",
  "robot-resets-at-start",
  "line-not-detected",
  "wheel-spins-no-motion",
  "encoder-count-wrong",
  "speed-oscillates",
  "robot-tips-over",
  "ranger-always-near",
] as const;

/** The electrical symptom ids of SIMULATION 13.4, then the robot ones. */
export const SYMPTOM_IDS = [
  "led-dark",
  "led-dim",
  "led-burnt",
  "part-dead",
  "part-hot",
  "i2c-no-ack",
  "reading-erratic",
  "button-erratic",
  "supply-collapses",
  "mcu-resets",
  "pin-level-wrong",
  "pin-overloaded",
  "serial-garbled",
  "code-no-effect",
  ...ROBOT_SYMPTOMS,
] as const;

export type CoreSymptomId = (typeof SYMPTOM_IDS)[number];
export type SymptomId = CoreSymptomId | `x-${string}`;

const CORE: ReadonlySet<string> = new Set(SYMPTOM_IDS);
const EXTENSION_SYMPTOM_ID = /^x-[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

/** A core symptom id, or an extension id `x-<kebab>`. */
export function isSymptomId(id: string): id is SymptomId {
  return CORE.has(id) || EXTENSION_SYMPTOM_ID.test(id);
}
