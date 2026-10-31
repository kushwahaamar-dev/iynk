import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { checkCounts, checkLinks, runChecks, scanText } from './copy-check.mjs';

const banned = [
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

describe('scanText', () => {
  it.each(banned)('fails on "%s" and names file and line', (phrase) => {
    const problems = scanText('README.md', `fine\nThis is ${phrase.toUpperCase()} here.\n`, []);
    expect(problems).toEqual([{ file: 'README.md', line: 2, message: `banned "${phrase}"` }]);
  });

  it('passes a hit listed in the exceptions for that file only', () => {
    const exceptions = [{ file: 'docs/A.md', phrase: 'Vercel', reason: 'r', reviewedBy: 'x' }];
    expect(scanText('docs/A.md', 'Vercel build', exceptions)).toEqual([]);
    expect(scanText('docs/B.md', 'Vercel build', exceptions)).toHaveLength(1);
  });

  it('flags a test count in prose but not in a message file', () => {
    expect(scanText('README.md', 'It has 1,200 unit tests.', [])).toHaveLength(1);
    expect(scanText('docs/X.md', 'Run 3 tests', [])).toHaveLength(1);
    expect(scanText('src/i18n/messages/en/common.json', '  "done": "3 tests passed",\n', [])).toEqual([]);
  });

  it('reads JSON values, not keys', () => {
    const file = 'src/i18n/messages/en/search.json';
    expect(scanText(file, '  "credential": "Your key",\n', [])).toEqual([]);
    expect(scanText(file, '{\n  "real": {\n    "lede": "Prices priced live."\n  }\n}\n', [])).toEqual([
      { file, line: 3, message: 'banned "priced live"' },
    ]);
  });
});

describe('checkCounts', () => {
  const counts = { items: 3, boards: 2, drones: 1 };
  const good = '<!--count:items-->3<!--/count--> <!--count:boards-->2<!--/count--> <!--count:drones-->1<!--/count-->';

  it('passes when every marker matches', () => {
    expect(checkCounts(good, counts)).toEqual([]);
  });

  it('fails on a wrong number, a missing marker and an unknown marker', () => {
    expect(checkCounts(good.replace('>2<', '>5<'), counts)[0].message).toContain('says 5');
    expect(checkCounts('<!--count:items-->3<!--/count-->', counts)).toHaveLength(2);
    expect(checkCounts(`${good}\n<!--count:lessons-->4<!--/count-->`, counts)[0]).toMatchObject({ line: 2 });
  });
});

describe('checkLinks', () => {
  const exists = (p) => ['docs/A.md', 'docs', 'README.md'].includes(p);

  it('resolves relative links, ignoring anchors, queries and external targets', () => {
    const text = '[a](A.md#x) [b](../README.md?y=1) [c](https://example.org/z) [d](#top) [e](./)';
    expect(checkLinks('docs/B.md', text, exists)).toEqual([]);
  });

  it('fails on a missing file and on an untracked one', () => {
    expect(checkLinks('docs/B.md', 'see [x](Gone.md)', exists)).toEqual([
      { file: 'docs/B.md', line: 1, message: 'broken link "Gone.md"' },
    ]);
  });
});

describe('runChecks', () => {
  const base = {
    tracked: ['README.md', 'docs/A.md', 'src/i18n/messages/en/common.json'],
    counts: { items: 1 },
    exceptions: [],
  };
  const files = {
    'README.md': '<!--count:items-->1<!--/count--> [a](docs/A.md)',
    'docs/A.md': 'plain',
    'src/i18n/messages/en/common.json': '{\n  "k": "3 tests"\n}\n',
  };
  const read = (f) => files[f];

  it('passes the clean fixture', () => {
    expect(runChecks({ ...base, read })).toEqual([]);
  });

  it('does not scan a file that is not tracked, and flags a link to it', () => {
    const tracked = ['README.md', 'docs/A.md'];
    const dirty = { ...files, 'docs/A.md': 'Solana' };
    expect(runChecks({ ...base, tracked: ['README.md'], read: (f) => dirty[f] })).toHaveLength(1);
    expect(runChecks({ ...base, tracked, read: (f) => dirty[f] })).toHaveLength(1);
  });

  it('does not scan docs below the top level', () => {
    const deep = { ...files, 'docs/MASTER_PLAN/x.md': 'Solana' };
    expect(runChecks({ ...base, tracked: [...base.tracked, 'docs/MASTER_PLAN/x.md'], read: (f) => deep[f] })).toEqual([]);
  });
});

describe('node scripts/copy-check.mjs', () => {
  it('exits 0 on the repo', () => {
    const run = spawnSync(process.execPath, ['scripts/copy-check.mjs'], { encoding: 'utf8' });
    expect(run.stderr).toBe('');
    expect(run.status).toBe(0);
  });
});
