import type { Project } from '../generated/types.ts';

export interface SubstanceDeps {
  sha256(s: string): string;
  canonical(v: unknown): string;
  codeOnly(s: string): string;
}

const DROPPED_TOP = ['id', 'revision', 'history', 'exports', 'provenance', 'access', 'actors', 'license', 'ext', 'assets'];
const DROPPED_META = ['createdAt', 'updatedAt', 'title', 'description', 'tags', 'thumbnail'];

/**
 * The code without comments: C/C++ `//` and block comments, Python `#` comments (not #include/#define).
 * A portable copy of `codeOnly` in `src/lib/interp/checks.ts`, which cannot be imported here.
 */
export function stripComments(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')
    .replace(/(^|\s)#(?!\s*(?:include|define|if|endif|else|pragma)\b)[^\n]*/g, '$1 ');
}

/** Comments removed, every run of whitespace outside a string literal collapsed to one space, ends trimmed. */
export function tokenStream(text: string, deps: Pick<SubstanceDeps, 'codeOnly'>): string {
  const code = deps.codeOnly(text);
  let out = '';
  let i = 0;
  while (i < code.length) {
    const ch = code[i];
    if (ch === '"' || ch === "'") {
      let end = i + 1;
      while (end < code.length && code[end] !== ch && code[end] !== '\n') end += code[end] === '\\' ? 2 : 1;
      end = Math.min(end + 1, code.length);
      out += code.slice(i, end);
      i = end;
    } else if (/\s/.test(ch)) {
      while (i < code.length && /\s/.test(code[i])) i++;
      out += ' ';
    } else {
      out += ch;
      i++;
    }
  }
  return out.trim();
}

function without(record: object, keys: readonly string[]): Record<string, unknown> {
  return Object.fromEntries(Object.entries(record).filter(([key]) => !keys.includes(key)));
}

/**
 * SHA-256 of the canonical project without identity, history, text and the plan, with source code reduced to its
 * tokens. Equal for a fork that has not been edited, and unchanged by a comment or whitespace edit.
 */
export function substanceHash(project: Project, deps: SubstanceDeps): string {
  const doc = without(project, DROPPED_TOP);
  doc.meta = without(project.meta, DROPPED_META);
  doc.sources = project.sources.map((source) => ({ ...source, content: tokenStream(source.content, deps) }));
  return deps.sha256(deps.canonical(doc));
}
