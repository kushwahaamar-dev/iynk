// @cf title Breadboard
// @cf use engine/bench.list
/* Solderless breadboard. Half size (the default): 30 columns of five-hole strips either side of the centre channel
   (rows a-e and f-j, 2.54 mm pitch, 7.62 mm across the channel) and two power rails along each long edge, 82.5 x
   54.5 x 8.5 mm. Full size has 63 columns; mini has 17 and no rails. Holes are named a1..j30 and T+12, T-12, B+12,
   B-12 (the rail hole nearest that column). Every strip of five is one node; every rail is one node. */
(() => {
const B = SL.bench, T = B.T;
const BODY = { l: '#fbf8ef', m: '#e8e3d4', d: '#c8c1ae' };
B.part('breadboard', {
  name: 'Breadboard', fig: 'P1', legs: [],
  draw(ctx){
    const { pl } = ctx, g = pl.geo, zb = B.G.matH - B.G.top, zt = pl.zTop;
    const a = pl.at(0, 0, zb), b = pl.at(g.w, g.h, zt);
    const lo = [Math.min(a[0], b[0]), Math.min(a[1], b[1]), a[2]], hi = [Math.max(a[0], b[0]), Math.max(a[1], b[1]), b[2]];
    let s = box(lo[0], lo[1], lo[2], hi[0], hi[1], hi[2], BODY, toneI, 1.1);
    // centre channel
    const cy = (g.rowY.e + g.rowY.f) / 2;
    s += fill(pd([pl.at(1, cy - 1, zt + .01), pl.at(g.w - 1, cy - 1, zt + .01), pl.at(g.w - 1, cy + 1, zt + .01), pl.at(1, cy + 1, zt + .01)]), '#d9d3c2');
    // holes: one path for all of them
    let d = '';
    const sq = (x, y) => { const q = .42; d += 'M' + [pl.at(x - q, y - q, zt + .02), pl.at(x + q, y - q, zt + .02), pl.at(x + q, y + q, zt + .02), pl.at(x - q, y + q, zt + .02)].map(p => P(...p).map(f).join(' ')).join('L') + 'Z'; };
    for (let c = 1; c <= g.cols; c++) for (const r of 'abcdefghij') sq(g.colX(c), g.rowY[r]);
    for (const [name, y] of Object.entries(g.rails)) for (const c of g.railCols) sq(g.colX(c), y);
    s += `<path d="${d}" fill="#3b3631"/>`;
    // rail stripes and labels
    for (const [name, y] of Object.entries(g.rails)){
      const yy = y + (name[0] === 'T' ? (name[1] === '+' ? -1.4 : 1.4) : (name[1] === '+' ? -1.4 : 1.4));
      s += `<path d="${pd([pl.at(2, yy, zt + .02), pl.at(g.w - 2, yy, zt + .02)], false)}" fill="none" stroke="${name[1] === '+' ? '#e2483d' : '#3e86d9'}" style="stroke-width:.45"/>`;
      s += B.flatText(pl.at(1.2, y - .6, zt + .03), 1, 0, name[1] === '+' ? '+' : '−', 1.8, name[1] === '+' ? '#c63b30' : '#2f6fc0', 800);
    }
    for (const r of 'abcdefghij') s += B.flatText(pl.at(g.x0 - 2.2, g.rowY[r] - .5, zt + .03), 1, 0, r, 1.3, '#8a8373', 700);
    for (let c = 1; c <= g.cols; c += (c === 1 ? 4 : 5)) s += B.flatText(pl.at(g.colX(c), g.rowY.a + 2.1, zt + .03), 1, 0, String(c), 1.2, '#8a8373', 700);
    ctx.put([lo, hi], act('bb', s, `data-id="BB" data-label="${CF_ESC(T('Breadboard'))}"`));
  },
});
})();
