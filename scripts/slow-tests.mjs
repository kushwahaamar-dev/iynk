// Lists the tests that ran longer than the limit in a Vitest JSON report, slowest first.
//
//   node scripts/slow-tests.mjs <report.json> [--limit-ms 20000]
//
// Make the report with: npx vitest run --reporter=json --outputFile=<report.json>
// Exit 0: no test over the limit. 1: at least one. 2: the report cannot be read or the arguments are wrong.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const SLOW_MS = 20_000;

export function slowTests(report, limitMs = SLOW_MS) {
  const slow = [];
  for (const suite of report.testResults ?? []) {
    for (const test of suite.assertionResults ?? []) {
      if (test.status === 'skipped' || typeof test.duration !== 'number') continue;
      if (test.duration > limitMs) slow.push({ file: suite.name, name: test.fullName, ms: test.duration });
    }
  }
  return slow.sort((a, b) => b.ms - a.ms);
}

function main(argv) {
  let path;
  let limitMs = SLOW_MS;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--limit-ms') {
      limitMs = Number(argv[++i]);
    } else {
      path = argv[i];
    }
  }
  if (!path || !Number.isFinite(limitMs)) {
    console.error('usage: node scripts/slow-tests.mjs <report.json> [--limit-ms 20000]');
    return 2;
  }

  let report;
  try {
    report = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    console.error(`cannot read ${path}: ${error.message}`);
    return 2;
  }

  const slow = slowTests(report, limitMs);
  if (slow.length === 0) {
    console.log(`no test over ${limitMs / 1000} s`);
    return 0;
  }
  for (const { file, name, ms } of slow) console.log(`${(ms / 1000).toFixed(1)} s  ${file}  ${name}`);
  return 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main(process.argv.slice(2));
}
