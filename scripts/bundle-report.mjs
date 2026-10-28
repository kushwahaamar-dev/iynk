// Prints the JavaScript each route loads on first visit, from the stats file `next build` writes.
//
//   node scripts/bundle-report.mjs [--dist .next-build] [--json]
//
// Make the build first: NEXT_DIST_DIR=.next-build npm run build
// Exit 0: report printed. 2: the stats file or a chunk cannot be read, or the arguments are wrong.
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';

const STATS_FILE = 'diagnostics/route-bundle-stats.json';

/** Chunk paths in the stats file start with the dist folder's own name, so they resolve from its parent. */
export function routeFirstLoad(stats, distDir, gzip) {
  const root = dirname(resolve(distDir));
  return stats.map(({ route, firstLoadChunkPaths }) => {
    let rawBytes = 0;
    let gzipBytes = 0;
    for (const path of firstLoadChunkPaths) {
      const file = readFileSync(join(root, path));
      rawBytes += file.length;
      gzipBytes += gzip(file);
    }
    return { route, chunks: firstLoadChunkPaths.length, rawBytes, gzipBytes };
  });
}

const gzipSize = (buffer) => gzipSync(buffer).length;

function main(argv) {
  let dist = '.next-build';
  let json = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dist') dist = argv[++i];
    else if (argv[i] === '--json') json = true;
    else {
      console.error('usage: node scripts/bundle-report.mjs [--dist .next-build] [--json]');
      return 2;
    }
  }
  let rows;
  try {
    const stats = JSON.parse(readFileSync(join(dist, STATS_FILE), 'utf8'));
    rows = routeFirstLoad(stats, dist, gzipSize).sort((a, b) => b.gzipBytes - a.gzipBytes);
  } catch (error) {
    console.error(`bundle-report: ${error.message}`);
    return 2;
  }
  if (json) {
    console.log(JSON.stringify(rows, null, 2));
    return 0;
  }
  const width = Math.max(...rows.map((r) => r.route.length));
  console.log(`${'route'.padEnd(width)}  chunks  raw bytes  gzip bytes`);
  for (const r of rows) {
    console.log(`${r.route.padEnd(width)}  ${String(r.chunks).padStart(6)}  ${String(r.rawBytes).padStart(9)}  ${String(r.gzipBytes).padStart(10)}`);
  }
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) process.exit(main(process.argv.slice(2)));
