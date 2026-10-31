import { describe, expect, it } from 'vitest';
import { BOARD_IDS, PROFILES, isKnownPin, pinElectrical } from './profiles';

describe('pin electrical model', () => {
  for (const id of BOARD_IDS) {
    const p = PROFILES[id];
    it(`${id} answers with finite numbers and a source`, () => {
      const e = pinElectrical(p);
      for (const v of [e.rOutOhms, e.maxAmps, e.vilFrac, e.vihFrac]) {
        expect(Number.isFinite(v)).toBe(true);
        expect(v).toBeGreaterThan(0);
      }
      expect(e.maxAmps * 1000).toBe(p.pinMaxMa);
      expect(e.vilFrac).toBeLessThan(e.vihFrac);
      expect(e.source).toBe(id === 'uno-r3' || id === 'nano' ? 'avr-typical' : 'assumption-copied-from-avr');
    });

    it(`${id} knows its listed pins and nothing past them`, () => {
      expect(isKnownPin(p, 1000)).toBe(false);
      expect(isKnownPin(p, -1)).toBe(false);
      expect(isKnownPin(p, 1.5)).toBe(false);
      expect(isKnownPin(p, NaN)).toBe(false);
      for (const n of [...p.digitalPins, ...p.analogPins, ...p.leds.map((l) => l.pin), ...p.buttons.map((b) => b.pin)]) {
        expect(isKnownPin(p, n)).toBe(true);
      }
    });
  }

  it('Uno R4 sources less current than Uno R3', () => {
    expect(pinElectrical(PROFILES['uno-r4']).maxAmps).toBeLessThan(pinElectrical(PROFILES['uno-r3']).maxAmps);
  });

  it('the Pico keeps its radio LED and temperature channels', () => {
    expect(isKnownPin(PROFILES.pico, 64)).toBe(true);
    expect(isKnownPin(PROFILES.pico, 104)).toBe(true);
  });
});
