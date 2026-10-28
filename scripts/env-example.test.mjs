import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const names = readFileSync(join(process.cwd(), '.env.example'), 'utf8')
  .split('\n')
  .filter((line) => line.trim() !== '' && !line.startsWith('#'));

const banned = [
  ['SOL', 'ANA'],
  ['VUL', 'TR'],
  ['TIME', 'SCALE'],
  ['POST', 'GRES'],
  ['DATA', 'BASE'],
  ['VER', 'CEL'],
  ['PG', 'HOST'],
  ['PG', 'PASSWORD'],
].map((parts) => parts.join(''));

describe('.env.example', () => {
  it('holds only empty NAME= lines', () => {
    expect(names.length).toBeGreaterThan(0);
    for (const line of names) expect(line).toMatch(/^[A-Z][A-Z0-9_]*=$/);
  });

  it('names no removed service', () => {
    for (const line of names) {
      for (const word of banned) expect(line).not.toContain(word);
    }
  });

  it('lists each name once', () => {
    expect(new Set(names).size).toBe(names.length);
  });
});
