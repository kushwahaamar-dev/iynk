export interface CostEntry {
  call: string;
  us: number;
  source: string;
}

const CORE = 'arduino:avr 1.8.8 core cycle count at 16 MHz, not yet re-measured on avr8js 0.21.1';

/** Extra microseconds a call costs on an AVR board, on top of the flat statement cost. */
export const AVR_COST_TABLE: CostEntry[] = [
  { call: 'digitalWrite', us: 3.6, source: CORE },
  { call: 'digitalRead', us: 3.9, source: CORE },
  { call: 'pinMode', us: 3.2, source: CORE },
  { call: 'analogWrite', us: 5.4, source: CORE },
  { call: 'analogRead', us: 104, source: 'ATmega328P datasheet: 13 ADC cycles at 125 kHz' },
];

const AVR_PROFILES = new Set(['uno-r3', 'nano']);

const BY_CALL = new Map(AVR_COST_TABLE.map((e) => [e.call, e.us]));

/** Boards without an oracle (everything but the Uno and Nano) keep the flat statement cost. */
export function costUs(call: string, profileId: string): number {
  return AVR_PROFILES.has(profileId) ? (BY_CALL.get(call) ?? 0) : 0;
}
