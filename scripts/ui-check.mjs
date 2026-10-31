#!/usr/bin/env node
// UI guard: turns the sweep rules (R1 to R17) into checks on src/.
//
//   node scripts/ui-check.mjs [--json] [--allow <file>] [--root <dir>] [paths...]
//
// With no paths it scans src/components, src/app, src/styles and src/lib (ts, tsx, css) and the English
// message files. Prints `file:line CODE text` for every hit, then a count per code. Exit 0 clean, 1 on a
// hit, 2 on bad usage or a malformed allow list. W13 is a warning: it is printed and counted but does
// not fail the run until T-BU-58 makes it an error.

import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

export const WARNING_CODES = new Set(['W13']);

const DEFAULT_DIRS = ['src/components', 'src/app', 'src/styles', 'src/lib'];
const MESSAGES_DIR = 'src/i18n/messages/en';

const SPACING_STEPS = '1\\.5|2\\.5|3\\.5|5|7|9|11|14|18|22|28';
const SPACING_UTIL = '(?:p[xytblrse]?|m[xytblrse]?|gap(?:-[xy])?|space-[xy])';
const PALETTE = 'mustard|tomato|mint|cobalt|blush';
const FILLER = ['revolutionize', 'supercharge', 'cutting edge', 'effortless', 'transform your workflow', 'next level', 'harness', 'world class', 'seamless'];
const DARK_SURFACES = new Set(['#000000', '#181818', '#1f1f1f', '#272727', '#313131', '#131209']);
const DARK_SURFACE_VARS = new Set(['paper', 'alt', 'surface', 'raised', 'hover', 'sunken', 'console-bg', 'console-well', 'code-bg']);

const TIMING_CONTEXT = /transition|animation|timing|duration/;
const NOT_CODE_LINE = /<code|<pre|<kbd|<td|<th|console/i;

const kind = (file) => (file.endsWith('.css') ? 'css' : file.endsWith('.tsx') ? 'tsx' : 'ts');

function rulesFor(file) {
  const inStyles = file.startsWith('src/styles/');
  const isTokens = file === 'src/styles/tokens.css';
  const type = kind(file);
  const rules = [
    { code: 'R1', re: /(?<![\w-])italic(?![\w-])|fontStyle|font-accent|accent-serif|Instrument_Serif|Instrument Serif/ },
    { code: 'R3', re: /(?<![\w-])font-(?:black|extrabold|thin|light)(?![\w-])/ },
    { code: 'R4', re: new RegExp(`(?<![\\w-])-?${SPACING_UTIL}-(?:${SPACING_STEPS}|\\[[^\\]]*\\])(?![\\w.])`) },
    { code: 'R4', re: new RegExp(`(?<![\\w-])-?${SPACING_UTIL}-\\[[^\\]]*clamp\\(`) },
    { code: 'R5', re: /rounded-ink|rounded-\[/ },
    { code: 'R5', re: /rounded-full/, when: (line, file) => /<button|Button/.test(line) || /Button\.tsx$/.test(file) },
    { code: 'R6', re: /shadow-ink|shadow-\[|--card-shadow/ },
    { code: 'R7', re: /(?<![\w-])ease-(?:in|out|linear)(?![\w])|duration-(?:75|100|150)(?!\d)|transition-all|transition-\[[^\]]*(?:width|height|top|left|inset)[^\]]*\]/ },
    { code: 'R7', re: /(?<![\w-])(?:ease|linear)(?![\w(-])/, when: (line) => TIMING_CONTEXT.test(line) },
    { code: 'R9', re: /from\s+['"](?:lucide|feather|react-icons|@mui)|<svg/ },
    { code: 'R10', re: /\bwindow\.(?:alert|confirm|prompt)\b|(?<![\w'"`:.])(?:alert|confirm)\(/ },
    { code: 'R11', re: /gradient\(/, when: (line) => !/mask[\w-]*["']?\s*[:=][^;]*gradient\(/.test(line) },
    { code: 'R12', re: new RegExp(`(?<![\\w-])(?:bg|text|border(?:-[trblxyse])?|ring|fill|stroke)-(?:${PALETTE})(?![\\w])`) },
    { code: 'W13', re: /(?<![\w-])font-(?:ui|mono)(?![\w-])/, when: (line) => !/tabular/.test(line) && !NOT_CODE_LINE.test(line) },
    { code: 'R15', re: /(?<![\w-])border-[selr]-\d/, when: (line) => /rounded|bg-/.test(line) },
    { code: 'R17', re: /addEventListener\(\s*['"]scroll['"]|\bonScroll\b/ },
  ];
  if (!inStyles) {
    rules.push({ code: 'R2', re: /text-\[\d|font-size:\s*[\d.]+(?:px|rem)|fontSize\s*[:=]\s*\{?\s*['"`]?[\d.]+(?:px|rem)/ });
  }
  if (!isTokens) {
    rules.push({ code: 'R8', re: /(?<![\w-])-?z-(?:\d|\[)|z-index:\s*-?\d|zIndex:\s*-?\d/ });
  }
  if (type === 'tsx' || (type === 'css' && !isTokens)) {
    rules.push({ code: 'R16', re: /(?<![\w&/#-])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])|rgba?\((?!\s*var\()/ });
  }
  return rules;
}

function darkBlockLines(text) {
  const dark = new Set();
  const stack = [];
  text.split('\n').forEach((line, i) => {
    const isDark = /prefers-color-scheme:\s*dark/.test(line) || /(?<!:not\()\[data-theme=["']dark["']\]/.test(line);
    for (const ch of line) {
      if (ch === '{') stack.push(isDark);
      else if (ch === '}') stack.pop();
    }
    if (stack.some(Boolean) || (isDark && line.includes('{'))) dark.add(i);
  });
  return dark;
}

function scanTokens(text) {
  const hits = [];
  const dark = darkBlockLines(text);
  text.split('\n').forEach((line, i) => {
    if (!dark.has(i)) return;
    const m = /^\s*--([\w-]+)\s*:\s*(#[0-9a-fA-F]{6})\b/.exec(line);
    if (!m) return;
    const [, name, hex] = m;
    const isSurface = DARK_SURFACE_VARS.has(name) || name.endsWith('-bg');
    if (isSurface && !DARK_SURFACES.has(hex.toLowerCase())) hits.push({ line: i + 1, code: 'R16', match: `--${name}: ${hex}` });
  });
  return hits;
}

function scanMessages(text) {
  const hits = [];
  const value = /^\s*(?:"(?:[^"\\]|\\.)*"\s*:\s*)?"((?:[^"\\]|\\.)*)"\s*,?\s*$/;
  text.split('\n').forEach((raw, i) => {
    const m = value.exec(raw);
    if (!m) return;
    const s = m[1];
    const found = [
      /!/.exec(s),
      / - /.exec(s),
      /\u2014/.exec(s),
      new RegExp(`\\b(?:${FILLER.join('|')})\\b`, 'i').exec(s),
      ...s.matchAll(/(?<![\p{L}\p{N}-])\p{L}+(?:-\p{L}+)+(?![\p{L}\p{N}])/gu),
    ];
    for (const f of found) if (f) hits.push({ line: i + 1, code: 'R14', match: f[0] });
  });
  return hits;
}

export function validateAllow(raw) {
  if (!Array.isArray(raw)) throw new Error('allow list must be an array');
  return raw.map((entry, i) => {
    for (const key of ['file', 'code', 'pattern', 'reason']) {
      if (typeof entry?.[key] !== 'string' || !entry[key].trim()) throw new Error(`allow entry ${i} needs a non empty "${key}"`);
    }
    try {
      return { ...entry, re: new RegExp(entry.pattern, 'i') };
    } catch {
      throw new Error(`allow entry ${i} has an invalid pattern`);
    }
  });
}

const allowed = (hit, allow) =>
  allow.some(
    (a) => a.code === hit.code && (a.file === hit.file || (a.file.endsWith('/') && hit.file.startsWith(a.file))) && a.re.test(hit.match),
  );

export function scanText(file, text, allow = []) {
  const hits = [];
  if (file.startsWith(`${MESSAGES_DIR}/`) && file.endsWith('.json')) {
    hits.push(...scanMessages(text));
  } else {
    const rules = rulesFor(file);
    text.split('\n').forEach((line, i) => {
      for (const { code, re, when } of rules) {
        if (when && !when(line, file)) continue;
        if (hits.some((h) => h.line === i + 1 && h.code === code)) continue;
        const m = re.exec(line);
        if (m) hits.push({ line: i + 1, code, match: m[0], text: line });
      }
    });
    if (file === 'src/styles/tokens.css') hits.push(...scanTokens(text));
  }
  const lines = text.split('\n');
  return hits
    .map((h) => ({ file, line: h.line, code: h.code, match: h.match, text: (h.text ?? lines[h.line - 1]).trim() }))
    .filter((h) => !allowed(h, allow));
}

const SKIPPED = (file) =>
  /\.test\.[cm]?[jt]sx?$/.test(file) || file.startsWith('src/content/') || file.startsWith('src/i18n/figure') || /\.generated\./.test(file);
const SCANNABLE = /\.(?:ts|tsx|css)$/;

function walk(root, rel, out) {
  for (const name of readdirSync(join(root, rel)).sort()) {
    const next = `${rel}/${name}`;
    if (statSync(join(root, next)).isDirectory()) walk(root, next, out);
    else if (!SKIPPED(next) && (SCANNABLE.test(next) || (rel.startsWith(MESSAGES_DIR) && next.endsWith('.json')))) out.push(next);
  }
}

function collect(root, paths) {
  const files = [];
  if (paths.length === 0) {
    for (const dir of [...DEFAULT_DIRS, MESSAGES_DIR]) if (existsSync(join(root, dir))) walk(root, dir, files);
    return files;
  }
  for (const p of paths) {
    const rel = relative(root, resolve(p)).split(sep).join('/');
    if (!existsSync(join(root, rel))) throw new Error(`no such path: ${p}`);
    if (statSync(join(root, rel)).isDirectory()) walk(root, rel, files);
    else files.push(rel);
  }
  return [...new Set(files)];
}

export function run(argv, cwd = process.cwd()) {
  const flags = { json: false, allow: null, root: null };
  const paths = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') flags.json = true;
    else if (a === '--allow' || a === '--root') {
      if (!argv[i + 1]) return { code: 2, err: `${a} needs a value` };
      flags[a.slice(2)] = resolve(cwd, argv[++i]);
    } else if (a.startsWith('--')) return { code: 2, err: `unknown option ${a}` };
    else paths.push(resolve(cwd, a));
  }
  let root;
  let allow;
  let files;
  try {
    root = realpathSync(flags.root ?? join(here, '..'));
    allow = validateAllow(JSON.parse(readFileSync(flags.allow ?? join(here, 'ui-check.allow.json'), 'utf8')));
    files = collect(root, paths);
  } catch (e) {
    return { code: 2, err: `ui-check: ${e.message}` };
  }

  const hits = files
    .flatMap((file) => scanText(file, readFileSync(join(root, file), 'utf8'), allow))
    .sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : a.line - b.line));
  const failing = hits.filter((h) => !WARNING_CODES.has(h.code));
  const code = failing.length ? 1 : 0;

  if (flags.json) {
    return { code, out: JSON.stringify(hits.map(({ file, line, code: c, text }) => ({ file, line, code: c, text })), null, 2) };
  }
  const counts = {};
  for (const h of hits) counts[h.code] = (counts[h.code] ?? 0) + 1;
  const lines = hits.map((h) => `${h.file}:${h.line} ${h.code} ${h.text.length > 120 ? `${h.text.slice(0, 117)}...` : h.text}`);
  const summary = Object.keys(counts)
    .sort()
    .map((c) => `${c} ${counts[c]}${WARNING_CODES.has(c) ? ' (warning)' : ''}`);
  lines.push(hits.length ? `ui check: ${hits.length} hit(s): ${summary.join(', ')}` : 'ui check: clean');
  return { code, out: lines.join('\n') };
}

function main() {
  const result = run(process.argv.slice(2));
  if (result.err) console.error(result.err);
  if (result.out) console.log(result.out);
  process.exitCode = result.code;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
