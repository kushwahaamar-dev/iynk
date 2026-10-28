#!/usr/bin/env node
// Copy check (R-013): fails when tracked prose holds a claim the product cannot back.
//
//   node scripts/copy-check.mjs
//
// Scans the tracked files named in `scanned`, checks the README count markers against
// `gen-content-index.mjs --counts`, the env names in docs/SELF_HOSTING.md against src/lib/server/env.ts,
// and that relative links point at tracked files. Exit 0 clean, 1 on any problem.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const BANNED = [
  'validated',
  'verified against hardware',
  'live prices',
  'priced live',
  'Proof of Build',
  'Solana',
  'credential',
  'sponsor',
  'Vercel',
  'aims to do everything',
  'server re-runs',
];
const TEST_COUNT = { label: 'a test count', re: /\b\d[\d,]*\s+(?:(?:unit|automated|e2e)\s+)?tests?\b/i };

const isProse = (file) => /^(README|CONTRIBUTING|SECURITY)\.md$/.test(file) || /^docs\/[^/]+\.md$/.test(file);
const isMessages = (file) => /^src\/i18n\/messages\/[^/]+\/[^/]+\.json$/.test(file);
export const scanned = (file) => isProse(file) || isMessages(file);

// A JSON line is scanned only from its value onward, so a key such as "credential" is not a hit.
const JSON_VALUE = /^\s*(?:"(?:[^"\\]|\\.)*"\s*:\s*)?("(?:[^"\\]|\\.)*")\s*,?\s*$/;

function textOf(file, line) {
  if (!isMessages(file)) return line;
  const m = JSON_VALUE.exec(line);
  return m ? m[1] : '';
}

export function scanText(file, text, exceptions) {
  const excused = new Set(exceptions.filter((e) => e.file === file).map((e) => e.phrase.toLowerCase()));
  const rules = BANNED.map((phrase) => ({ label: phrase, re: new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }));
  if (isProse(file)) rules.push(TEST_COUNT);
  const problems = [];
  text.split('\n').forEach((raw, i) => {
    const line = textOf(file, raw);
    for (const rule of rules) {
      if (rule.re.test(line) && !excused.has(rule.label.toLowerCase())) {
        problems.push({ file, line: i + 1, message: `banned "${rule.label}"` });
      }
    }
  });
  return problems;
}

const MARKER = /<!--count:([a-z]+)-->(\d+)<!--\/count-->/g;

export function checkCounts(readme, counts) {
  const problems = [];
  const seen = new Set();
  readme.split('\n').forEach((line, i) => {
    for (const [, name, shown] of line.matchAll(MARKER)) {
      seen.add(name);
      if (!(name in counts)) problems.push({ file: 'README.md', line: i + 1, message: `unknown count marker "${name}"` });
      else if (Number(shown) !== counts[name]) {
        problems.push({ file: 'README.md', line: i + 1, message: `count "${name}" says ${shown}, the content has ${counts[name]}` });
      }
    }
  });
  for (const name of Object.keys(counts)) {
    if (!seen.has(name)) problems.push({ file: 'README.md', line: 1, message: `no count marker for "${name}"` });
  }
  return problems;
}

const ENV_MARKER = '<!-- env-names';

export function checkEnvNames(doc, schemaNames) {
  const file = 'docs/SELF_HOSTING.md';
  const lines = doc.split('\n');
  const start = lines.findIndex((l) => l.startsWith(ENV_MARKER));
  if (start === -1) return [{ file, line: 1, message: `marker "${ENV_MARKER}" not found` }];
  const problems = [];
  const listed = new Set();
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '' && listed.size === 0) continue;
    if (!line.startsWith('|')) break;
    const name = /^\|\s*`([A-Z][A-Z0-9_]*)`/.exec(line)?.[1];
    if (!name) continue;
    listed.add(name);
    if (!schemaNames.includes(name)) problems.push({ file, line: i + 1, message: `"${name}" is not in src/lib/server/env.ts` });
  }
  for (const name of schemaNames) {
    if (!doc.includes(`\`${name}\``)) problems.push({ file, line: start + 1, message: `"${name}" is in src/lib/server/env.ts but not described` });
  }
  return problems;
}

const LINK = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

export function checkLinks(file, text, exists) {
  const problems = [];
  text.split('\n').forEach((line, i) => {
    for (const [, target] of line.matchAll(LINK)) {
      if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('#') || target.startsWith('//')) continue;
      const path = target.split(/[#?]/)[0];
      const resolved = path.startsWith('/') ? path.slice(1) : posix.normalize(posix.join(posix.dirname(file), path));
      if (!exists(resolved.replace(/\/$/, ''))) problems.push({ file, line: i + 1, message: `broken link "${target}"` });
    }
  });
  return problems;
}

export function schemaNamesOf(envSource) {
  const body = envSource.slice(envSource.indexOf('const schema = {'));
  return [...body.matchAll(/^ {2}([A-Z][A-Z0-9_]*):/gm)].map((m) => m[1]);
}

function trackedFiles() {
  return execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
}

export function runChecks({ tracked, read, counts, exceptions }) {
  const files = new Set(tracked);
  const prefixes = new Set();
  for (const f of tracked) for (let p = posix.dirname(f); p !== '.'; p = posix.dirname(p)) prefixes.add(p);
  const exists = (p) => files.has(p) || prefixes.has(p);

  const problems = [];
  for (const file of tracked.filter(scanned)) {
    const text = read(file);
    problems.push(...scanText(file, text, exceptions));
    if (isProse(file)) problems.push(...checkLinks(file, text, exists));
  }
  if (files.has('README.md')) problems.push(...checkCounts(read('README.md'), counts));
  if (files.has('docs/SELF_HOSTING.md')) {
    problems.push(...checkEnvNames(read('docs/SELF_HOSTING.md'), schemaNamesOf(read('src/lib/server/env.ts'))));
  }
  return problems;
}

function main() {
  const read = (file) => readFileSync(join(root, file), 'utf8');
  const exceptions = JSON.parse(read('scripts/copy-exceptions.json'));
  const counts = JSON.parse(
    execFileSync(process.execPath, ['scripts/gen-content-index.mjs', '--counts'], { cwd: root, encoding: 'utf8' }),
  );
  const problems = runChecks({ tracked: trackedFiles(), read, counts, exceptions });
  for (const p of problems) console.error(`${p.file}:${p.line}: ${p.message}`);
  if (problems.length) {
    console.error(`copy check: ${problems.length} problem(s)`);
    process.exitCode = 1;
  } else {
    console.log('copy check: clean');
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
