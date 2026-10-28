/** Where a diagnostic points in the user's source. Lines and columns are 1-based. */
export interface SourcePos {
  line: number;
  col: number;
}

export type ErrorKind = 'syntax' | 'compile' | 'runtime' | 'unsupported' | 'limit';

/** A stable identifier for an error the Studio words itself, with the values its text needs. */
export interface ErrorInfo {
  code: string;
  args?: Record<string, string | number>;
}

/**
 * A friendly, positioned error. `message` is written for a learner
 * ("'ledPin' was not declared"), `hint` says what to try next.
 */
export class InterpError extends Error {
  readonly kind: ErrorKind;
  readonly line: number;
  readonly col: number;
  readonly hint?: string;
  readonly code?: string;
  readonly args?: Record<string, string | number>;

  constructor(kind: ErrorKind, message: string, pos?: SourcePos | null, hint?: string, info?: ErrorInfo) {
    super(message);
    this.name = 'InterpError';
    this.kind = kind;
    this.line = pos?.line ?? 0;
    this.col = pos?.col ?? 0;
    this.hint = hint;
    this.code = info?.code;
    this.args = info?.args;
  }

  /** "3:14 error: 'x' was not declared" style text for the serial monitor or a log. */
  format(): string {
    const where = this.line ? `${this.line}:${this.col} ` : '';
    const label = { runtime: 'runtime error', syntax: 'syntax error', limit: 'stopped', compile: 'error', unsupported: 'error' }[this.kind];
    return `${where}${label}: ${this.message}${this.hint ? `\n  hint: ${this.hint}` : ''}`;
  }

  toJSON(): Diagnostic {
    return { kind: this.kind, message: this.message, line: this.line, col: this.col, hint: this.hint, code: this.code, args: this.args };
  }
}

/** Plain-data form of an error, safe to post to a worker or store. */
export interface Diagnostic {
  kind: ErrorKind;
  message: string;
  line: number;
  col: number;
  hint?: string;
  code?: string;
  args?: Record<string, string | number>;
}

export function syntaxError(message: string, pos: SourcePos, hint?: string): InterpError {
  return new InterpError('syntax', message, pos, hint);
}

export function unsupported(feature: string, pos: SourcePos | null, hint?: string): InterpError {
  return new InterpError('unsupported', `${feature} is not supported by the iynk simulator`, pos, hint);
}

/** Levenshtein distance, used for "did you mean" hints. */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1].toLowerCase() === b[j - 1].toLowerCase() ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return prev[n];
}

/** The closest name in `candidates`, if one is close enough to be a likely typo. */
export function didYouMean(name: string, candidates: Iterable<string>): string | undefined {
  let best: string | undefined;
  let bestScore = Infinity;
  for (const c of candidates) {
    const d = editDistance(name, c);
    if (d < bestScore) {
      bestScore = d;
      best = c;
    }
  }
  const limit = name.length <= 3 ? 1 : name.length <= 6 ? 2 : 3;
  return best !== undefined && bestScore <= limit ? best : undefined;
}
