import type { Project, WorldInput } from "@/project/generated/types";

export type InputControl =
  /** Held while pressed: buttons, touch pads. */
  | { kind: "hold" }
  | { kind: "switch" }
  /** A value between min and max: pots, light, distance, tilt, line position. */
  | { kind: "slider" }
  /** One button per request a phone on the Wi-Fi can send ("GET /on"); the value is its index. */
  | { kind: "requests"; requests: { value: number; label: string }[] }
  /** Nothing to drive by hand (the sketch makes the request itself). */
  | { kind: "none" };

export interface InputSpec {
  id: string;
  component: string;
  quantity: string;
  control: InputControl;
  min: number;
  max: number;
  step: number;
  value: number;
  unit?: string;
  label: string;
}

const isUrl = (path: string) => /^[a-z]+:\/\//i.test(path);

export function controlFor(input: WorldInput): InputControl {
  const d = input.device;
  if (d.kind === "network") {
    const requests = d.requests
      .map((line, value) => ({ value, label: line.trim() }))
      .filter((r) => r.label && !isUrl(r.label.split(/\s+/)[1] ?? ""));
    return requests.length ? { kind: "requests", requests } : { kind: "none" };
  }
  if (d.kind === "button" || input.quantity === "button" || input.gesture === "press" || input.gesture === "tap") return { kind: "hold" };
  if (d.kind === "switch" || input.quantity === "switch") return { kind: "switch" };
  return { kind: "slider" };
}

/** `v` inside `[min, max]` and on the step grid that starts at `min`. */
export function clampStep({ min, max, step }: Pick<InputSpec, "min" | "max" | "step">, v: number): number {
  const bounded = Math.min(max, Math.max(min, v));
  if (!(step > 0)) return bounded;
  const snapped = min + Math.round((bounded - min) / step) * step;
  const decimals = Math.max(0, ...[min, step].map((n) => (String(n).split(".")[1] ?? "").length));
  return Math.min(max, Number(snapped.toFixed(decimals)));
}

function labelIn(text: WorldInput["label"], locale: string): string {
  return typeof text === "string" ? text : (text[locale] ?? text.en);
}

/** The inputs a person can drive in the run, with the live value of each (its default until one is set). */
export function inputsFor(project: Project, locale: string, current: Record<string, number>): InputSpec[] {
  return project.simulation.world.inputs.map((input) => {
    const spec: InputSpec = {
      id: input.id,
      component: input.component,
      quantity: input.quantity,
      control: controlFor(input),
      min: input.min,
      max: input.max,
      step: input.step,
      value: 0,
      label: labelIn(input.label, locale),
    };
    spec.value = clampStep(spec, current[input.id] ?? input.default);
    if (input.unit !== undefined) spec.unit = input.unit;
    return spec;
  });
}
