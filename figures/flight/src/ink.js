// Colorfigures look for the range: paper, ink, the five palettes, flat light/mid/dark tones and a
// hand-inked wobble baked into the geometry (a live SVG filter on a moving scene costs 6 fps in WebKit).
const INK = '#231e16';
const SHADOW = '#41538f';
const PALS = {
  mustard: { l: '#f4b829', m: '#d49c1f', d: '#4e4a18' },
  tomato: { l: '#ef6a4c', m: '#cf5038', d: '#4a2219' },
  mint: { l: '#93d3b0', m: '#71b693', d: '#1f4034' },
  cobalt: { l: '#76a0e2', m: '#5a82c6', d: '#1c2948' },
  blush: { l: '#f3a6bb', m: '#d8869c', d: '#4b2430' },
};
const METAL = { l: '#eef0f0', m: '#c6ccce', d: '#8f989b' };
const DARK = { l: '#55504a', m: '#3d3935', d: '#272421' };
const CERAMIC = { l: '#fbfaf3', m: '#e3e0d2', d: '#bdb8a6' };

const hex2rgb = (h) => {
  const v = h.replace('#', '');
  const n = parseInt(v.length === 3 ? v.split('').map((c) => c + c).join('') : v, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgb2hex = (r) => '#' + r.map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, k) => {
  const x = hex2rgb(a), y = hex2rgb(b);
  return rgb2hex(x.map((c, i) => c + (y[i] - c) * k));
};
const toneCache = new Map();
/** Light, mid and dark tones for any body colour (palette keys pass through). */
function tones(col) {
  if (PALS[col]) return PALS[col];
  if (toneCache.has(col)) return toneCache.get(col);
  const t = { l: col, m: mix(col, INK, 0.13), d: mix(col, INK, 0.36) };
  toneCache.set(col, t);
  return t;
}

// deterministic noise so the same edge always wobbles the same way
function hash(x, y) {
  let h = Math.imul((x * 73856093) ^ (y * 19349663), 0x5bd1e995);
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

/**
 * A closed polygon path in 2D with a baked hand-drawn wobble: each edge is cut into
 * short pieces and nudged sideways by `amp` (world units of the drawing).
 */
function wobblePath(pts, amp, close = true) {
  if (pts.length < 2) return '';
  let d = '';
  const n = close ? pts.length : pts.length - 1;
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    if (i === 0) d += 'M' + a[0].toFixed(3) + ' ' + a[1].toFixed(3);
    const k = Math.max(1, Math.min(6, Math.round(len / (amp * 40))));
    const nx = -dy / (len || 1), ny = dx / (len || 1);
    for (let j = 1; j <= k; j++) {
      const t = j / k;
      const w = j === k ? 0 : (hash(Math.round((a[0] + dx * t) * 97), Math.round((a[1] + dy * t) * 89)) - 0.5) * 2 * amp;
      d += 'L' + (a[0] + dx * t + nx * w).toFixed(3) + ' ' + (a[1] + dy * t + ny * w).toFixed(3);
    }
  }
  return close ? d + 'Z' : d;
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** Latin, Greek and Cyrillic labels go in capitals; other scripts stay as written. */
const caps = (s) => (/^[\u0000-ɏͰ-ϿЀ-ӿ\s\d.,:;!?'"()/+-]*$/.test(s) ? s.toUpperCase() : s);

let measureCtx = null;
/** Measured text width (pill sizes must not assume Latin monospace). */
function textWidth(s, px, weight = 700) {
  if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d');
  measureCtx.font = weight + ' ' + px + 'px ui-monospace, SFMono-Regular, Menlo, monospace';
  return measureCtx.measureText(s).width;
}
