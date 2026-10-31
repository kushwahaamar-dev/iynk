// Fails when the editor leaks into the JavaScript a route loads on first visit.
//
//   node scripts/check-studio-chunks.mjs [--dist .next-build]
//
// Make the build first: NEXT_DIST_DIR=.next-build npm run build
// Exit 0: no Studio marker in the first-load chunks. 1: a marker was found. 2: the stats file or a chunk cannot be read, or the arguments are wrong.
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const STATS_FILE = 'diagnostics/route-bundle-stats.json';

const RENDERER = 'data-iynk-renderer';
const SLOT = 'data-studio-slot';
// `cm-editor` alone is no marker: an app-wide shortcut handler names it in a selector.
const CODE_EDITOR = 'cm-scroller';

/** The Studio page may hold the loader, never the editor; the other routes may hold none of it, code editor included. */
export const CHECKED_ROUTES = [
  { route: '/[lang]', markers: [RENDERER, SLOT, CODE_EDITOR] },
  { route: '/[lang]/boards', markers: [RENDERER, SLOT, CODE_EDITOR] },
  { route: '/[lang]/studio', markers: [RENDERER, SLOT] },
];

/** Chunk paths in the stats file start with the dist folder's own name, so they resolve from its parent. */
export function findLeaks(stats, distDir) {
  const root = dirname(resolve(distDir));
  const leaks = [];
  for (const { route, markers } of CHECKED_ROUTES) {
    const entry = stats.find((row) => row.route === route);
    if (!entry) throw new Error(`route ${route} is not in the stats file`);
    for (const path of entry.firstLoadChunkPaths) {
      const text = readFileSync(join(root, path), 'utf8');
      for (const marker of markers) if (text.includes(marker)) leaks.push({ route, chunk: path, marker });
    }
  }
  return leaks;
}

function main(argv) {
  let dist = '.next-build';
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dist') dist = argv[++i];
    else {
      console.error('usage: node scripts/check-studio-chunks.mjs [--dist .next-build]');
      return 2;
    }
  }
  let leaks;
  try {
    leaks = findLeaks(JSON.parse(readFileSync(join(dist, STATS_FILE), 'utf8')), dist);
  } catch (error) {
    console.error(`check-studio-chunks: ${error.message}`);
    return 2;
  }
  for (const { route, chunk, marker } of leaks) console.error(`${route}: ${chunk} holds ${marker}`);
  if (leaks.length) return 1;
  console.log(`check-studio-chunks: no Studio marker in the first-load chunks of ${CHECKED_ROUTES.map((r) => r.route).join(', ')}`);
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) process.exit(main(process.argv.slice(2)));
