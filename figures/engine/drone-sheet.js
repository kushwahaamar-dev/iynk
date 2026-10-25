/* SimLab drone engine: the wiring sheet, a flat hand-inked sheet drawn from craft.wiring (docs/FIGURES-DRONE.md §9).
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

  SD.sheet = st => {
    const c = SD.craft(), Wr = c.wiring, svgEl = document.getElementById('fig'), vb = svgEl && svgEl.viewBox && svgEl.viewBox.baseVal;
    const vw = vb && vb.width ? vb.width : 585, vh = vb && vb.height ? vb.height : 440;
    // leave the figure's own button column free when it is shown (standalone or embedded without bare=1)
    const btns = document.getElementById('btns'), html = document.documentElement;
    const left = btns && !html.classList.contains('cf-bare') && getComputedStyle(btns).display !== 'none' && innerWidth > 560 ? vw * .24 : 0;
    // and the stats panel (parts, checks, battery) on the right
    const stE = document.getElementById('stats'), frameBox = svgEl && svgEl.getBoundingClientRect();
    const right = stE && frameBox && frameBox.width && getComputedStyle(stE).display !== 'none' && innerWidth > 560
      ? Math.max(0, frameBox.right - stE.getBoundingClientRect().left) * vw / frameBox.width : 0;
    const room = vw - left - right, sc = Math.min(room * .95 / 780, vh * .9 / 380), ox = left + (room - 760 * sc) / 2, oy = (vh - 360 * sc) / 2;
    const X = x => f(ox + x * sc), Y = y => f(oy + y * sc), sw = w => (w * sc / INK_K).toFixed(2), fs = v => f(v * sc);
    const d = SD.resolved(st), V = st.calc && st.calc.V ? st.calc.V : d.batt.cells * 3.7, on = SD.powered(st);
    const t = st.test, spinning = t && t.kind === 'motors' ? t.cur : -1;
    let s = `<rect x="${X(-12)}" y="${Y(-26)}" width="${f(784 * sc)}" height="${f(392 * sc)}" rx="${fs(8)}" fill="#fbf8f0" stroke="${INK}" stroke-width="${sw(1.4)}"/>`;
    s += `<text x="${X(0)}" y="${Y(-8)}" font-size="${fs(11)}" font-family="ui-monospace,Menlo,monospace" font-weight="800" fill="${INK}">${CF_ESC(CF_T('WIRING'))} · ${CF_ESC(CF_T(c.title))}</text>`;
    s += `<text x="${X(748)}" y="${Y(-8)}" font-size="${fs(9.5)}" text-anchor="end" font-family="ui-monospace,Menlo,monospace" fill="#857d6e">${CF_ESC(CF_T('click a block'))}</text>`;
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
        s += `<text x="${X(lx)}" y="${Y(ly)}" font-size="${fs(9.5)}" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" fill="#5c564b" paint-order="stroke" stroke="#fbf8f0" stroke-width="${sw(3)}">${CF_ESC(txt)}</text>`;
      }
    }
    for (const [id, nd] of Object.entries(Wr.nodes)){
      const sel = st.sel === id, fitted = SD.isOn(st, id), [x, y] = nd.at;
      const bar = nd.color ? SD.colOf(nd.color) : KIND.power.col;
      const subText = nd.sub === 'batt' ? d.batt.label : nd.sub === 'motor' ? d.motor.label : nd.sub === 'prop' ? (d.prop.label || st.design.prop) : CF_T(nd.sub || '');
      let b = `<rect x="${X(x)}" y="${Y(y)}" width="${fs(BW)}" height="${fs(BH)}" rx="${fs(10)}" fill="${sel ? 'var(--accent,#f4b829)' : '#fbf8f0'}" stroke="${INK}" stroke-width="${sw(1.6)}"${fitted ? '' : ` stroke-dasharray="${f(5 * sc)} ${f(3 * sc)}"`}/>`;
      b += `<path d="M${X(x + 10)} ${Y(y + .8)}L${X(x + 8)} ${Y(y + .8)}Q${X(x + .8)} ${Y(y + .8)} ${X(x + .8)} ${Y(y + 10)}L${X(x + .8)} ${Y(y + BH - 10)}Q${X(x + .8)} ${Y(y + BH - .8)} ${X(x + 8)} ${Y(y + BH - .8)}L${X(x + 10)} ${Y(y + BH - .8)}Z" fill="${bar}"/>`;
      b += `<text x="${X(x + 18)}" y="${Y(y + 23)}" font-size="${fs(12.5)}" font-weight="800" font-family="ui-monospace,Menlo,monospace" fill="${INK}">${CF_ESC(CF_T(nd.title))}</text>`;
      b += `<text x="${X(x + 18)}" y="${Y(y + 41)}" font-size="${fs(10.5)}" font-family="ui-monospace,Menlo,monospace" fill="#5c564b">${CF_ESC(subText)}</text>`;
      if (!fitted) b += `<text x="${X(x + BW - 8)}" y="${Y(y + 13)}" font-size="${fs(8)}" text-anchor="end" font-family="ui-monospace,Menlo,monospace" fill="#857d6e">${CF_ESC(CF_T('not fitted'))}</text>`;
      if (fitted && on && nd.led) b += `<circle cx="${X(x + BW - 12)}" cy="${Y(y + 12)}" r="${fs(4)}" fill="${SD.colOf(nd.led)}" stroke="${INK}" stroke-width="${sw(.8)}"/>`;
      const part = c.byId[id];
      const lbl = CF_ESC(CF_T(part.name || part.short));
      s += act('part', `<g opacity="${fitted ? 1 : .6}">${b}</g>`, `data-id="${id}" data-label="${lbl}" tabindex="0" role="button" aria-label="${lbl}" aria-pressed="${sel}"`);
    }
    const legend = Wr.legend || ['power', 'signal', 'video', 'phase', ...['rf', 'ground'].filter(k => used.has(k))];
    legend.forEach((k, i) => {
      const kk = KIND[k] || KIND.signal, lx = 4 + i * 150, ly = 342;
      s += `<path d="M${X(lx)} ${Y(ly)}L${X(lx + 22)} ${Y(ly)}" stroke="${kk.col}" stroke-width="${sw(4)}"${kk.dash ? ` stroke-dasharray="${f(kk.dash[0] * sc)} ${f(kk.dash[1] * sc)}"` : ''}/>`;
      s += `<text x="${X(lx + 28)}" y="${Y(ly + 3.5)}" font-size="${fs(10)}" font-family="ui-monospace,Menlo,monospace" fill="#5c564b">${CF_ESC(CF_T(kk.name))}</text>`;
    });
    return s;
  };
})();
