import { createUno } from './avr-core.bundle.js';
self.onmessage = async (e) => {
  const { hex, simSeconds, adc, listeners } = e.data;
  const sim = createUno(hex, { adcScript: adc, pinEvents: listeners });
  // chunked like a real app would: 100 simulated ms per slice; wall measured in the worker
  const t0 = performance.now();
  for (let ms = 100; ms <= simSeconds * 1000; ms += 100) sim.runTo(ms);
  const wall = performance.now() - t0;
  self.postMessage({ wallMs: wall, simPerWall: simSeconds / (wall / 1000), events: sim.pinEvents.length, lines: sim.lines.length });
};
