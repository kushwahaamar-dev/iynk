// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { listItems, loadItem, loadTexts } from './convert-io.mjs';

describe('listItems', () => {
  it('lists the 38 catalogue items', () => {
    const items = listItems();
    expect(items).toHaveLength(38);
    const count = (lab) => items.filter((i) => i.lab === lab).length;
    expect([count('board'), count('robotics'), count('drone')]).toEqual([12, 13, 13]);
    expect(items[0]).toEqual({ lab: 'board', id: 'uno-r3' });
  });
});

describe('loadItem', () => {
  it('loads an item with its data and flat English texts', () => {
    const item = loadItem('board', 'uno-r3');
    expect(item.lab).toBe('board');
    expect(item.id).toBe('uno-r3');
    expect(item.data.pinout).toHaveLength(44);
    expect(item.data.lessons.map((l) => l.id)).toContain('button');
    expect(item.en.title).toBe('Arduino Uno R3');
    expect(Object.values(item.en).every((v) => typeof v === 'string')).toBe(true);
  });

  it.each([
    ['robotics', 'l298n'],
    ['drone', 'quad5'],
  ])('loads %s/%s', (lab, id) => {
    const item = loadItem(lab, id);
    expect(item.lab).toBe(lab);
    expect(item.data.id).toBe(id);
  });

  it('names the item when it cannot load', () => {
    expect(() => loadItem('board', 'no-such-board')).toThrow('board/no-such-board');
    expect(() => loadItem('lab', 'x')).toThrow('lab/x');
  });
});

describe('loadTexts', () => {
  it('returns the six languages of an item with the same keys', () => {
    const texts = loadTexts('board', 'uno-r3');
    expect(Object.keys(texts)).toEqual(['en', 'de', 'es', 'fr', 'hi', 'zh']);
    expect(texts.en.title).toBe('Arduino Uno R3');
    expect(texts.de.title).toBe('Arduino Uno R3');
    expect(texts.de.tagline).not.toBe(texts.en.tagline);
    for (const language of Object.keys(texts)) expect(texts[language]['lessons.button.title']).toBeTypeOf('string');
  });

  it('matches the English texts of loadItem', () => {
    expect(loadTexts('robotics', 'l298n').en).toEqual(loadItem('robotics', 'l298n').en);
  });

  it('names the item when a language file is missing', () => {
    expect(() => loadTexts('board', 'no-such-board')).toThrow('board/no-such-board');
  });
});
