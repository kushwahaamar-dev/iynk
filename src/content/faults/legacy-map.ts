import type { Diagnosis } from "../../project/diagnosis";
import type { FailureMode } from "../schema";

const GROUND = /^[ad]?gnd$|^vss$/i;
const SUPPLY = /^(\d+v\d*|v(in|cc|dd|bus|bat)\w*|\+\d)/i;
const LED = /led/i;
const RESISTOR = /^r\d/i;
const CAPACITOR = /^c\d|cap/i;
const SIGNAL_PART = /^(r|d|q|sw|s)\d/i;

function reversedPartCause(f: FailureMode): string {
  const part = f.trigger.by === "reverse-part" ? f.trigger.part : "";
  return LED.test(f.id) || LED.test(part) ? "led-reversed" : "reverse-polarity";
}

function overcurrentCause(f: FailureMode): string {
  return f.trigger.by === "remove-part" && RESISTOR.test(f.trigger.part) ? "led-no-series-resistor" : "pin-overcurrent";
}

function shortCause(f: FailureMode): string {
  if (f.trigger.by !== "short") return "output-contention";
  const [a, b] = f.trigger.nets;
  const grounded = GROUND.test(a) || GROUND.test(b);
  const supplied = SUPPLY.test(a) || SUPPLY.test(b);
  return grounded && supplied ? "supply-shorted-to-ground" : "output-contention";
}

function missingPartCause(f: FailureMode): string {
  if (f.trigger.by !== "remove-part") return "x-missing-part";
  if (CAPACITOR.test(f.trigger.part)) return "x-missing-decoupling";
  return SIGNAL_PART.test(f.trigger.part) ? "open-connection" : "x-missing-part";
}

function causeOf(f: FailureMode): string {
  switch (f.kind) {
    case "reverse-polarity":
      return "reverse-polarity";
    case "reversed-part":
      return reversedPartCause(f);
    case "brownout":
      return "brownout";
    case "overcurrent":
      return overcurrentCause(f);
    case "short":
      return shortCause(f);
    case "floating-input":
      return "floating-input";
    case "missing-part":
      return missingPartCause(f);
    case "wrong-voltage":
      return f.effect.damages?.length ? "x-supply-overvoltage" : "part-not-powered";
    case "cold-solder":
      return "x-intermittent-connection";
    case "boot-strap":
      return "x-boot-strap-level";
    case "level-mismatch":
      return "x-logic-level-mismatch";
    case "config":
      return "x-wrong-config";
    case "thermal":
      return "x-thermal-shutdown";
  }
}

function symptomsOf({ effect }: FailureMode): string[] {
  const found: string[] = [];
  if (effect.power === "resetting") found.push("mcu-resets");
  if (effect.damages?.some((id) => LED.test(id))) found.push("led-burnt");
  if (effect.pins && Object.values(effect.pins).some((level) => level !== "noisy")) found.push("pin-level-wrong");
  if (effect.halts || effect.power === "off") found.push("part-dead");
  return found.length > 0 ? found : ["part-dead"];
}

/** The registry cause and symptom ids a catalogue fault stands for. Ids are plain strings: `content` may not import `sim`. */
export function legacyCause(f: FailureMode): { cause_id: string; symptom_ids: string[] } {
  return { cause_id: causeOf(f), symptom_ids: symptomsOf(f) };
}

export function legacyDiagnosis(f: FailureMode): Diagnosis {
  const { cause_id, symptom_ids } = legacyCause(f);
  return { cause_id, symptom_id: symptom_ids[0], evidence: [], hint_level: 0 };
}

/** The `diagnosis.record` payload for a learner who repairs a catalogue fault on a board or bench. */
export function legacyRecord(owner: string, f: FailureMode) {
  return { projectId: `legacy:${owner}:${f.id}`, diagnosis: legacyDiagnosis(f), outcome: "revealed" };
}
