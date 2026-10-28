import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const START = '<!--provenance:start-->';
const END = '<!--provenance:end-->';
const COLUMNS = ['id', 'set', 'source', 'what was copied', 'how', 'status', 'decided by'];
const CLOSED = new Set(['cleared', 'own']);

function splitCells(line) {
  const cells = [];
  let cell = '';
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '\\' && line[i + 1] === '|') {
      cell += '|';
      i++;
    } else if (line[i] === '|') {
      cells.push(cell.trim());
      cell = '';
    } else {
      cell += line[i];
    }
  }
  cells.push(cell.trim());
  return cells.slice(1, -1);
}

export function parseRows(markdown) {
  const lines = markdown.split('\n');
  const start = lines.findIndex((line) => line.trim() === START);
  const end = lines.findIndex((line) => line.trim() === END);
  if (start === -1 || end < start) throw new Error(`table markers ${START} and ${END} not found`);

  const rows = [];
  let sawHeader = false;
  for (let i = start + 1; i < end; i++) {
    const line = lines[i].trim();
    if (line === '') continue;
    if (!line.startsWith('|') || !line.endsWith('|')) throw new Error(`line ${i + 1}: not a table row`);
    const cells = splitCells(line);
    if (cells.length !== COLUMNS.length) {
      throw new Error(`line ${i + 1}: expected ${COLUMNS.length} cells, found ${cells.length}`);
    }
    if (!sawHeader) {
      if (cells.join('|') !== COLUMNS.join('|')) throw new Error(`line ${i + 1}: header must be ${COLUMNS.join(' | ')}`);
      sawHeader = true;
      continue;
    }
    if (cells.every((cell) => /^:?-+:?$/.test(cell))) continue;
    rows.push(Object.fromEntries(COLUMNS.map((name, c) => [name, cells[c]])));
  }
  if (!sawHeader) throw new Error('table header not found');
  return rows;
}

export function openRows(rows) {
  return rows.filter((row) => !CLOSED.has(row.status));
}

export function run(markdown, { strict = false } = {}) {
  const open = openRows(parseRows(markdown));
  const lines = open.map((row) => `${row.id}  ${row.set}  [${row.status}, decided by ${row['decided by']}]`);
  const summary = open.length === 0 ? 'No open provenance rows.' : `${open.length} open provenance row(s):`;
  return { code: strict && open.length > 0 ? 1 : 0, output: [summary, ...lines].join('\n') };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const fileFlag = args.indexOf('--file');
  const file =
    fileFlag === -1 ? join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'PROVENANCE.md') : args[fileFlag + 1];
  try {
    const { code, output } = run(readFileSync(file, 'utf8'), { strict: args.includes('--strict') });
    console.log(output);
    process.exitCode = code;
  } catch (error) {
    console.error(`provenance-check: ${error.message}`);
    process.exitCode = 2;
  }
}
