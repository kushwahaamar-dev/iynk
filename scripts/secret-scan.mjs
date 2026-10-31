// Secret scanner. Looks for the shape of a credential in what git holds, and never prints what it found.
//   node scripts/secret-scan.mjs --history        every added line of every commit on every ref
//   node scripts/secret-scan.mjs --diff <range>   the added lines of a range, for example origin/main..HEAD
//   node scripts/secret-scan.mjs --tree           every tracked file as it is on disk
// Exit 0 when clean, 1 when a hit is not allowed, 2 when this is not a git repo or the arguments are wrong.
//
// Rules: google-api-key, sk-key, github-token, aws-access-key, pem-private-key, slack-token, keypair-array
// (a JSON array of 64 bytes, the shape of a wallet secret key) and postgres-url-password (a URL with a password
// and a host other than localhost). A Vercel token has no fixed shape, so it has no rule.
//
// To allow a hit that is a placeholder, add an entry to scripts/secret-scan.allow.json:
//   { "rule": "<rule name>", "path": "<file>", "commit": "<hash or prefix, optional>", "reason": "<why it is safe>" }
// An entry silences exactly that rule in that file (and that commit when one is given). Say why in the reason.
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath, pathToFileURL } from 'node:url';

const MAX_LINE = 20_000;
const OVERLAP = 200;
const COMMIT_MARK = 'COMMIT ';
const DEFAULT_ALLOW = join(dirname(fileURLToPath(import.meta.url)), 'secret-scan.allow.json');

export const RULES = [
  { name: 'google-api-key', re: /AIza[0-9A-Za-z_-]{35}/ },
  { name: 'sk-key', re: /\bsk-[A-Za-z0-9_-]{20,}/ },
  { name: 'github-token', re: /\bgh[pousr]_[A-Za-z0-9]{36,}/ },
  { name: 'aws-access-key', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'pem-private-key', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: 'slack-token', re: /\bxox[abprs]-[A-Za-z0-9-]{10,}/ },
  { name: 'keypair-array', re: /\[\s*(?:\d{1,3}\s*,\s*){63}\d{1,3}\s*\]/, test: (hit) => hit.match(/\d+/g).every((n) => n <= 255) },
  { name: 'postgres-url-password', re: /postgres(ql)?:\/\/[^:/\s@]+:[^@\s]{4,}@(?!localhost\b|127\.0\.0\.1\b)/ },
];

export function scanText(text, file = '') {
  const hits = [];
  text.split('\n').forEach((line, i) => {
    const found = new Set();
    for (let from = 0; from < line.length || from === 0; from += MAX_LINE - OVERLAP) {
      const window = line.slice(from, from + MAX_LINE);
      for (const { name, re, test } of RULES) {
        const m = re.exec(window);
        if (m && (!test || test(m[0]))) found.add(name);
      }
      if (from + MAX_LINE >= line.length) break;
    }
    for (const rule of found) hits.push({ rule, line: i + 1, file });
  });
  return hits;
}

export function loadAllow(path) {
  const entries = JSON.parse(readFileSync(path, 'utf8'));
  if (!Array.isArray(entries)) throw new Error(`${path}: expected an array`);
  for (const e of entries) {
    if (!e.rule || !e.path || !e.reason) throw new Error(`${path}: every entry needs rule, path and reason`);
  }
  return entries;
}

const isAllowed = (hit, allow) =>
  allow.some((e) => e.rule === hit.rule && e.path === hit.file && (!e.commit || (hit.commit ?? '').startsWith(e.commit)));

async function scanLog(args, cwd, add) {
  const git = spawn('git', ['log', '-p', '-U0', '--no-color', '--no-ext-diff', `--format=${COMMIT_MARK}%H`, ...args], { cwd });
  const stats = { commits: 0, files: 0 };
  let commit = '';
  let file = '';
  let line = 0;
  for await (const text of createInterface({ input: git.stdout, crlfDelay: Infinity })) {
    if (text.startsWith(COMMIT_MARK)) {
      commit = text.slice(COMMIT_MARK.length);
      stats.commits++;
    } else if (text.startsWith('+++ ')) {
      file = text.startsWith('+++ b/') ? text.slice(6) : '';
      stats.files += file ? 1 : 0;
    } else if (text.startsWith('@@')) {
      line = Number(/\+(\d+)/.exec(text)?.[1] ?? 1) - 1;
    } else if (text.startsWith('+') && file) {
      line++;
      for (const h of scanText(text.slice(1), file)) add({ rule: h.rule, file, line, commit });
    }
  }
  const code = await new Promise((resolve) => git.on('close', resolve));
  if (code !== 0) throw new Error('git log failed');
  return stats;
}

function scanTree(cwd, add) {
  const listed = spawnSync('git', ['ls-files', '-z'], { cwd, maxBuffer: 64 * 1024 * 1024 });
  if (listed.status !== 0) throw new Error('git ls-files failed');
  const stats = { commits: 0, files: 0 };
  for (const file of listed.stdout.toString().split('\0').filter(Boolean)) {
    let buf;
    try {
      buf = readFileSync(join(cwd, file));
    } catch (err) {
      process.stderr.write(`skipped ${file}: ${err.code ?? err.message}\n`);
      continue;
    }
    if (buf.subarray(0, 8000).includes(0)) continue;
    stats.files++;
    for (const h of scanText(buf.toString('utf8'), file)) add({ rule: h.rule, file, line: h.line });
  }
  return stats;
}

export async function main(argv, { cwd = process.cwd(), out = (s) => console.log(s), allowPath = DEFAULT_ALLOW } = {}) {
  const mode = argv[0];
  const range = argv[1];
  if (!['--history', '--diff', '--tree'].includes(mode) || (mode === '--diff' && !range)) {
    out('usage: secret-scan.mjs --history | --diff <range> | --tree');
    return 2;
  }
  if (spawnSync('git', ['rev-parse', '--git-dir'], { cwd }).status !== 0) {
    out('not a git repository');
    return 2;
  }
  const allow = loadAllow(allowPath);
  const remaining = [];
  let allowed = 0;
  const add = (hit) => {
    if (isAllowed(hit, allow)) allowed++;
    else remaining.push(hit);
  };
  let stats;
  try {
    stats = mode === '--tree' ? scanTree(cwd, add) : await scanLog(mode === '--history' ? ['--all'] : [range], cwd, add);
  } catch (err) {
    out(err.message);
    return 2;
  }
  for (const h of remaining) out(`${h.rule} ${h.file}:${h.line}${h.commit ? ` ${h.commit.slice(0, 7)}` : ''}`);
  out(`scanned ${stats.commits} commits, ${stats.files} files, ${remaining.length + allowed} hits (${allowed} allowed)`);
  return remaining.length ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main(process.argv.slice(2));
}
