import { describe, expect, it } from 'vitest';
import { UnionFind } from './graph.ts';

describe('UnionFind', () => {
  it('joins transitively', () => {
    const uf = new UnionFind();
    uf.union('a', 'b');
    uf.union('b', 'c');
    expect(uf.find('a')).toBe(uf.find('c'));
    expect(uf.find('d')).not.toBe(uf.find('a'));
  });

  it('ignores null ends', () => {
    const uf = new UnionFind();
    uf.union(null, 'a');
    uf.union('a', null);
    uf.union(null, null);
    expect(uf.roots()).toEqual([]);
  });

  it('registers a node on its first find and has no roots when empty', () => {
    const uf = new UnionFind();
    expect(uf.roots()).toEqual([]);
    expect(uf.find('x')).toBe('x');
    expect(uf.roots()).toEqual(['x']);
  });

  it('survives duplicate unions', () => {
    const uf = new UnionFind();
    uf.union('a', 'b');
    uf.union('a', 'b');
    uf.union('b', 'a');
    expect(uf.roots()).toHaveLength(1);
  });

  it('groups the same way whatever order the unions come in', () => {
    const pairs: Array<[string, string]> = [['a', 'b'], ['c', 'd'], ['b', 'c'], ['e', 'f']];
    const groups = (order: Array<[string, string]>) => {
      const uf = new UnionFind();
      for (const [x, y] of order) uf.union(x, y);
      const out = new Map<string, string[]>();
      for (const n of 'abcdef') {
        const r = uf.find(n);
        out.set(r, [...(out.get(r) ?? []), n]);
      }
      return [...out.values()].map((g) => g.join('')).sort();
    };
    expect(groups(pairs)).toEqual(['abcd', 'ef']);
    expect(groups([...pairs].reverse())).toEqual(['abcd', 'ef']);
    expect(groups([pairs[2], pairs[3], pairs[1], pairs[0]])).toEqual(['abcd', 'ef']);
  });
});
