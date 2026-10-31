export interface LensFigure {
  page: string;
  circuit?: string;
  variant?: string;
  sheets?: string[];
}

export interface LensInput {
  legacyFigure: LensFigure;
  view: 'board' | 'breadboard' | 'schematic';
  pins: Record<string, number>;
  params: Record<string, Record<string, unknown>>;
  /** A world input's value by the figure part it drives. */
  inputs: Record<string, number>;
  power: string | null;
  fault: Record<string, unknown> | null;
}

/** The figure page of a lesson. A figure builds its board once, from `?variant=`, so only first-party pages qualify. */
export function lensSrc({ page, variant }: LensFigure): string {
  if (!page.startsWith('/figures/') || !page.endsWith('.html')) {
    throw new RangeError(`A figure lens shows pages under /figures/ that end in .html, not "${page}"`);
  }
  return variant ? `${page}?variant=${encodeURIComponent(variant)}` : page;
}

/** The `set` state the run implies: what the figure cannot work out itself. */
export function lensState(i: LensInput): Record<string, unknown> {
  const params: Record<string, Record<string, unknown>> = {};
  for (const [part, values] of Object.entries(i.params)) params[part] = { ...values };
  for (const [part, value] of Object.entries(i.inputs)) (params[part] ??= {}).value = value;
  return {
    view: i.view,
    circuit: i.legacyFigure.circuit ?? null,
    power: i.power,
    params,
    pins: i.pins,
    fault: i.fault,
  };
}

/**
 * The `set` patch that takes the figure from `prev` to `next` (two lensState results): the keys whose values
 * changed. A fault always travels with the power it needs, because the bench engine applies one patch as unplug,
 * change, plug back in.
 */
export function lensPatch(prev: Record<string, unknown>, next: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(next)) if (JSON.stringify(prev[k]) !== JSON.stringify(v)) out[k] = v;
  if ('fault' in out && 'power' in next) out.power = next.power;
  return out;
}
