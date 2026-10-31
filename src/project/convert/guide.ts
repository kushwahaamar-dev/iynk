import type { Check, Guide, Parameter, PinRef, Simulation, Unit, WorldInput } from "../generated/types.ts";
import { defaultParams, resolveText } from "./text.ts";
import type { Translate } from "./text.ts";
import type {
  ConvertBuildStep,
  ConvertCheck,
  ConvertCodeTemplate,
  ConvertFigureRef,
  ConvertParamChip,
  ConvertQuiz,
  ConvertSerialSpec,
  ConvertWorldModel,
} from "./types.ts";

/** The project unit a catalogue unit becomes. The catalogue also uses ms, cm, mg, N, RPM and steps/s², which the schema has no unit for. */
const UNITS: Readonly<Record<string, Unit>> = {
  V: "V",
  Hz: "Hz",
  s: "s",
  lx: "lux",
  lux: "lux",
  "%": "percent",
  "°C": "degC",
  "°": "deg",
};

export const projectUnit = (unit: string | undefined): Unit | undefined => (unit === undefined ? undefined : UNITS[unit]);

const slug = (s: string): string => s.toLowerCase().replace(/[^a-z0-9_-]+/g, "_");

/** The parameter id of a lesson chip. */
export const parameterId = (chipId: string): string => `par_${slug(chipId)}`;

export function buildAssembly(steps: readonly ConvertBuildStep[], t: Translate): Record<string, unknown>[] {
  return steps.map(({ title, body, refusal, ...rest }) => ({
    ...rest,
    title: t(title),
    body: t(body),
    ...(refusal === undefined ? {} : { refusal: t(refusal) }),
  }));
}

export function buildQuizzes(quizzes: readonly ConvertQuiz[], t: Translate): NonNullable<Guide["quizzes"]> {
  return quizzes.map((quiz) => ({
    id: quiz.id,
    ...(quiz.afterStep === null ? {} : { afterStep: quiz.afterStep }),
    questions: quiz.questions.map((q) => ({
      id: q.id,
      q: t(q.q),
      options: q.options.map(t),
      answer: q.answer,
      why: t(q.why),
    })),
  })) as NonNullable<Guide["quizzes"]>;
}

export interface ChipBinding {
  parameter: string;
  /** The figure part id the chip drives, as the catalogue spells it. */
  part: string;
  key: string;
}

export interface BuiltParameters {
  parameters: Parameter[];
  bindings: ChipBinding[];
  /** Details of a chip that the project schema has no field for, one line each. */
  lost: string[];
}

/** The value a choice option takes in the project: the figure's own value when the chip drives a figure part. */
function optionValue(chip: Extract<ConvertParamChip, { kind: "choice" }>, option: { value: string; figureValue?: string | number }): string | number {
  return chip.figure && option.figureValue !== undefined ? option.figureValue : option.value;
}

export function buildParameters(chips: readonly ConvertParamChip[], t: Translate): BuiltParameters {
  const values = defaultParams(chips);
  const parameters: Parameter[] = [];
  const bindings: ChipBinding[] = [];
  const lost: string[] = [];

  for (const chip of chips) {
    const id = parameterId(chip.id);
    const base = { id, name: chip.id, kind: chip.kind, label: t(chip.label) };
    if (chip.kind === "number") {
      const unit = projectUnit(chip.unit);
      if (chip.unit !== undefined && unit === undefined) lost.push(`${chip.id}: unit ${chip.unit}`);
      parameters.push({
        ...base,
        kind: "number",
        value: values[chip.id] as number,
        min: chip.min,
        max: chip.max,
        step: chip.step,
        ...(unit === undefined ? {} : { unit }),
        ...(chip.keepApart ? { keepApart: { param: parameterId(chip.keepApart.param), op: chip.keepApart.op, gap: chip.keepApart.gap } } : {}),
      });
    } else if (chip.kind === "choice") {
      const current = chip.options.find((o) => o.value === values[chip.id]);
      if (chip.options.some((o) => o.note !== undefined)) lost.push(`${chip.id}: option notes`);
      parameters.push({
        ...base,
        kind: "choice",
        value: current ? optionValue(chip, current) : (values[chip.id] as string),
        options: chip.options.map((o) => ({ value: optionValue(chip, o), label: t(o.label) })),
      });
    } else {
      parameters.push({ ...base, kind: "toggle", value: values[chip.id] as boolean });
    }
    if (chip.figure) bindings.push({ parameter: id, part: chip.figure.part, key: chip.figure.key });
  }
  return { parameters, bindings, lost };
}

/**
 * The starter of a lesson: the template with its comments in English and its `{{p:id}}` slots kept, and for each
 * choice or toggle chip the code text of each value. A number chip has no entry: its slot takes the value written
 * with as many decimals as its step.
 */
export function buildStarter(
  code: ConvertCodeTemplate,
  chips: readonly ConvertParamChip[],
  source: string,
  english: (key: string) => string,
): NonNullable<Guide["starter"]> {
  const splices: Record<string, Record<string, string>> = {};
  for (const chip of chips) {
    if (chip.kind === "choice") {
      splices[chip.id] = Object.fromEntries(chip.options.map((o) => [String(optionValue(chip, o)), o.code]));
    } else if (chip.kind === "toggle") {
      splices[chip.id] = { true: chip.code.on, false: chip.code.off };
    }
  }
  const template = resolveText(code.source, english);
  return Object.keys(splices).length > 0 ? { source, template, splices } : { source, template };
}

export function buildChecks(checks: readonly ConvertCheck[], t: Translate): Check[] {
  return checks.map((check, i) => ({ ...check, id: `c${i + 1}`, label: t(check.label), visibility: "visible" })) as Check[];
}

export interface WorldLinks {
  /** The component instance of a figure part. */
  component(part: string): string;
  /** The board pin a pin name stands for, or null. */
  pin(name: string): PinRef | null;
}

export function buildWorld(
  world: ConvertWorldModel,
  t: Translate,
  links: WorldLinks,
): { world: Simulation["world"]; lost: string[] } {
  const lost: string[] = [];
  const inputs = world.inputs.map((input): WorldInput => {
    const pins = input.pins.map(links.pin).filter((p): p is PinRef => p !== null);
    const unit = projectUnit(input.unit);
    if (input.unit !== undefined && unit === undefined) lost.push(`${input.id}: unit ${input.unit}`);
    return {
      id: input.id,
      quantity: input.quantity as WorldInput["quantity"],
      device: input.device as WorldInput["device"],
      component: links.component(input.part),
      ...(pins.length > 0 ? { pins } : {}),
      min: input.min,
      max: input.max,
      step: input.step,
      default: input.default,
      ...(unit === undefined ? {} : { unit }),
      gesture: input.gesture as WorldInput["gesture"],
      label: t(input.label),
    };
  });
  return { world: { inputs, script: world.script.map((e) => ({ ...e })) }, lost };
}

export function buildSerialSample(spec: ConvertSerialSpec): NonNullable<Guide["serialSample"]> {
  return { baud: spec.baud, lines: [...spec.sample] };
}

export function buildLegacyFigure(
  figure: ConvertFigureRef,
  circuit: string | null,
  variant?: string,
): NonNullable<Guide["legacyFigure"]> {
  return {
    page: figure.page,
    ...(circuit === null ? {} : { circuit }),
    ...(variant === undefined ? {} : { variant }),
    sheets: figure.sheets as NonNullable<Guide["legacyFigure"]>["sheets"],
  };
}
