import type { BjtParams, MosParams } from '../types.ts';

export interface CitedParams<P> {
  id: string;
  params: P;
  source: { kind: 'datasheet' | 'spice-model' | 'measured' | 'assumed'; title: string; page?: string; revision?: string; url?: string };
  operatingRange: { ic?: [number, number]; vds?: [number, number] };
}

// Only numbers that were read from a source may carry a kind other than 'assumed', and those must name a title and a revision.
// The cards for the other parts the benches use (2N3904, BC547, 2N7000, a logic-level MOSFET) are not here until their model is read.
export const BJT_PARAMS: Record<string, CitedParams<BjtParams>> = {
  '2n2222': {
    id: '2n2222',
    params: { kind: 'gummel-poon', isAmps: 5e-15, bf: 100, br: 5, vafVolts: 100, rbOhms: 10, rcOhms: 0.5 },
    source: { kind: 'assumed', title: 'RS-08 spice.mjs model card Q2N, chosen by its author' },
    operatingRange: {},
  },
};

export const MOS_PARAMS: Record<string, CitedParams<MosParams>> = {};

export function paramsFor(id: string): CitedParams<BjtParams | MosParams> | undefined {
  return BJT_PARAMS[id] ?? MOS_PARAMS[id];
}
