import { describe, expect, it } from 'vitest';
import { sumScripts } from './perf-prefetch.mjs';

const script = (encodedDataLength, extra = {}) => ({ url: '/_next/a.js', type: 'Script', encodedDataLength, ...extra });

describe('sumScripts', () => {
  it('counts the transferred scripts and skips images, failed requests and cache hits', () => {
    const events = [
      script(1200),
      script(800),
      { url: '/logo.png', type: 'Image', encodedDataLength: 5000 },
      script(900, { failed: true }),
      script(700, { fromCache: true }),
    ];
    expect(sumScripts(events)).toEqual({ bytes: 2000, count: 2 });
  });

  it('is zero for no events', () => {
    expect(sumScripts([])).toEqual({ bytes: 0, count: 0 });
  });
});
