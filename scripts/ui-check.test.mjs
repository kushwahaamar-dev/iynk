import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { scanText, validateAllow } from './ui-check.mjs';

const codesOf = (file, text, allow = []) => scanText(file, text, allow).map((h) => h.code);
const tsx = (text) => codesOf('src/components/x/X.tsx', text);
const css = (text, file = 'src/app/globals.css') => codesOf(file, text);
const en = (value) => codesOf('src/i18n/messages/en/a.json', `  "k": "${value}",`);

describe('hits', () => {
  it.each([
    ['R1', 'class="italic"'],
    ['R1', 'font-style: italic;'],
    ['R1', 'Instrument Serif'],
    ['R1', 'const accent = "accent-serif"'],
    ['R2', 'className="text-[15px]"'],
    ['R2', 'font-size: 0.75rem;'],
    ['R2', 'style={{ fontSize: "14px" }}'],
    ['R3', 'className="font-black"'],
    ['R3', 'className="font-light"'],
    ['R4', 'className="gap-1.5"'],
    ['R4', 'className="md:px-5"'],
    ['R4', 'className="-mt-7"'],
    ['R4', 'className="p-[13px]"'],
    ['R4', 'className="py-[clamp(1rem,2vw,3rem)]"'],
    ['R5', 'className="rounded-ink"'],
    ['R5', 'className="rounded-[10px]"'],
    ['R5', '<button className="rounded-full px-3">'],
    ['R6', 'className="shadow-ink-sm"'],
    ['R6', 'className="shadow-[2px_2px_0_#000]"'],
    ['R6', 'box-shadow: var(--card-shadow);'],
    ['R7', 'className="ease-out"'],
    ['R7', 'className="duration-150"'],
    ['R7', 'className="transition-all"'],
    ['R7', 'className="transition-[width,color]"'],
    ['R7', 'transition: opacity 200ms ease;'],
    ['R7', 'animation: spin 1s linear infinite;'],
    ['R8', 'className="z-10"'],
    ['R8', 'className="z-[100]"'],
    ['R8', 'z-index: 5;'],
    ['R9', 'import { Camera } from "lucide-react";'],
    ['R9', '<svg viewBox="0 0 8 8" />'],
    ['R10', 'window.alert(1)'],
    ['R10', 'if (confirm("sure")) go();'],
    ['R11', 'background: linear-gradient(45deg, red, blue);'],
    ['R12', 'className="bg-mustard"'],
    ['R12', 'className="hover:border-tomato"'],
    ['W13', '<span className="font-mono text-xs">label</span>'],
    ['R15', 'className="rounded-lg border-l-4 border-ink"'],
    ['R17', 'window.addEventListener("scroll", onMove)'],
    ['R17', '<div onScroll={handle}>'],
    ['R16', 'const c = "#ff8800";'],
    ['R16', 'const c = "rgb(10 20 30)";'],
  ])('%s hits on %s', (code, text) => {
    const file = text.includes(':') && !text.includes('"') && !text.includes('=') ? 'src/app/globals.css' : 'src/components/x/X.tsx';
    expect(codesOf(file, text)).toContain(code);
  });

  it('reports line numbers and the trimmed line', () => {
    expect(scanText('src/components/x/X.tsx', 'ok\n  <p className="italic">', [])).toEqual([
      { file: 'src/components/x/X.tsx', line: 2, code: 'R1', match: 'italic', text: '<p className="italic">' },
    ]);
  });
});

describe('near misses', () => {
  it.each([
    'className="gap-2 px-4 mt-6 -mt-4"',
    'className="p-0.5 gap-px"',
    'Texas Instruments',
    'className="text-sm font-semibold"',
    'className="rounded-lg"',
    '<button className="rounded-lg">',
    'className="shadow-md"',
    'className="transition-colors transition-opacity transition-transform"',
    'className="transition-[translate,color]"',
    'className="z-sticky"',
    'const attack = "javascript:alert(1)";',
    'import { Camera } from "@phosphor-icons/react";',
    'className="bg-accent text-ink border-rule"',
    '<code className="font-mono">x</code>',
    '<span className="font-mono tabular">1</span>',
    'className="border-l-4 border-ink"',
    'href="#content"',
    'boxShadow: "0 0 rgb(var(--shadow-rgb) / 0.1)"',
    'a lot of ease, and a linear scale',
    'mask-image: linear-gradient(to right, transparent, #000);'.replace('#000', 'black'),
    'className="[mask-image:linear-gradient(to_right,transparent,black)]"',
    'className="not-italic"',
  ])('passes %s', (text) => {
    const hits = tsx(text).filter((c) => c !== 'W13');
    expect(hits).toEqual([]);
  });

  it('keeps R2 and R8 out of the token files', () => {
    expect(css('font-size: 0.75rem;', 'src/styles/base.css')).not.toContain('R2');
    expect(css('z-index: 10;', 'src/styles/tokens.css')).not.toContain('R8');
    expect(css('--ink: #111111;', 'src/styles/tokens.css')).not.toContain('R16');
  });

  it('flags a hex colour in a css file but not in a .ts file', () => {
    expect(css('color: #aabbcc;')).toContain('R16');
    expect(codesOf('src/lib/x.ts', 'const c = "#aabbcc";')).not.toContain('R16');
  });
});

describe('R14 copy', () => {
  it.each(['Ready!', 'Pick one - then go', 'Pick one — then go', 'part-by-part', 'a seamless flow', 'Cutting edge parts'])(
    'hits on %s',
    (value) => expect(en(value)).toContain('R14'),
  );

  it.each(['Plain sentence.', 'ESP32-S3 board', 'Range 3-5 V', '{count, plural, one {# part} other {# parts}}'])(
    'passes %s',
    (value) => expect(en(value)).toEqual([]),
  );

  it('scans the value, not the key', () => {
    expect(codesOf('src/i18n/messages/en/a.json', '  "part-by-part": "Parts",')).toEqual([]);
  });

  it('leaves other languages alone', () => {
    expect(codesOf('src/i18n/messages/de/a.json', '  "k": "Ready!",')).not.toContain('R14');
  });
});

describe('dark surfaces in tokens.css', () => {
  const tokens = (hex) =>
    [':root { --paper: #F5F0E6; }', '@media (prefers-color-scheme: dark) {', '  :root:not([data-theme="light"]) {', `    --paper: ${hex};`, '  }', '}'].join('\n');

  it('rejects a surface outside the dark list', () => {
    expect(codesOf('src/styles/tokens.css', tokens('#1b1813'))).toEqual(['R16']);
  });

  it('accepts the list in any case and ignores the light block', () => {
    expect(codesOf('src/styles/tokens.css', tokens('#1f1f1f'))).toEqual([]);
  });

  it('reads a data-theme dark block and any -bg variable', () => {
    const text = ':root[data-theme="dark"] {\n  --plate-bg: #123456;\n}';
    expect(codesOf('src/styles/tokens.css', text)).toEqual(['R16']);
  });
});

describe('allow list', () => {
  const entry = { file: 'src/components/x/X.tsx', code: 'R16', pattern: '^#ff8800$', reason: 'data colour' };

  it('suppresses a matching hit only', () => {
    const allow = validateAllow([entry]);
    expect(codesOf('src/components/x/X.tsx', 'const c = "#ff8800";', allow)).toEqual([]);
    expect(codesOf('src/components/x/X.tsx', 'const c = "#00ff00";', allow)).toEqual(['R16']);
    expect(codesOf('src/components/x/Y.tsx', 'const c = "#ff8800";', allow)).toEqual(['R16']);
  });

  it('matches a directory prefix', () => {
    const allow = validateAllow([{ ...entry, file: 'src/components/x/' }]);
    expect(codesOf('src/components/x/Y.tsx', 'const c = "#ff8800";', allow)).toEqual([]);
  });

  it.each(['file', 'code', 'pattern', 'reason'])('rejects an entry with no %s', (key) => {
    expect(() => validateAllow([{ ...entry, [key]: '' }])).toThrow(key);
  });

  it('rejects a bad pattern and a non array', () => {
    expect(() => validateAllow([{ ...entry, pattern: '(' }])).toThrow('pattern');
    expect(() => validateAllow({})).toThrow('array');
  });
});

describe('command line', () => {
  const script = resolve('scripts/ui-check.mjs');
  let root;
  const cli = (...args) => spawnSync(process.execPath, [script, '--root', root, ...args], { encoding: 'utf8', cwd: root });

  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), 'ui-check-'));
    mkdirSync(join(root, 'src/components'), { recursive: true });
    mkdirSync(join(root, 'src/content'), { recursive: true });
    writeFileSync(join(root, 'src/components/A.tsx'), 'export const a = <p className="italic">x</p>;\n');
    writeFileSync(join(root, 'src/components/A.test.tsx'), 'italic\n');
    writeFileSync(join(root, 'src/components/B.tsx'), 'export const b = <p className="gap-2">x</p>;\n');
    writeFileSync(join(root, 'src/components/C.tsx'), 'export const c = <p className="font-mono">x</p>;\n');
    writeFileSync(join(root, 'src/content/data.ts'), 'italic\n');
    writeFileSync(join(root, 'allow.json'), '[]');
    writeFileSync(join(root, 'bad.json'), JSON.stringify([{ file: 'a', code: 'R1', pattern: '.', reason: ' ' }]));
  });

  afterAll(() => rmSync(root, { recursive: true, force: true }));

  it('scans the default set, skips tests and content, and exits 1', () => {
    const r = cli('--allow', 'allow.json');
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('src/components/A.tsx:1 R1');
    expect(r.stdout).not.toContain('A.test.tsx');
    expect(r.stdout).not.toContain('data.ts');
    expect(r.stdout).toContain('ui check: 2 hit(s): R1 1, W13 1 (warning)');
  });

  it('exits 0 when only a warning is left', () => {
    const r = cli('--allow', 'allow.json', 'src/components/C.tsx');
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('W13');
  });

  it('exits 0 on a clean path', () => {
    const r = cli('--allow', 'allow.json', 'src/components/B.tsx');
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('ui check: clean');
  });

  it('prints parseable json', () => {
    const r = cli('--json', '--allow', 'allow.json', 'src/components/A.tsx');
    expect(JSON.parse(r.stdout)).toEqual([{ file: 'src/components/A.tsx', line: 1, code: 'R1', text: 'export const a = <p className="italic">x</p>;' }]);
  });

  it('honours the allow list', () => {
    writeFileSync(join(root, 'ok.json'), JSON.stringify([{ file: 'src/components/A.tsx', code: 'R1', pattern: '.', reason: 'test' }]));
    expect(cli('--allow', 'ok.json', 'src/components/A.tsx').status).toBe(0);
  });

  it('exits 2 on an allow entry with no reason, an unknown option or a missing path', () => {
    expect(cli('--allow', 'bad.json').status).toBe(2);
    expect(cli('--nope').status).toBe(2);
    expect(cli('--allow', 'allow.json', 'src/missing.tsx').status).toBe(2);
  });
});

// Baseline on the tree at BU start (node scripts/ui-check.mjs, 2026-10-28): 722 hits, R1 16, R11 1, R12 49,
// R14 76, R15 6, R16 139, R17 3, R2 35, R3 6, R4 173, R5 69, R6 41, R7 23, R8 13, R9 15, W13 57 (warning).
describe('real tree', () => {
  it('runs and prints the summary', () => {
    const r = spawnSync(process.execPath, ['scripts/ui-check.mjs', '--json'], { encoding: 'utf8' });
    expect([0, 1]).toContain(r.status);
    const hits = JSON.parse(r.stdout);
    expect(Array.isArray(hits)).toBe(true);
    for (const h of hits) expect(h).toEqual({ file: expect.any(String), line: expect.any(Number), code: expect.stringMatching(/^[RW]\d+$/), text: expect.any(String) });
  });
});
