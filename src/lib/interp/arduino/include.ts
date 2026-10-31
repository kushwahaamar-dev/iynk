import { InterpError, notModelled, type Diagnostic, type DiagnosticCode, type ErrorKind } from '../errors';

export interface SourceFile {
  path: string;
  content: string;
}

export interface LineOrigin {
  file: string;
  line: number;
}

export interface ResolvedInclude {
  name: string;
  quoted: boolean;
  from: string;
  line: number;
  resolvedPath: string | null;
  library: string | null;
}

export interface ResolveResult {
  text: string;
  lineMap: LineOrigin[];
  includes: ResolvedInclude[];
  diagnostics: Diagnostic[];
}

export const INCLUDE_LIMITS = { maxDepth: 16, maxFiles: 64 } as const;

const INCLUDE_LINE = /^\s*#\s*include\s*([<"])([^>"]+)[>"]/;

/** Joins `name` onto `dir` and folds `.` and `..`; null when the result leaves the project root. */
function normalise(dir: string, name: string): string | null {
  if (name.startsWith('/')) return null;
  const out: string[] = [];
  for (const part of `${dir}/${name}`.split('/')) {
    if (part === '' || part === '.') continue;
    if (part === '..') {
      if (!out.pop()) return null;
    } else out.push(part);
  }
  return out.length ? out.join('/') : null;
}

const dirOf = (path: string): string => path.slice(0, Math.max(0, path.lastIndexOf('/')));

/** Whether a block comment is still open at the end of `line`, given whether one was open at its start. */
function blockOpenAfter(line: string, open: boolean): boolean {
  let i = 0;
  while (i < line.length) {
    if (open) {
      const end = line.indexOf('*/', i);
      if (end < 0) return true;
      open = false;
      i = end + 2;
    } else if (line.startsWith('//', i)) {
      return false;
    } else if (line.startsWith('/*', i)) {
      open = true;
      i += 2;
    } else if (line[i] === '"' || line[i] === "'") {
      const q = line[i++];
      while (i < line.length && line[i] !== q) i += line[i] === '\\' ? 2 : 1;
      i++;
    } else i++;
  }
  return open;
}

interface Scanned {
  lines: string[];
  includeAt: Map<number, RegExpExecArray>;
  /** Indexes of lines that never reach the output: `#pragma once` and the three lines of an include guard. */
  dropped: Set<number>;
  once: boolean;
}

function scan(content: string): Scanned {
  const lines = content.split(/\r?\n/);
  const includeAt = new Map<number, RegExpExecArray>();
  const code: number[] = [];
  const dropped = new Set<number>();
  let open = false;
  let once = false;
  lines.forEach((line, i) => {
    if (!open) {
      const m = INCLUDE_LINE.exec(line);
      if (m) includeAt.set(i, m);
      if (/^\s*#\s*pragma\s+once\b/.test(line)) {
        once = true;
        dropped.add(i);
      }
      if (line.trim() && !line.trim().startsWith('//')) code.push(i);
    }
    open = blockOpenAfter(line, open);
  });
  const guard = /^\s*#\s*ifndef\s+(\w+)\s*(?:\/\/.*)?$/.exec(lines[code[0]] ?? '');
  const define = guard && new RegExp(`^\\s*#\\s*define\\s+${guard[1]}\\s*(?:\\/\\/.*)?$`).test(lines[code[1]] ?? '');
  if (define && code.length > 2 && /^\s*#\s*endif\b/.test(lines[code[code.length - 1]])) {
    once = true;
    for (const i of [code[0], code[1], code[code.length - 1]]) dropped.add(i);
  }
  return { lines, includeAt, dropped, once };
}

function failure(kind: ErrorKind, message: string, code: DiagnosticCode, file: string, line: number, hint?: string): Diagnostic {
  return new InterpError(kind, message, { line, col: 1 }, hint, { code, file }).toJSON();
}

/**
 * Flattens `entry` and the quoted headers it reaches into one text for the parser. Quoted includes are
 * replaced by the header's lines, angle includes stay as lines. `lineMap[i]` says where output line i
 * came from.
 */
export function resolveIncludes(entry: string, files: readonly SourceFile[], knownHeaders: ReadonlySet<string>): ResolveResult {
  const byPath = new Map(files.map((f) => [f.path, f.content]));
  const byLower = new Map(files.map((f) => [f.path.toLowerCase(), f.path]));
  const scanned = new Map<string, Scanned>();
  const done = new Set<string>();
  const stack: string[] = [];
  const text: string[] = [];
  const lineMap: LineOrigin[] = [];
  const includes: ResolvedInclude[] = [];
  const diagnostics: Diagnostic[] = [];
  let overFileLimit = false;

  const find = (from: string, name: string): { path: string | null; hint?: string } => {
    for (const dir of new Set([dirOf(from), ''])) {
      const path = normalise(dir, name);
      if (path && byPath.has(path)) return { path };
    }
    const path = normalise('', name);
    const near = path && byLower.get(path.toLowerCase());
    return { path: null, hint: near ? `did you mean ${near}` : undefined };
  };

  const visit = (path: string): void => {
    let s = scanned.get(path);
    if (!s) scanned.set(path, (s = scan(byPath.get(path) ?? '')));
    if (s.once) done.add(path);
    stack.push(path);
    for (let i = 0; i < s.lines.length && !overFileLimit; i++) {
      if (s.dropped.has(i)) continue;
      const m = s.includeAt.get(i);
      if (!m) {
        text.push(s.lines[i]);
        lineMap.push({ file: path, line: i + 1 });
        continue;
      }
      const line = i + 1;
      const quoted = m[1] === '"';
      const name = m[2];
      const record = (resolvedPath: string | null) =>
        includes.push({ name, quoted, from: path, line, resolvedPath, library: resolvedPath === null && knownHeaders.has(name) ? name : null });
      const keepLine = (): void => {
        text.push(s.lines[i]);
        lineMap.push({ file: path, line });
      };
      const found: { path: string | null; hint?: string } = quoted ? find(path, name) : { path: null };
      if (found.path === null) {
        record(null);
        if (knownHeaders.has(name)) keepLine();
        else if (quoted) diagnostics.push(failure('compile', `'${name}' was not found in this project`, 'include-not-found', path, line, found.hint));
        else diagnostics.push(notModelled(name, 'library-not-modelled-yet', { line, col: 1 }).toJSON());
        continue;
      }
      record(found.path);
      if (stack.includes(found.path)) {
        diagnostics.push(failure('compile', `${[...stack, found.path].join(' includes ')} goes round in a circle`, 'include-cycle', path, line));
      } else if (stack.length >= INCLUDE_LIMITS.maxDepth + 1) {
        diagnostics.push(failure('unsupported', `headers are nested more than ${INCLUDE_LIMITS.maxDepth} deep`, 'include-depth-limit', path, line));
      } else if (!done.has(found.path)) {
        if (!scanned.has(found.path) && scanned.size >= INCLUDE_LIMITS.maxFiles) {
          diagnostics.push(failure('unsupported', `a project can include at most ${INCLUDE_LIMITS.maxFiles} files`, 'include-file-limit', path, line));
          overFileLimit = true;
        } else visit(found.path);
      }
    }
    stack.pop();
  };

  if (!byPath.has(entry)) {
    return { text: '', lineMap, includes, diagnostics: [failure('compile', `'${entry}' is not one of the project files`, 'include-not-found', entry, 1)] };
  }
  scanned.set(entry, scan(byPath.get(entry)!));
  visit(entry);
  return { text: text.join('\n'), lineMap, includes, diagnostics };
}

/** Points a diagnostic from the flattened text back at the user's file and line. */
export function mapDiagnostic(d: Diagnostic, lineMap: readonly LineOrigin[]): Diagnostic {
  const origin = lineMap[d.line - 1];
  return origin ? { ...d, file: origin.file, line: origin.line } : d;
}
