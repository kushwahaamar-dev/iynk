import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { openRows, parseRows } from './provenance-check.mjs';

const HEADER = '| id | set | source | what was copied | how | status | decided by |\n|---|---|---|---|---|---|---|';

function table(...rows) {
  return `intro\n<!--provenance:start-->\n${HEADER}\n${rows.join('\n')}\n<!--provenance:end-->\noutro\n`;
}

const cleared = '| P-1 | one | site | facts | typed | cleared | Amar |';
const own = '| P-2 | two | none | nothing | written here | own | Amar |';
const open = '| P-3 | three | site | text | copied | rewrite-needed | unset |';
const unset = '| P-4 | four | site | text | copied | unset | unset |';

function cli(markdown, ...flags) {
  const file = join(mkdtempSync(join(tmpdir(), 'prov-')), 'PROVENANCE.md');
  writeFileSync(file, markdown);
  return spawnSync(process.execPath, ['scripts/provenance-check.mjs', '--file', file, ...flags], { encoding: 'utf8' });
}

describe('parseRows', () => {
  it('reads each row into named fields', () => {
    const rows = parseRows(table(cleared, open));
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ id: 'P-1', set: 'one', status: 'cleared', 'decided by': 'Amar' });
  });

  it('keeps an escaped pipe inside a cell', () => {
    const [row] = parseRows(table('| P-1 | a \\| b | site | facts | typed | own | Amar |'));
    expect(row.set).toBe('a | b');
  });

  it('names the line of a malformed row', () => {
    expect(() => parseRows(table(cleared, '| P-2 | short |'))).toThrow(/line 6: expected 7 cells, found 2/);
  });

  it('fails without the markers', () => {
    expect(() => parseRows(HEADER)).toThrow(/markers/);
  });
});

describe('openRows', () => {
  it('returns every row that is not cleared or own', () => {
    const ids = openRows(parseRows(table(cleared, own, open, unset))).map((row) => row.id);
    expect(ids).toEqual(['P-3', 'P-4']);
  });
});

describe('command line', () => {
  it('lists open rows and exits 0 by default', () => {
    const result = cli(table(cleared, open));
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('P-3');
    expect(result.stdout).not.toContain('P-1');
  });

  it('exits 1 with --strict when a row is open', () => {
    const result = cli(table(cleared, open), '--strict');
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('P-3');
  });

  it('exits 0 with --strict when every row is cleared', () => {
    const result = cli(table(cleared, own), '--strict');
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('No open provenance rows');
  });

  it('exits 2 on a malformed table', () => {
    const result = cli(table('| P-1 |'));
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('line');
  });
});
