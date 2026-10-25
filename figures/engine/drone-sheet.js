/* iynk drone engine: the wiring sheet, a flat hand-inked sheet drawn from craft.wiring (docs/FIGURES-DRONE.md §9).
   Canvas 760 x 340 units, blocks 150 x 56. Block ids are part ids, so a click selects the same part as the 3D view. */
(() => {
  const SD = SL.drone;
  const KIND = {
    power: { col: '#e2483d', dash: null, name: 'power' },
    ground: { col: '#231e16', dash: null, name: 'ground' },
    phase: { col: '#f08a2b', dash: null, name: 'motor phases' },
    signal: { col: '#43a35a', dash: [6, 4], name: 'data / signal' },
    video: { col: '#f2c230', dash: null, name: 'video' },
    rf: { col: '#5a82c6', dash: [3, 3], name: 'RF / antenna' },
  };
  SD.WIRE_KINDS = KIND;
  const BW = 150, BH = 56;

  // an elbow from the side centre of block A to that of block B; pa / pb (an edge's own `a` / `b`) replace the ends, so
  // a block with many ports gives each its own point along the side
  function route(A, B, pa, pb){
    const ac = [A.at[0] + BW / 2, A.at[1] + BH / 2], bc = [B.at[0] + BW / 2, B.at[1] + BH / 2];
    const dx = bc[0] - ac[0], dy = bc[1] - ac[1];
    if (Math.abs(dx) >= BW * .9){
      const s = Math.sign(dx), a = pa || [ac[0] + s * BW / 2, ac[1]], b = pb || [bc[0] - s * BW / 2, bc[1]], mx = (a[0] + b[0]) / 2;
      return Math.abs(a[1] - b[1]) < 1 ? [a, b] : [a, [mx, a[1]], [mx, b[1]], b];
    }
    const s = Math.sign(dy) || 1, a = pa || [ac[0], ac[1] + s * BH / 2], b = pb || [bc[0], bc[1] - s * BH / 2], my = (a[1] + b[1]) / 2;
    return Math.abs(a[0] - b[0]) < 1 ? [a, b] : [a, [a[0], my], [b[0], my], b];
  }
  const offsetPath = (pts, o) => pts.map((p, i) => {
    const q = pts[Math.min(i + 1, pts.length - 1)], r = pts[Math.max(i - 1, 0)], dx = q[0] - r[0], dy = q[1] - r[1], L = Math.hypot(dx, dy) || 1;
    return [p[0] - dy / L * o, p[1] + dx / L * o];
  });

  // where the sheet goes: the biggest copy of its canvas (CW x CH sheet units) that fits the frame (vw x vh) without
  // touching any of the figure's own controls drawn over it (boxes [x0, y0, x1, y1] in frame units). Its edges are
  // tried at the frame's edges and at the boxes' edges, and it is centred in the room it gets; of the places within 4 %
  // of the biggest, the one nearest the middle of the frame wins. Returns the canvas box.
  const CW = 784, CH = 392, X0 = -12, Y0 = -26;
  SD.sheetFit = (vw, vh, boxes) => {
    const m = Math.min(vw, vh) * .015, pad = Math.min(vw, vh) * .012;
    const bs = boxes.map(([x0, y0, x1, y1]) => [x0 - pad, y0 - pad, x1 + pad, y1 + pad]).filter(b => b[2] > m && b[3] > m && b[0] < vw - m && b[1] < vh - m);
    const inX = v => v >= m && v <= vw - m, inY = v => v >= m && v <= vh - m;
    const ls = [m, ...bs.map(b => b[2]).filter(inX)], rs = [vw - m, ...bs.map(b => b[0]).filter(inX)];
    const ts = [m, ...bs.map(b => b[3]).filter(inY)], bts = [vh - m, ...bs.map(b => b[1]).filter(inY)];
    const places = floor => {
      const out = [];
      for (const l of ls) for (const r of rs){
        if (r - l <= 0 || (r - l) / CW < floor) continue;
        for (const t of ts) for (const b of bts){
          const s = Math.min((r - l) / CW, (b - t) / CH);
          if (b - t <= 0 || s < floor) continue;
          if (bs.some(q => q[0] < r && l < q[2] && q[1] < b && t < q[3])) continue;
          const w = CW * s, h = CH * s;
          out.push({ s, x: (l + r - w) / 2, y: (t + b - h) / 2, w, h });
          if (floor === 0) floor = s;
        }
      }
      return out;
    };
    const all = places(0), top = all.reduce((a, p) => Math.max(a, p.s), 0);
    if (!top){ const s = Math.min((vw - 2 * m) / CW, (vh - 2 * m) / CH); return { x: (vw - CW * s) / 2, y: (vh - CH * s) / 2, w: CW * s, h: CH * s }; }
    const off = p => Math.hypot(p.x + p.w / 2 - vw / 2, p.y + p.h / 2 - vh / 2);
    const { x, y, w, h } = places(top * .96).reduce((a, p) => off(p) < off(a) ? p : a);
    return { x, y, w, h };
  };
  let fitKey = '', fitBox = null;

  SD.sheet = st => {
    const c = SD.craft(), Wr = c.wiring, svgEl = document.getElementById('fig'), vb = svgEl && svgEl.viewBox && svgEl.viewBox.baseVal;
    const vw = vb && vb.width ? vb.width : 585, vh = vb && vb.height ? vb.height : 440;
    // the figure's own controls over the frame: the buttons the host has not hidden, the switches, the stats panel
    // (parts, checks, battery) and the zoom chip; on a phone they sit above and below the frame, so it gets it all
    // (screen px to frame units through the SVG's own transform: a short frame letterboxes the drawing)
    const ctm = svgEl && svgEl.getScreenCTM ? svgEl.getScreenCTM() : null, px = ctm && ctm.a > 0 ? ctm.a : 0, boxes = [];
    const vx = vb ? vb.x : 0, vy = vb ? vb.y : 0;
    if (px) for (const el of document.querySelectorAll('#btns > *, .vset, #stats, .zchip')){
      const r = el.getBoundingClientRect();
      if (r.width && r.height) boxes.push([(r.left - ctm.e) / px - vx, (r.top - ctm.f) / px - vy, (r.right - ctm.e) / px - vx, (r.bottom - ctm.f) / px - vy].map(v => Math.round(v)));
    }
    const key = [vw, vh, ...boxes.flat()].map(v => Math.round(v)).join(' ');
    // the controls settle after the first draw (the zoom chip comes in after mount, fonts load, a host hides buttons):
    // a new layout draws once more on the next frame, until it holds
    if (key !== fitKey){ fitKey = key; fitBox = SD.sheetFit(vw, vh, boxes); const u = SD.ui(); if (u && px) requestAnimationFrame(() => u.render()); }
    const sc = fitBox.w / CW, ox = vx + fitBox.x - X0 * sc, oy = vy + fitBox.y - Y0 * sc;
    // on a small frame the text grows (up to 1.6 times) so a block title reads at about 10 px; a title or a line that
    // would then overrun its block shrinks back to fit
    const tf = Math.min(1.6, Math.max(1, 10 / (12.5 * sc * (px || 1))));
    const X = x => f(ox + x * sc), Y = y => f(oy + y * sc), sw = w => (w * sc / INK_K).toFixed(2), fs = v => f(v * sc), ft = v => f(v * sc * tf);
    const fit = (text, size, room) => f(Math.min(size * tf, room / Math.max(1, [...String(text)].length * .62)) * sc);
    const d = SD.resolved(st), V = st.calc && st.calc.V ? st.calc.V : d.batt.cells * 3.7, on = SD.powered(st);
    const t = st.test, spinning = t && t.kind === 'motors' ? t.cur : -1;
    let s = `<rect x="${X(X0)}" y="${Y(Y0)}" width="${f(CW * sc)}" height="${f(CH * sc)}" rx="${fs(8)}" fill="#fbf8f0" stroke="${INK}" stroke-width="${sw(1.4)}"/>`;
    s += `<text x="${X(0)}" y="${Y(-8)}" font-size="${ft(11)}" font-family="ui-monospace,Menlo,monospace" font-weight="800" fill="${INK}">${CF_ESC(CF_T('WIRING'))} · ${CF_ESC(CF_T(c.title))}</text>`;
    s += `<text x="${X(748)}" y="${Y(-8)}" font-size="${ft(9.5)}" text-anchor="end" font-family="ui-monospace,Menlo,monospace" fill="#857d6e">${CF_ESC(CF_T('click a block'))}</text>`;
    const used = new Set();
    for (const e of Wr.edges){
      const A = Wr.nodes[e.from], B = Wr.nodes[e.to], k = KIND[e.kind] || KIND.signal;
      used.add(e.kind in KIND ? e.kind : 'signal');
      const base = e.via ? [e.a || route(A, { at: [e.via[0][0] - BW / 2, e.via[0][1] - BH / 2] })[0], ...e.via, e.b || route(B, { at: [e.via[e.via.length - 1][0] - BW / 2, e.via[e.via.length - 1][1] - BH / 2] })[0]] : route(A, B, e.a, e.b);
      const n = e.n || 1, fitted = SD.isOn(st, e.from) && SD.isOn(st, e.to);
      for (let i = 0; i < n; i++){
        const pts = offsetPath(base, (i - (n - 1) / 2) * 3.4), dd = 'M' + pts.map(p => `${X(p[0])} ${Y(p[1])}`).join('L');
        const col = e.kind === 'power' && n === 2 && i === 1 ? INK : k.col;
        s += `<path d="${dd}" fill="none" stroke="${INK}" stroke-width="${sw(3.4)}" stroke-linejoin="round" opacity="${fitted ? 1 : .35}"${k.dash ? ` stroke-dasharray="${f(k.dash[0] * sc)} ${f(k.dash[1] * sc)}"` : ''}/>`;
        s += `<path d="${dd}" fill="none" stroke="${col}" stroke-width="${sw(2)}" stroke-linejoin="round" opacity="${fitted ? 1 : .35}"${k.dash ? ` stroke-dasharray="${f(k.dash[0] * sc)} ${f(k.dash[1] * sc)}"` : ''}/>`;
        const live = fitted && (e.kind === 'phase' ? spinning >= 0 : e.kind !== 'ground' && on);
        if (live && i === 0){
          let total = 0; const segs = [];
          for (let j = 0; j < pts.length - 1; j++){ const L = Math.hypot(pts[j + 1][0] - pts[j][0], pts[j + 1][1] - pts[j][1]); segs.push([pts[j], pts[j + 1], total, L]); total += L; }
          for (let q = (st.t * 40) % 18; q < total; q += 18){
            const sg = segs.find(z => q >= z[2] && q <= z[2] + z[3]); if (!sg) continue;
            const u = (q - sg[2]) / (sg[3] || 1);
            s += `<circle cx="${X(sg[0][0] + (sg[1][0] - sg[0][0]) * u)}" cy="${Y(sg[0][1] + (sg[1][1] - sg[0][1]) * u)}" r="${fs(2.6)}" fill="#fff4d6" stroke="${INK}" stroke-width="${sw(.8)}"/>`;
          }
        }
      }
      if (e.label){
        const txt = e.label === 'V' ? CF_T('{v} V', { v: V.toFixed(1) }) : CF_T(e.label);
        const mid = base.length === 2 ? [(base[0][0] + base[1][0]) / 2, (base[0][1] + base[1][1]) / 2] : [(base[1][0] + base[2][0]) / 2, (base[1][1] + base[2][1]) / 2];
        const lx = mid[0] + (e.labelAt ? e.labelAt[0] : 0), ly = mid[1] + (e.labelAt ? e.labelAt[1] : -6);
        s += `<text x="${X(lx)}" y="${Y(ly)}" font-size="${ft(9.5)}" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" fill="#5c564b" paint-order="stroke" stroke="#fbf8f0" stroke-width="${sw(3)}">${CF_ESC(txt)}</text>`;
      }
    }
    for (const [id, nd] of Object.entries(Wr.nodes)){
      const sel = st.sel === id, fitted = SD.isOn(st, id), [x, y] = nd.at;
      const bar = nd.color ? SD.colOf(nd.color) : KIND.power.col;
      const subText = nd.sub === 'batt' ? d.batt.label : nd.sub === 'motor' ? d.motor.label : nd.sub === 'prop' ? (d.prop.label || st.design.prop) : CF_T(nd.sub || '');
      let b = `<rect x="${X(x)}" y="${Y(y)}" width="${fs(BW)}" height="${fs(BH)}" rx="${fs(10)}" fill="${sel ? 'var(--accent,#f4b829)' : '#fbf8f0'}" stroke="${INK}" stroke-width="${sw(1.6)}"${fitted ? '' : ` stroke-dasharray="${f(5 * sc)} ${f(3 * sc)}"`}/>`;
      b += `<path d="M${X(x + 10)} ${Y(y + .8)}L${X(x + 8)} ${Y(y + .8)}Q${X(x + .8)} ${Y(y + .8)} ${X(x + .8)} ${Y(y + 10)}L${X(x + .8)} ${Y(y + BH - 10)}Q${X(x + .8)} ${Y(y + BH - .8)} ${X(x + 8)} ${Y(y + BH - .8)}L${X(x + 10)} ${Y(y + BH - .8)}Z" fill="${bar}"/>`;
      // with the text grown, "not fitted" takes the second line instead of the corner, where the title would cover it
      const title = CF_T(nd.title), corner = !fitted && tf < 1.05, line2 = fitted || corner ? subText : CF_T('not fitted');
      b += `<text x="${X(x + 18)}" y="${Y(y + 23)}" font-size="${fit(title, 12.5, BW - 26)}" font-weight="800" font-family="ui-monospace,Menlo,monospace" fill="${INK}">${CF_ESC(title)}</text>`;
      b += `<text x="${X(x + 18)}" y="${Y(y + 41)}" font-size="${fit(line2, 10.5, BW - 26)}" font-family="ui-monospace,Menlo,monospace" fill="${line2 === subText ? '#5c564b' : '#857d6e'}">${CF_ESC(line2)}</text>`;
      if (corner) b += `<text x="${X(x + BW - 8)}" y="${Y(y + 13)}" font-size="${fs(8)}" text-anchor="end" font-family="ui-monospace,Menlo,monospace" fill="#857d6e">${CF_ESC(CF_T('not fitted'))}</text>`;
      if (fitted && on && nd.led) b += `<circle cx="${X(x + BW - 12)}" cy="${Y(y + 12)}" r="${fs(4)}" fill="${SD.colOf(nd.led)}" stroke="${INK}" stroke-width="${sw(.8)}"/>`;
      // data-label is the English name the host lists (and translates); aria-label is what a screen reader reads here
      const part = c.byId[id], en = part.name || part.short;
      s += act('part', `<g opacity="${fitted ? 1 : .6}">${b}</g>`, `data-id="${id}" data-label="${CF_ESC(en)}" tabindex="0" role="button" aria-label="${CF_ESC(CF_T(en))}" aria-pressed="${sel}"`);
    }
    const legend = Wr.legend || ['power', 'signal', 'video', 'phase', ...['rf', 'ground'].filter(k => used.has(k))];
    // the legend runs along the bottom, each entry as wide as its name, at a size that keeps the row inside the sheet
    const names = legend.map(k => CF_T((KIND[k] || KIND.signal).name)), chars = names.reduce((n, t) => n + [...t].length, 0);
    const lf = Math.min(10 * tf, (752 - legend.length * 44) / Math.max(1, chars * .62));
    let lx = 4;
    legend.forEach((k, i) => {
      const kk = KIND[k] || KIND.signal, ly = 342;
      s += `<path d="M${X(lx)} ${Y(ly)}L${X(lx + 22)} ${Y(ly)}" stroke="${kk.col}" stroke-width="${sw(4)}"${kk.dash ? ` stroke-dasharray="${f(kk.dash[0] * sc)} ${f(kk.dash[1] * sc)}"` : ''}/>`;
      s += `<text x="${X(lx + 28)}" y="${Y(ly + 3.5)}" font-size="${f(lf * sc)}" font-family="ui-monospace,Menlo,monospace" fill="#5c564b">${CF_ESC(names[i])}</text>`;
      lx += Math.max(150, 44 + [...names[i]].length * .62 * lf);
    });
    return s;
  };
})();
