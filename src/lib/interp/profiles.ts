/**
 * Target profiles for the 12 Board Lab boards (ids from D3). A profile holds
 * the facts the interpreters need: integer widths, ADC and PWM details, logic
 * voltage, on-board LEDs and buttons, and pin name aliases.
 */
export type BoardId =
  | 'uno-r3'
  | 'nano'
  | 'uno-r4'
  | 'esp32-devkitc'
  | 'esp32-s3-devkitc-1'
  | 'nodemcu'
  | 'pico'
  | 'nucleo-f401re'
  | 'microbit-v2'
  | 'pi4-pi5'
  | 'basys3'
  | 'de10-lite';

export type Language = 'arduino' | 'python' | 'verilog';

export interface LedDef {
  /** Name shown in the UI and used in snapshots. */
  name: string;
  pin: number;
  /** True when the LED lights with the pin LOW (ESP8266, nRF buttons...). */
  activeLow?: boolean;
  kind: 'single' | 'ws2812';
  color: string;
}

export interface ButtonDef {
  name: string;
  pin: number;
  /** Level the pin reads while the button is held. */
  pressedLevel: 0 | 1;
}

export interface FpgaPort {
  name: string;
  dir: 'in' | 'out';
  width: number;
  /** Electrically active low (7-seg cathodes and anodes on Basys 3, DE10-Lite HEX and KEY). */
  activeLow?: boolean;
}

export interface BoardProfile {
  id: BoardId;
  name: string;
  mcu: string;
  /** Languages the board runs; the first is the default. */
  languages: Language[];
  variants?: string[];
  clockHz: number;
  /** I/O logic level in volts. */
  logicV: number;
  /** Width of `int` in the Arduino core (16 on AVR, 32 on ARM/Xtensa/RISC-V). */
  intBits: 16 | 32;
  /** Width of `double` (AVR treats double as a 32-bit float). */
  doubleBits: 32 | 64;
  /** Plain `char` is signed on AVR and Xtensa, unsigned on ARM. */
  charSigned: boolean;
  /** Default analogRead() resolution and the highest it can be set to. */
  adcBits: number;
  adcMaxBits: number;
  /** Full-scale ADC voltage. */
  adcVref: number;
  /** Pins analogRead() accepts (board numbering). */
  analogPins: number[];
  /** Pins that are analog inputs only (Nano A6/A7, ESP32 GPIO34-39 are input only). */
  analogOnlyPins?: number[];
  inputOnlyPins?: number[];
  /** Pins where analogWrite() produces hardware PWM; 'all' for ESP/RP2040 cores. */
  pwmPins: number[] | 'all';
  /** Default analogWrite() range is 0..(2^pwmBits - 1). */
  pwmBits: number;
  /** Pins attachInterrupt() works on. */
  interruptPins: number[] | 'all';
  /** Digital pin numbers that exist. */
  digitalPins: number[];
  leds: LedDef[];
  buttons: ButtonDef[];
  /** Name → pin number (A0, D4, GP25, LED_BUILTIN, ...). */
  aliases: Record<string, number>;
  i2c?: { sda: number; scl: number };
  /** Simulated cost of one statement in µs (keeps busy loops honest but cheap). */
  opUs: number;
  /** Per-pin current limit in mA (absolute maximum). */
  pinMaxMa: number;
  hasWifi: boolean;
  fpga?: { clockPort: string; ports: FpgaPort[] };
  notes: string[];
}

const range = (a: number, b: number): number[] => Array.from({ length: b - a + 1 }, (_, i) => a + i);

const AVR_ALIASES: Record<string, number> = {
  A0: 14, A1: 15, A2: 16, A3: 17, A4: 18, A5: 19,
  LED_BUILTIN: 13, SDA: 18, SCL: 19, SS: 10, MOSI: 11, MISO: 12, SCK: 13,
};

const uno: BoardProfile = {
  id: 'uno-r3', name: 'Arduino Uno R3', mcu: 'ATmega328P', languages: ['arduino'],
  clockHz: 16_000_000, logicV: 5, intBits: 16, doubleBits: 32, charSigned: true,
  adcBits: 10, adcMaxBits: 10, adcVref: 5, analogPins: range(14, 19),
  pwmPins: [3, 5, 6, 9, 10, 11], pwmBits: 8, interruptPins: [2, 3], digitalPins: range(0, 19),
  leds: [{ name: 'L', pin: 13, kind: 'single', color: 'amber' }], buttons: [],
  aliases: { ...AVR_ALIASES }, i2c: { sda: 18, scl: 19 }, opUs: 1, pinMaxMa: 40, hasWifi: false,
  notes: ['int is 16 bits (-32768..32767); double is the same as float', 'PWM on 3, 5, 6, 9, 10, 11 (490 Hz; 980 Hz on 5 and 6)', 'attachInterrupt on pins 2 and 3 only'],
};

const nano: BoardProfile = {
  ...uno, id: 'nano', name: 'Arduino Nano', analogPins: range(14, 21), analogOnlyPins: [20, 21],
  digitalPins: range(0, 19), aliases: { ...AVR_ALIASES, A6: 20, A7: 21 },
  notes: [...uno.notes, 'A6 and A7 are analog inputs only: digitalRead/pinMode do not work on them'],
};

const unoR4: BoardProfile = {
  id: 'uno-r4', name: 'Arduino Uno R4', mcu: 'Renesas RA4M1 (Cortex-M4)', languages: ['arduino'],
  variants: ['minima', 'wifi'], clockHz: 48_000_000, logicV: 5, intBits: 32, doubleBits: 64, charSigned: false,
  adcBits: 10, adcMaxBits: 14, adcVref: 5, analogPins: range(14, 19),
  pwmPins: [3, 5, 6, 9, 10, 11], pwmBits: 8, interruptPins: [2, 3], digitalPins: range(0, 19),
  leds: [{ name: 'L', pin: 13, kind: 'single', color: 'amber' }], buttons: [],
  aliases: { ...AVR_ALIASES, DAC: 14 }, i2c: { sda: 18, scl: 19 }, opUs: 0.4, pinMaxMa: 8, hasWifi: true,
  notes: ['int is 32 bits', 'analogReadResolution() up to 14 bits; analogWrite(A0) drives the 12-bit DAC', 'pins source only 8 mA: drive LEDs through a resistor, never a motor', 'R4 WiFi has a 12x8 LED matrix (Arduino_LED_Matrix) and an ESP32-S3 radio (WiFiS3)'],
};

const esp32: BoardProfile = {
  id: 'esp32-devkitc', name: 'ESP32-DevKitC V4', mcu: 'ESP32-WROOM-32E (dual-core Xtensa LX6)', languages: ['arduino'],
  clockHz: 240_000_000, logicV: 3.3, intBits: 32, doubleBits: 64, charSigned: true,
  adcBits: 12, adcMaxBits: 12, adcVref: 3.3,
  analogPins: [32, 33, 34, 35, 36, 39, 0, 2, 4, 12, 13, 14, 15, 25, 26, 27],
  inputOnlyPins: [34, 35, 36, 39], pwmPins: 'all', pwmBits: 8, interruptPins: 'all',
  digitalPins: [0, 1, 2, 3, 4, 5, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33, 34, 35, 36, 39],
  leds: [], buttons: [{ name: 'BOOT', pin: 0, pressedLevel: 0 }],
  aliases: { TX: 1, RX: 3, SDA: 21, SCL: 22, SS: 5, MOSI: 23, MISO: 19, SCK: 18, A0: 36, A3: 39, A4: 32, A5: 33, A6: 34, A7: 35, DAC1: 25, DAC2: 26, T0: 4 },
  i2c: { sda: 21, scl: 22 }, opUs: 0.1, pinMaxMa: 40, hasWifi: true,
  notes: ['no user LED and no LED_BUILTIN: wire an LED to GPIO23', 'GPIO34-39 are inputs only, with no pull-ups', 'ADC2 pins (0, 2, 4, 12-15, 25-27) cannot be read while Wi-Fi is on', '3.3 V logic: never feed 5 V into a GPIO'],
};

const esp32s3: BoardProfile = {
  id: 'esp32-s3-devkitc-1', name: 'ESP32-S3-DevKitC-1 v1.1', mcu: 'ESP32-S3 (dual-core Xtensa LX7)', languages: ['arduino'],
  variants: ['v1.1', 'v1.0'], clockHz: 240_000_000, logicV: 3.3, intBits: 32, doubleBits: 64, charSigned: true,
  adcBits: 12, adcMaxBits: 12, adcVref: 3.3, analogPins: range(1, 20), pwmPins: 'all', pwmBits: 8, interruptPins: 'all',
  digitalPins: [...range(0, 21), ...range(35, 48)],
  leds: [{ name: 'RGB', pin: 38, kind: 'ws2812', color: 'rgb' }], buttons: [{ name: 'BOOT', pin: 0, pressedLevel: 0 }],
  aliases: { RGB_BUILTIN: 38, LED_BUILTIN: 38, TX: 43, RX: 44, SDA: 8, SCL: 9, A0: 1, A1: 2, A2: 3, A3: 4, A4: 5, A5: 6 },
  i2c: { sda: 8, scl: 9 }, opUs: 0.1, pinMaxMa: 40, hasWifi: true,
  notes: ['the RGB LED is a WS2812 on GPIO38 (v1.1) or GPIO48 (v1.0): use rgbLedWrite(RGB_BUILTIN, r, g, b)', 'ADC2 pins (11-20) cannot be read while Wi-Fi is on'],
};

const nodemcu: BoardProfile = {
  id: 'nodemcu', name: 'NodeMCU v3 (ESP8266)', mcu: 'ESP8266EX (ESP-12E)', languages: ['arduino'],
  clockHz: 80_000_000, logicV: 3.3, intBits: 32, doubleBits: 64, charSigned: false,
  adcBits: 10, adcMaxBits: 10, adcVref: 3.3, analogPins: [17], pwmPins: [0, 1, 2, 3, 4, 5, 12, 13, 14, 15], pwmBits: 8,
  interruptPins: [0, 1, 2, 3, 4, 5, 12, 13, 14, 15], digitalPins: [0, 1, 2, 3, 4, 5, 9, 10, 12, 13, 14, 15, 16],
  leds: [{ name: 'LED (ESP-12)', pin: 2, activeLow: true, kind: 'single', color: 'cobalt' }, { name: 'LED (board)', pin: 16, activeLow: true, kind: 'single', color: 'tomato' }],
  buttons: [{ name: 'FLASH', pin: 0, pressedLevel: 0 }],
  aliases: { D0: 16, D1: 5, D2: 4, D3: 0, D4: 2, D5: 14, D6: 12, D7: 13, D8: 15, RX: 3, TX: 1, SD2: 9, SD3: 10, A0: 17, LED_BUILTIN: 2, SDA: 4, SCL: 5 },
  i2c: { sda: 4, scl: 5 }, opUs: 0.25, pinMaxMa: 12, hasWifi: true,
  notes: ['the on-board LEDs are active LOW: digitalWrite(LED_BUILTIN, LOW) turns them on', 'D-numbers are not GPIO numbers: D4 is GPIO2', 'A0 reads 0-3.3 V through the board divider (0-1 V at the chip)', 'GPIO16 (D0) has no PWM and no interrupt'],
};

const pico: BoardProfile = {
  id: 'pico', name: 'Raspberry Pi Pico', mcu: 'RP2040 (dual Cortex-M0+)', languages: ['python', 'arduino'],
  variants: ['pico', 'pico-w', 'pico2', 'pico2-w'], clockHz: 125_000_000, logicV: 3.3, intBits: 32, doubleBits: 64, charSigned: false,
  adcBits: 12, adcMaxBits: 12, adcVref: 3.3, analogPins: [26, 27, 28, 29], pwmPins: 'all', pwmBits: 8, interruptPins: 'all',
  digitalPins: range(0, 29), leds: [{ name: 'LED', pin: 25, kind: 'single', color: 'mint' }], buttons: [],
  aliases: { ...Object.fromEntries(range(0, 29).map((i) => [`GP${i}`, i])), LED: 25, LED_BUILTIN: 25, A0: 26, A1: 27, A2: 28, A3: 29 },
  i2c: { sda: 4, scl: 5 }, opUs: 4, pinMaxMa: 12, hasWifi: false,
  notes: ['MicroPython: ADC.read_u16() returns 0-65535', 'Pico W: the LED hangs off the CYW43 radio; use Pin("LED")', 'ADC(4) is the internal temperature sensor'],
};

const nucleo: BoardProfile = {
  id: 'nucleo-f401re', name: 'STM32 Nucleo-F401RE', mcu: 'STM32F401RE (Cortex-M4F)', languages: ['arduino'],
  clockHz: 84_000_000, logicV: 3.3, intBits: 32, doubleBits: 64, charSigned: false,
  adcBits: 10, adcMaxBits: 12, adcVref: 3.3, analogPins: range(16, 21), pwmPins: [3, 5, 6, 9, 10, 11], pwmBits: 8,
  interruptPins: 'all', digitalPins: [...range(0, 21), 23],
  leds: [{ name: 'LD2', pin: 13, kind: 'single', color: 'mint' }], buttons: [{ name: 'B1 USER', pin: 23, pressedLevel: 0 }],
  aliases: { A0: 16, A1: 17, A2: 18, A3: 19, A4: 20, A5: 21, LED_BUILTIN: 13, LED_GREEN: 13, PA5: 13, USER_BTN: 23, PC13: 23, SDA: 14, SCL: 15, PB9: 14, PB8: 15, PA2: 1, PA3: 0 },
  i2c: { sda: 14, scl: 15 }, opUs: 0.25, pinMaxMa: 25, hasWifi: false,
  notes: ['LD2 is on D13 (PA5); the blue B1 USER button is PC13 and reads LOW when pressed', 'most pins are 5 V tolerant, but analog inputs are not', 'analogReadResolution(12) gives the full 12-bit ADC'],
};

const microbit: BoardProfile = {
  id: 'microbit-v2', name: 'BBC micro:bit V2', mcu: 'nRF52833 (Cortex-M4F)', languages: ['python'],
  clockHz: 64_000_000, logicV: 3.3, intBits: 32, doubleBits: 64, charSigned: false,
  adcBits: 10, adcMaxBits: 10, adcVref: 3.3, analogPins: [0, 1, 2, 3, 4, 10], pwmPins: 'all', pwmBits: 10, interruptPins: 'all',
  digitalPins: [...range(0, 16), 19, 20], leds: [],
  buttons: [{ name: 'A', pin: 5, pressedLevel: 0 }, { name: 'B', pin: 11, pressedLevel: 0 }],
  aliases: Object.fromEntries([...range(0, 16), 19, 20].map((i) => [`P${i}`, i])), i2c: { sda: 20, scl: 19 },
  opUs: 6, pinMaxMa: 5, hasWifi: false,
  notes: ['5x5 LED matrix, brightness 0-9', 'buttons A (P5) and B (P11) read LOW when pressed', 'pins P3, P4, P6, P7, P9, P10 are shared with the display'],
};

const pi: BoardProfile = {
  id: 'pi4-pi5', name: 'Raspberry Pi 4 / 5', mcu: 'BCM2711 / BCM2712 + RP1', languages: ['python'],
  variants: ['pi4', 'pi5'], clockHz: 1_800_000_000, logicV: 3.3, intBits: 32, doubleBits: 64, charSigned: false,
  adcBits: 0, adcMaxBits: 0, adcVref: 3.3, analogPins: [], pwmPins: 'all', pwmBits: 8, interruptPins: 'all',
  digitalPins: range(0, 27), leds: [], buttons: [],
  aliases: Object.fromEntries(range(0, 27).map((i) => [`GPIO${i}`, i])), i2c: { sda: 2, scl: 3 },
  opUs: 0.05, pinMaxMa: 16, hasWifi: true,
  notes: ['no analog inputs: use an ADC chip such as the MCP3008', 'gpiozero uses BCM numbers (GPIO17 is physical pin 11)', 'hardware PWM on GPIO12, 13, 18, 19', 'RPi.GPIO does not work on the Pi 5: use gpiozero (lgpio)'],
};

const basys3: BoardProfile = {
  id: 'basys3', name: 'Digilent Basys 3', mcu: 'Xilinx Artix-7 XC7A35T', languages: ['verilog'],
  clockHz: 100_000_000, logicV: 3.3, intBits: 32, doubleBits: 64, charSigned: false,
  adcBits: 12, adcMaxBits: 12, adcVref: 1, analogPins: [], pwmPins: [], pwmBits: 0, interruptPins: [], digitalPins: [],
  leds: [], buttons: [], aliases: {}, opUs: 0, pinMaxMa: 12, hasWifi: false,
  fpga: {
    clockPort: 'clk',
    ports: [
      { name: 'clk', dir: 'in', width: 1 }, { name: 'sw', dir: 'in', width: 16 }, { name: 'btnC', dir: 'in', width: 1 },
      { name: 'btnU', dir: 'in', width: 1 }, { name: 'btnL', dir: 'in', width: 1 }, { name: 'btnR', dir: 'in', width: 1 },
      { name: 'btnD', dir: 'in', width: 1 }, { name: 'led', dir: 'out', width: 16 },
      { name: 'seg', dir: 'out', width: 7, activeLow: true }, { name: 'dp', dir: 'out', width: 1, activeLow: true },
      { name: 'an', dir: 'out', width: 4, activeLow: true },
    ],
  },
  notes: ['100 MHz clock on W5 (port clk)', 'buttons are active high', '7-segment: common anode, an[3:0] and seg[6:0] (CA..CG) are active LOW; multiplex the digits at 1-60 kHz'],
};

const de10: BoardProfile = {
  id: 'de10-lite', name: 'Terasic DE10-Lite', mcu: 'Intel MAX 10 10M50DAF484C7G', languages: ['verilog'],
  clockHz: 50_000_000, logicV: 3.3, intBits: 32, doubleBits: 64, charSigned: false,
  adcBits: 12, adcMaxBits: 12, adcVref: 5, analogPins: [], pwmPins: [], pwmBits: 0, interruptPins: [], digitalPins: [],
  leds: [], buttons: [], aliases: {}, opUs: 0, pinMaxMa: 8, hasWifi: false,
  fpga: {
    clockPort: 'MAX10_CLK1_50',
    ports: [
      { name: 'MAX10_CLK1_50', dir: 'in', width: 1 }, { name: 'SW', dir: 'in', width: 10 },
      { name: 'KEY', dir: 'in', width: 2, activeLow: true }, { name: 'LEDR', dir: 'out', width: 10 },
      ...[0, 1, 2, 3, 4, 5].map((i): FpgaPort => ({ name: `HEX${i}`, dir: 'out', width: 8, activeLow: true })),
    ],
  },
  notes: ['50 MHz clock MAX10_CLK1_50', 'KEY[1:0] read 0 while pressed', 'HEX0-HEX5 are separate, active-LOW 7-segment displays: bit 7 is the decimal point'],
};

export const PROFILES: Record<BoardId, BoardProfile> = {
  'uno-r3': uno, nano, 'uno-r4': unoR4, 'esp32-devkitc': esp32, 'esp32-s3-devkitc-1': esp32s3, nodemcu,
  pico, 'nucleo-f401re': nucleo, 'microbit-v2': microbit, 'pi4-pi5': pi, basys3, 'de10-lite': de10,
};

export const BOARD_IDS = Object.keys(PROFILES) as BoardId[];

/**
 * The profile for a board, with variant adjustments applied
 * (ESP32-S3 v1.0 moves the RGB LED to GPIO48; Pico W/2 W gain Wi-Fi; Pico 2 is an RP2350).
 */
export function getProfile(id: BoardId, variant?: string): BoardProfile {
  const base = PROFILES[id];
  if (!base) throw new Error(`Unknown board "${id}"`);
  if (!variant) return base;
  if (id === 'esp32-s3-devkitc-1' && variant === 'v1.0') {
    return { ...base, name: 'ESP32-S3-DevKitC-1 v1.0', leds: [{ ...base.leds[0], pin: 48 }], aliases: { ...base.aliases, RGB_BUILTIN: 48, LED_BUILTIN: 48 } };
  }
  if (id === 'pico') {
    const w = variant.endsWith('-w');
    const two = variant.startsWith('pico2');
    return {
      ...base,
      name: `Raspberry Pi Pico${two ? ' 2' : ''}${w ? ' W' : ''}`,
      mcu: two ? 'RP2350 (dual Cortex-M33)' : base.mcu,
      clockHz: two ? 150_000_000 : base.clockHz,
      hasWifi: w,
      // On the W boards GP25 is not the LED: it belongs to the radio's SPI bus.
      leds: w ? [{ name: 'LED', pin: 64, kind: 'single', color: 'mint' }] : base.leds,
      aliases: w ? { ...base.aliases, LED: 64, LED_BUILTIN: 64, WL_GPIO0: 64 } : base.aliases,
    };
  }
  if (id === 'uno-r4') return { ...base, name: variant === 'wifi' ? 'Arduino Uno R4 WiFi' : 'Arduino Uno R4 Minima', hasWifi: variant === 'wifi' };
  if (id === 'pi4-pi5') return { ...base, name: variant === 'pi5' ? 'Raspberry Pi 5' : 'Raspberry Pi 4', clockHz: variant === 'pi5' ? 2_400_000_000 : 1_800_000_000 };
  return base;
}

/** Resolve a pin reference (number, "13", "A0", "D4", "GP25", "LED_BUILTIN") to a board pin number. */
export function resolvePin(profile: BoardProfile, ref: number | string): number | undefined {
  if (typeof ref === 'number') return ref;
  const s = ref.trim();
  if (/^\d+$/.test(s)) return Number(s);
  if (s in profile.aliases) return profile.aliases[s];
  // Board buttons and LEDs by their silkscreen name: 'A', 'BOOT', 'B1 USER', 'L'.
  const button = profile.buttons.find((b) => b.name === s);
  if (button) return button.pin;
  return profile.leds.find((l) => l.name === s)?.pin;
}

/** True if analogWrite() on this pin produces real PWM (otherwise it thresholds at half scale). */
export function hasPwm(profile: BoardProfile, pin: number): boolean {
  return profile.pwmPins === 'all' ? true : profile.pwmPins.includes(pin);
}
