// @vitest-environment node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ALLOWED_HEADERS } from './interp';

const INCLUDE = /#include\s*[<"]([^>"\\]+)[>"]/g;

function* files(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) yield* files(path);
    else yield path;
  }
}

describe('shipped sketches', () => {
  it('only include headers the interpreter accepts', () => {
    const unknown: string[] = [];
    let seen = 0;
    for (const root of ['src/content', 'figures']) {
      for (const path of files(join(process.cwd(), root))) {
        if (!/\.(ts|tsx|json|ino|cpp)$/.test(path)) continue;
        for (const [, name] of readFileSync(path, 'utf8').matchAll(INCLUDE)) {
          if (name.includes('${')) continue;
          seen++;
          if (!ALLOWED_HEADERS.has(name)) unknown.push(`${path}: ${name}`);
        }
      }
    }
    expect(seen).toBeGreaterThan(0);
    expect(unknown).toEqual([]);
  });
});
