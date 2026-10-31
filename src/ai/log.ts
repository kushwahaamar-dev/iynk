export type Mode = "socratic" | "beginner" | "direct" | "debugging" | "advanced";

export type ProposalEvent = "created" | "invalid" | "opened" | "accepted" | "partial" | "rejected" | "stale" | "superseded";

export type ToolCallRecord = { name: string; ok: boolean; code?: string; ms: number; bytes: number };

export type AiLogRow = {
  id: string;
  at: number;
  /** Local calendar day the call started, `YYYY-MM-DD`. */
  day: string;
  projectId: string | null;
  threadId: string;
  requestId: string;
  round: number;
  task: "chat" | "compact" | "translate" | "conformance" | "eval";
  mode: Mode;
  tier: "fast" | "standard" | "strong";
  provider: string;
  model: string;
  path: "direct" | "relay";
  fallbackFrom?: string;
  promptVersion: string;
  packProfile: "compact" | "standard" | "extended";
  packTokensEst: number;
  packHash8: string;
  inTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  outTokens: number;
  costUSD: number | null;
  priceAsOf: string | null;
  firstTokenMs: number;
  totalMs: number;
  toolCalls: ToolCallRecord[];
  outcome: "ok" | "tool_limit" | "length" | "filtered" | "aborted" | "error" | "capped";
  errorCode?: string;
  proposal?: { id: string; event: ProposalEvent; retries: number; newRuleErrors: number; checkFailed: boolean };
  policy: { forbiddenOps: number; modeBlocked: number; taint: ("P" | "X")[]; injectionFlags: number; secretsRedacted: number; outputFlags: string[] };
};

const MAX_STRING = 200;

const ROW_KEYS: ReadonlySet<string> = new Set([
  "id", "at", "day", "projectId", "threadId", "requestId", "round", "task", "mode", "tier", "provider", "model", "path",
  "fallbackFrom", "promptVersion", "packProfile", "packTokensEst", "packHash8", "inTokens", "cacheReadTokens",
  "cacheWriteTokens", "outTokens", "costUSD", "priceAsOf", "firstTokenMs", "totalMs", "toolCalls", "outcome", "errorCode",
  "proposal", "policy",
]);
const TOOL_CALL_KEYS: ReadonlySet<string> = new Set(["name", "ok", "code", "ms", "bytes"]);
const PROPOSAL_KEYS: ReadonlySet<string> = new Set(["id", "event", "retries", "newRuleErrors", "checkFailed"]);
const POLICY_KEYS: ReadonlySet<string> = new Set(["forbiddenOps", "modeBlocked", "taint", "injectionFlags", "secretsRedacted", "outputFlags"]);

const SECRET_PATTERNS: readonly RegExp[] = [
  /sk-[A-Za-z0-9_-]{20,}/,
  /AIza[0-9A-Za-z_-]{35}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /gh[pousr]_[A-Za-z0-9]{36,}/,
  /xox[abpr]-[A-Za-z0-9-]{10,}/,
  /Bearer [A-Za-z0-9._~+/=-]{20,}/,
  /[0-9a-f]{32,}/,
];

function checkString(value: string, path: string): void {
  if (value.length > MAX_STRING) throw new Error(`ai_log ${path} is longer than ${MAX_STRING} characters`);
  if (SECRET_PATTERNS.some((pattern) => pattern.test(value))) throw new Error(`ai_log ${path} looks like a secret`);
}

/** `keys` is the allowed key set of the object, or of each object in the array, `value` holds. */
function checkValue(value: unknown, path: string, keys: ReadonlySet<string> | null): void {
  if (typeof value === "string") return checkString(value, path);
  if (Array.isArray(value)) {
    value.forEach((item, i) => checkValue(item, `${path}[${i}]`, keys));
    return;
  }
  if (typeof value !== "object" || value === null) return;
  for (const [key, inner] of Object.entries(value)) {
    if (keys && !keys.has(key)) throw new Error(`ai_log ${path}.${key} is not a log field`);
    checkValue(inner, `${path}.${key}`, null);
  }
}

const NESTED_KEYS: Readonly<Record<string, ReadonlySet<string>>> = {
  toolCalls: TOOL_CALL_KEYS,
  proposal: PROPOSAL_KEYS,
  policy: POLICY_KEYS,
};

/** Throws unless the row holds only the logged fields, with no long string and nothing that looks like a key. */
export function assertNoContent(row: AiLogRow): void {
  for (const [key, value] of Object.entries(row)) {
    if (!ROW_KEYS.has(key)) throw new Error(`ai_log ${key} is not a log field`);
    checkValue(value, key, NESTED_KEYS[key] ?? null);
  }
}
