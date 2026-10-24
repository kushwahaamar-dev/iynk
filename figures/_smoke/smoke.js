// @cf title Smoke test
// The platform smoke test: one box with a pressable button on top. Build and shoot it with
//   python3 -I figures/tools/cfbuild.py _smoke/smoke && python3 -I figures/tools/cfshoot.py _smoke/smoke --press "Press the button@300"
(() => {
  const W = 120, D = 90, H = 60;
  const st = { pressed: 0, lit: false, exploded: false, dip: 0 };

  const press = (s, u) => {
    s.pressed++; s.lit = !s.lit; s.dip = 1;
    u.flash(s.lit ? 'The lamp is on.' : 'The lamp is off.');
    u.animate(dt => { s.dip = Math.max(0, s.dip - dt * 5); return s.dip > 0; });
  };

  const lift = () => (st.exploded ? 40 : 0);
  const scene = (s, m) => {
    const z = H + lift(), top = z + 6 - 4 * s.dip;
    const lamp = s.lit ? matOf('#fff1a8') : METAL;
    return castShadow([[0, 0, 0], [W, 0, 0], [W, D, 0], [0, D, 0]])
      + box(0, 0, 0, W, D, H, m, tone, 1.2)
      + act('button', cyl(W / 2, D / 2, z, top, 14, PALS.tomato, toneI, 1.1), 'data-id="button" data-label="Push button"')
      + cyl(W * .2, D * .2, z, z + 4, 6, lamp, toneI, 1)
      + tag([W / 2, D / 2, top], 40, -46, 'PUSH BUTTON', s.dip > 0)
      + tag([W * .2, D * .2, z + 4], -46, -30, 'LAMP', s.lit);
  };

  const ui = mountFigure({
    fig: '00', title: 'Smoke test', size: [W, D, H + 50], palette: 'cobalt', state: st,
    scene: xrWrap((s, m) => scene(s, m), {
      getSt: () => st, B: [0, W, 0, D, 0, H],
      mech: (s, k) => box(10, 10, 4, W - 10, D - 10, 14, DARK, toneI, .8),
      inside: s => [{ at: [W / 2, D / 2, 14], text: 'BATTERY', on: s.lit }],
    }),
    readout: s => (s.lit ? 'Lamp on' : 'Lamp off'),
    buttons: [{ id: 'press', label: 'Press the button', onClick: press }],
    acts: { button: (s, el, u) => press(s, u) },
    params: (s, q) => { s.exploded = q.get('exploded') === '1'; },
    embed: {
      accept: (s, p) => { if (typeof p.lit !== 'boolean') return 'lit must be true or false'; s.lit = p.lit; return true; },
      report: s => ({ lit: s.lit, pressed: s.pressed }),
    },
  });
  xrMount(() => ui, s => 'A battery under the lid lights the lamp.');
})();
