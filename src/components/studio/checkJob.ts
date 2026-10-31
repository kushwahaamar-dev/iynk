import type { BoardContent, Check, WorldInput as ContentInput } from "@/content/schema";
import { INTERP_LANGUAGE, boardNets, getProfile, pinNet, resolvePin, type BoardId, type CheckJob, type CheckResult } from "@/lib/interp";
import { boardIdForPart } from "@/parts/boards";
import type { Check as ProjectCheck, Project, WorldInput } from "@/project/generated/types";
import { labelText, type BoardPins } from "@/studio/checks";

export type CheckJobError = "no-source" | "no-board" | "unsupported-language";

/** Check kinds that read pins; a Verilog board has no such pins. */
export const PIN_KINDS: readonly ProjectCheck["kind"][] = ["pin-level", "pin-toggles", "pwm", "tone", "servo", "responds"];

export const PLAIN_PIN = /^(?:D|GP|GPIO|P|IO)(\d+)$/;

export function plainPin(pin: string): number | undefined {
  const m = PLAIN_PIN.exec(pin.trim());
  return m ? Number(m[1]) : undefined;
}

/** The pins of one board of the project, as the checks editor needs them. Undefined when the project has no such board. */
export function boardPinsFor(state: Project, boardId: string): BoardPins | undefined {
  const board = state.boards.find((b) => b.id === boardId);
  const id = board && boardIdForPart(board.definition.ref);
  if (!board || !id) return undefined;
  const profile = getProfile(id as BoardId, board.variant);
  const names = [...new Set(profile.digitalPins.map((n) => pinNet(profile, n)))];
  const led = profile.leds[0];
  return {
    id,
    boardRef: state.boards.length > 1 ? board.id : undefined,
    resolve: (pin) => resolvePin(profile, pin) ?? plainPin(pin),
    names,
    defaultPin: pinNet(profile, led?.pin ?? profile.digitalPins[0] ?? 0),
  };
}

/** The catalogue form of a check, which the interpreter's evaluator reads. The two analog kinds have none. */
function contentCheck(c: ProjectCheck): Check | null {
  const label = labelText(c);
  switch (c.kind) {
    case "node-voltage":
    case "supply-current":
      return null;
    case "pin-toggles":
      return { ...c, label, periodMs: [c.periodMs[0], c.periodMs[1]] };
    case "pwm":
      return { ...c, label, duty: [c.duty[0], c.duty[1]] };
    case "tone":
      return { ...c, label, hz: [c.hz[0], c.hz[1]] };
    case "servo":
      return { ...c, label, deg: [c.deg[0], c.deg[1]] };
    case "responds":
      return { ...c, label, v: [c.v[0], c.v[1]] };
    default:
      return { ...c, label };
  }
}

/** Pairs a run's results, which follow the job's checks, back with the ids of the checks they belong to. */
export function verdictsById(checks: readonly ProjectCheck[], results: readonly CheckResult[]): Map<string, CheckResult> {
  const out = new Map<string, CheckResult>();
  let next = 0;
  for (const c of checks) out.set(c.id, c.kind === "node-voltage" || c.kind === "supply-current" ? { ok: false, detail: "needs-analog" } : (results[next++] ?? { ok: false }));
  return out;
}

/** An input whose device is a registry part has no interpreter model, so it is left out of the run. */
function worldInput(input: WorldInput, boardId: string): ContentInput[] {
  const { device } = input;
  if (device.kind === "registry") return [];
  return [
    {
      id: input.id,
      quantity: input.quantity,
      device,
      pins: (input.pins ?? []).filter((p) => p.c === boardId).map((p) => p.p),
      part: input.component,
      min: input.min,
      max: input.max,
      step: input.step,
      default: input.default,
      unit: input.unit,
      gesture: input.gesture,
      label: typeof input.label === "string" ? input.label : input.label.en,
    },
  ];
}

/**
 * Everything one run of a test needs: the board's entry source and variant, the test's script over the
 * project's world inputs, and the checks. `content` is the board's catalogue entry; with it the run names
 * pins as the board's pinout does.
 */
export function checkJobFor(state: Project, testId: string, boardId: string, content?: Pick<BoardContent, "id" | "pinout" | "logicVolts">): CheckJob | { error: CheckJobError } {
  const board = state.boards.find((b) => b.id === boardId);
  const id = board && boardIdForPart(board.definition.ref);
  if (!board || !id) return { error: "no-board" };
  const firmware = board.firmware;
  const source = firmware && state.sources.find((s) => s.id === firmware.entry);
  if (!firmware || !source) return { error: "no-source" };

  const test = state.tests.find((t) => t.id === testId);
  const checks = (test?.checks ?? []).flatMap((c) => contentCheck(c) ?? []);
  const profile = getProfile(id as BoardId, board.variant);
  const language = INTERP_LANGUAGE[firmware.language];
  const pinBased = checks.some((c) => PIN_KINDS.includes(c.kind));
  if (!profile.languages.includes(language) || (language === "verilog" && pinBased)) return { error: "unsupported-language" };

  return {
    board: id,
    variant: board.variant ?? null,
    language: firmware.language,
    source: source.content,
    world: { inputs: state.simulation.world.inputs.flatMap((i) => worldInput(i, board.id)), script: test?.script ?? state.simulation.world.script },
    runMs: test?.runMs ?? state.simulation.duration_ms,
    logicV: content?.logicVolts,
    nets: content && boardNets(content),
    ports: firmware.ports && Object.fromEntries(Object.entries(firmware.ports).flatMap(([name, pins]) => (pins ? [[name, pins]] : []))),
    checks,
  };
}
