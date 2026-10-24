// @cf page plain
// @cf title Plain page smoke test
// A page that draws itself (no mountFigure) and still speaks the bridge, the pattern for the flight range.
(() => {
  let count = 0;
  document.body.insertAdjacentHTML('beforeend', '<main style="font:16px ui-monospace,Menlo,monospace;padding:24px"><p id="n">0</p></main>');
  CF_BRIDGE.on('bump', () => { count++; document.getElementById('n').textContent = String(count); CF_BRIDGE.send('state', { state: { count }, changed: ['count'] }); });
  CF_BRIDGE.plain(() => ({ fig: null, title: CF_T('Plain page smoke test'), en: 'Plain page smoke test', buttons: [], acts: [], parts: [], state: { count } }));
})();
