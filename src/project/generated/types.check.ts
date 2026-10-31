import type { Op, Project } from './types.ts';

export const okOp: Op = { k: 'net.connect', net: 'net_a', pin: { c: 'cmp_a', p: 'D12' } };

// @ts-expect-error an op with an unknown kind is not an Op
export const unknownKind: Op = { k: 'net.explode' };

// @ts-expect-error net.connect needs a pin
export const missingPin: Op = { k: 'net.connect', net: 'net_a' };

// @ts-expect-error a project needs its schemaVersion
export const noVersion: Project = {};
