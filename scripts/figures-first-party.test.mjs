import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const figuresDir = join(root, 'public/figures');
const KINDS = ['boards', 'drones', 'modules', 'parts', 'robotics'];

// Figure pages run inline scripts under their own CSP, so every file here must be build output.
const REMOTE_LOADS = [
  ['remote script', /<script[^>]+src=["']https?:/i],
  ['remote stylesheet or link', /<link[^>]+href=["']https?:/i],
  ['remote @import', /@import\s+url\(\s*["']?https?:/i],
  ['network call', /\bfetch\(|XMLHttpRequest|WebSocket\(|importScripts\(/],
];

// The colorfigures footer is an <a> the reader clicks; nothing loads from it.
const ALLOWED_URLS = new Set([
  'http://www.w3.org/1999/xlink',
  'http://www.w3.org/2000/svg',
  'https://april-zhu.com/colorfigures',
]);

function listFigures() {
  try {
    const out = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', 'public/figures'], { cwd: root, encoding: 'utf8' });
    return out.split('\n').filter(Boolean);
  } catch {
    const walk = (dir) =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(join(dir, e.name)) : [relative(root, join(dir, e.name)).split(sep).join('/')],
      );
    return walk(figuresDir);
  }
}

function sourceFor(file) {
  const [kind, name] = file.replace(/^public\/figures\//, '').split('/');
  const id = name?.replace(/\.html$/, '');
  if (kind === 'flight') return id === 'range' ? 'figures/flight/build.mjs' : null;
  return KINDS.includes(kind) ? `figures/${kind}/${id}.js` : null;
}

function problems(file, html) {
  const found = [];
  if (!file.endsWith('.html')) found.push('rule 1: not an .html file');
  const source = sourceFor(file);
  const label = file.replace(/^public\/figures\//, '').replace(/\.html$/, '');
  if (!source || !existsSync(join(root, source))) found.push(`rule 3: no figure source for ${label}`);
  for (const [name, re] of REMOTE_LOADS) if (re.test(html)) found.push(`rule 4: ${name}`);
  for (const url of html.match(/https?:\/\/[^\s"'()<>\\]*/g) ?? []) {
    if (!ALLOWED_URLS.has(url)) found.push(`rule 5: URL not allowed: ${url}`);
  }
  return found;
}

describe('predicate', () => {
  it('accepts a clean page', () => {
    expect(problems('public/figures/flight/range.html', '<svg xmlns="http://www.w3.org/2000/svg"></svg>')).toEqual([]);
  });

  it('rejects a remote script', () => {
    const found = problems('public/figures/flight/range.html', '<script src="https://evil.example/a.js"></script>');
    expect(found).toContain('rule 4: remote script');
  });

  it('rejects fetch(', () => {
    expect(problems('public/figures/flight/range.html', '<script>fetch("/x")</script>')).toContain('rule 4: network call');
  });

  it('rejects a file with no source or the wrong extension', () => {
    expect(problems('public/figures/boards/evil.html', '')).toContain('rule 3: no figure source for boards/evil');
    expect(problems('public/figures/boards/uno-r3.js', '')).toContain('rule 1: not an .html file');
  });
});

describe('public/figures', () => {
  const files = listFigures();

  it('is not empty', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it('holds only first-party figure output', () => {
    const failures = files.flatMap((file) =>
      problems(file, readFileSync(join(root, file), 'utf8')).map((p) => `${file}: ${p}`),
    );
    expect(failures).toEqual([]);
  });
});
