const CATALOG = [
  { id: 'led', name: 'LED', pins: ['anode', 'cathode'], value: 'red' },
  { id: 'res', name: 'Resistor', pins: ['1', '2'], value: '220' },
  { id: 'btn', name: 'Push button', pins: ['1', '2'], value: '' },
  { id: 'buz', name: 'Buzzer', pins: ['plus', 'minus'], value: '' },
  { id: 'pot', name: 'Potentiometer', pins: ['a', 'wiper', 'b'], value: '10k' },
  { id: 'srv', name: 'Servo', pins: ['signal', 'power', 'ground'], value: '' },
  { id: 'cap', name: 'Capacitor', pins: ['1', '2'], value: '100n' },
  { id: 'dio', name: 'Diode', pins: ['anode', 'cathode'], value: '' },
];
const UNO_PINS = ['D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10', 'D11', 'D12', 'D13', '5V', '3V3', 'GND', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5'];
const PREFIX = { led: 'LED', res: 'R', btn: 'SW', buz: 'BZ', pot: 'RV', srv: 'M', cap: 'C', dio: 'D' };

const $ = (id) => document.getElementById(id);
const parts = [{ ref: 'U1', kind: 'uno', name: 'Arduino Uno', pins: UNO_PINS, value: '' }];
const wires = [];
let selected = null;
let active = 0;
let results = CATALOG;
let pickerFrom = null;

const say = (text) => { $('live').textContent = text; $('log').textContent = text; };
const pinLabel = (p, pin) => `${p.ref} ${pin}`;
const usedPins = () => new Set(wires.flatMap((w) => [w.from, w.to]));

function renderPalette() {
  $('palette').innerHTML = '';
  results.forEach((c, i) => {
    const li = document.createElement('li');
    li.role = 'option';
    li.id = `opt-${c.id}`;
    li.textContent = c.name;
    li.setAttribute('aria-selected', String(i === active));
    $('palette').append(li);
  });
  $('search').setAttribute('aria-activedescendant', results[active] ? `opt-${results[active].id}` : '');
}

function renderParts() {
  $('parts').innerHTML = '';
  for (const p of parts) {
    const b = document.createElement('button');
    b.className = 'part';
    b.dataset.ref = p.ref;
    b.tabIndex = selected === p.ref || (!selected && p === parts[0]) ? 0 : -1;
    b.setAttribute('aria-pressed', String(selected === p.ref));
    b.textContent = `${p.ref} ${p.name}${p.value ? ` ${p.value}` : ''}`;
    $('parts').append(b);
  }
  $('wires').innerHTML = '';
  for (const w of wires) {
    const d = document.createElement('div');
    d.role = 'listitem';
    d.textContent = `Wire ${w.from} to ${w.to}`;
    $('wires').append(d);
  }
}

function select(ref, focus) {
  selected = ref;
  const p = parts.find((x) => x.ref === ref);
  $('selected').textContent = p ? `${p.ref} ${p.name}` : 'Nothing selected';
  $('value').disabled = !p || p.kind === 'uno';
  $('value').value = p ? p.value : '';
  renderParts();
  if (focus) document.querySelector(`[data-ref="${ref}"]`).focus();
}

function place(c) {
  const n = parts.filter((p) => p.kind === c.id).length + 1;
  const part = { ref: `${PREFIX[c.id]}${n}`, kind: c.id, name: c.name, pins: c.pins, value: c.value };
  parts.push(part);
  select(part.ref, true);
  say(`${part.ref} placed`);
}

function firstFreePin(p) {
  const used = usedPins();
  return p.pins.find((pin) => !used.has(pinLabel(p, pin)));
}

function openPicker() {
  const p = parts.find((x) => x.ref === selected);
  if (!p || p.kind === 'uno') return;
  pickerFrom = pinLabel(p, firstFreePin(p));
  $('picker-title').textContent = `Wire from ${pickerFrom} to`;
  $('pick-search').value = '';
  renderPicker();
  $('picker').showModal();
  $('pick-search').focus();
}

function renderPicker() {
  const q = $('pick-search').value.toLowerCase();
  const used = usedPins();
  const items = parts.flatMap((p) => p.pins.map((pin) => pinLabel(p, pin)))
    .filter((l) => l !== pickerFrom && l.toLowerCase().includes(q));
  $('pick-list').innerHTML = '';
  items.forEach((l, i) => {
    const b = document.createElement('button');
    b.dataset.pin = l;
    b.textContent = used.has(l) ? `${l}, already connected` : l;
    if (i === 0) b.dataset.first = '';
    $('pick-list').append(b);
  });
}

function commitPick(to) {
  wires.push({ from: pickerFrom, to });
  $('picker').close();
  renderParts();
  select(selected, true);
  say(`Wire made between ${pickerFrom} and ${to}`);
}

$('search').addEventListener('input', () => {
  const q = $('search').value.toLowerCase();
  results = CATALOG.filter((c) => c.name.toLowerCase().includes(q));
  active = 0;
  renderPalette();
});
$('search').addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown') { active = Math.min(active + 1, results.length - 1); renderPalette(); e.preventDefault(); }
  if (e.key === 'ArrowUp') { active = Math.max(active - 1, 0); renderPalette(); e.preventDefault(); }
  if (e.key === 'Enter' && results[active]) { place(results[active]); $('search').value = ''; results = CATALOG; active = 0; renderPalette(); }
});

$('parts').addEventListener('keydown', (e) => {
  const refs = parts.map((p) => p.ref);
  const i = refs.indexOf(e.target.dataset.ref);
  if (e.key === 'ArrowDown' && i < refs.length - 1) { select(refs[i + 1], true); e.preventDefault(); }
  if (e.key === 'ArrowUp' && i > 0) { select(refs[i - 1], true); e.preventDefault(); }
  if (e.key === 'Enter' && !$('value').disabled) { $('value').focus(); $('value').select(); e.preventDefault(); }
});
$('parts').addEventListener('focusin', (e) => {
  if (e.target.dataset.ref && e.target.dataset.ref !== selected) select(e.target.dataset.ref, false);
});

$('value').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const p = parts.find((x) => x.ref === selected);
    p.value = $('value').value;
    renderParts();
    select(selected, true);
    say(`${p.ref} value set to ${p.value}`);
  }
  if (e.key === 'Escape') select(selected, true);
});

$('pick-search').addEventListener('input', renderPicker);
$('pick-search').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const first = $('pick-list').querySelector('[data-first]');
    if (first) commitPick(first.dataset.pin);
  }
  if (e.key === 'ArrowDown') { $('pick-list').querySelector('button')?.focus(); e.preventDefault(); }
});
$('pick-list').addEventListener('click', (e) => { if (e.target.dataset.pin) commitPick(e.target.dataset.pin); });
$('picker').addEventListener('cancel', () => { if (selected) document.querySelector(`[data-ref="${selected}"]`).focus(); });

document.addEventListener('keydown', (e) => {
  const typing = e.target.matches('input, textarea');
  if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === '/') { e.preventDefault(); $('search').focus(); }
  if (e.key === 'w' || e.key === 'W') { e.preventDefault(); openPicker(); }
});

window.__presses = 0;
window.addEventListener('keydown', () => { window.__presses += 1; }, true);
window.__state = () => ({ parts, wires });

renderPalette();
renderParts();
