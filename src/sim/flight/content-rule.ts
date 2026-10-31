export const BANNED_TAGS: readonly string[] = [
  'weapon',
  'munition',
  'warhead',
  'explosive',
  'payload-release-aimed',
  'target-tracker',
];

export const BANNED_MODES: readonly string[] = [
  'follow-me',
  'follow-target',
  'pursuit',
  'track-target',
  'target-lock',
  'loiter-on-target',
];

export const LIMITS = { fieldM: 2000, missionRangeM: 2000, swarmMax: 8, terrainFollowMinM: 5 } as const;

const RESTRICTED_OPERATION = 'add_restricted';

export interface RuleViolation {
  rule:
    | 'part-flag'
    | 'part-tag'
    | 'mode-banned'
    | 'field-too-large'
    | 'range-too-long'
    | 'swarm-too-large'
    | 'tool-restricted';
  where: string;
  detail: string;
}

const words = (s: string): string[] => s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

/** True when the words of `phrase` appear next to each other, in order, among the words of `text`. */
function containsPhrase(text: string, phrase: string): boolean {
  const t = words(text);
  const p = words(phrase);
  for (let i = 0; i + p.length <= t.length; i++) {
    if (p.every((w, j) => t[i + j] === w)) return true;
  }
  return false;
}

const bannedIn = (text: string): string | undefined =>
  [...BANNED_TAGS, ...BANNED_MODES].find((b) => containsPhrase(text, b));

export function checkDescriptor(d: {
  identity: { tags?: readonly string[]; category: string };
  x_restricted?: unknown;
}): RuleViolation[] {
  const out: RuleViolation[] = [];
  if (d.x_restricted === true) {
    out.push({ rule: 'part-flag', where: d.identity.category, detail: 'x_restricted is true' });
  }
  for (const tag of [...(d.identity.tags ?? []), d.identity.category]) {
    if (BANNED_TAGS.includes(tag)) {
      out.push({ rule: 'part-tag', where: d.identity.category, detail: `banned tag "${tag}"` });
    }
  }
  return out;
}

export function checkMode(id: string, task: string): RuleViolation[] {
  return [id, task]
    .filter((v) => BANNED_MODES.includes(v))
    .map((v) => ({ rule: 'mode-banned' as const, where: id, detail: `banned mode "${v}"` }));
}

export function checkCourse(c: {
  fieldM: readonly [number, number];
  missionRangeM?: number;
  swarmCount?: number;
}): RuleViolation[] {
  const out: RuleViolation[] = [];
  const side = Math.max(c.fieldM[0], c.fieldM[1]);
  if (side > LIMITS.fieldM) {
    out.push({ rule: 'field-too-large', where: 'fieldM', detail: `${side} m is over ${LIMITS.fieldM} m` });
  }
  if (c.missionRangeM !== undefined && c.missionRangeM > LIMITS.missionRangeM) {
    out.push({
      rule: 'range-too-long',
      where: 'missionRangeM',
      detail: `${c.missionRangeM} m is over ${LIMITS.missionRangeM} m`,
    });
  }
  if (c.swarmCount !== undefined && c.swarmCount > LIMITS.swarmMax) {
    out.push({
      rule: 'swarm-too-large',
      where: 'swarmCount',
      detail: `${c.swarmCount} is over ${LIMITS.swarmMax}`,
    });
  }
  return out;
}

function enumValues(node: unknown): string[] {
  if (Array.isArray(node)) return node.flatMap(enumValues);
  if (typeof node !== 'object' || node === null) return [];
  return Object.entries(node).flatMap(([key, value]) =>
    key === 'enum' && Array.isArray(value)
      ? value.filter((v): v is string => typeof v === 'string')
      : enumValues(value),
  );
}

export function checkTools(
  tools: ReadonlyArray<{ name: string; description?: string; parameters?: unknown }>,
): RuleViolation[] {
  const out: RuleViolation[] = [];
  for (const tool of tools) {
    const texts = [tool.name, tool.description ?? '', ...enumValues(tool.parameters)];
    for (const text of texts) {
      const hit = bannedIn(text) ?? (containsPhrase(text, RESTRICTED_OPERATION) ? RESTRICTED_OPERATION : undefined);
      if (hit) out.push({ rule: 'tool-restricted', where: tool.name, detail: `mentions "${hit}"` });
    }
  }
  return out;
}
