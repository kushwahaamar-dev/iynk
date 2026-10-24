// Arduino Nano (classic), SKU A000005, board revision 3.3. Facts: docs/facts/nano.md (geometry, pins and power
// from Arduino's NanoV3.3 Eagle files, production parts from the official photos). Figure: figures/boards/nano.js;
// part ids, nets, circuit keys (= lesson ids) and fault ids here match that file exactly.
import type { BoardContent, PinRow } from '@/content/schema';

const DIGITAL = 5;

const j1: PinRow[] = [
  { header: 'J1', pin: '1', label: 'TX1', functions: ['D1', 'TXD', 'PCINT17'], caps: ['digital', 'uart'], volts: DIGITAL, maxCurrentMa: 20, net: 'D1', note: 'pins.j1.1' },
  { header: 'J1', pin: '2', label: 'RX0', functions: ['D0', 'RXD', 'PCINT16'], caps: ['digital', 'uart'], volts: DIGITAL, maxCurrentMa: 20, net: 'D0', note: 'pins.j1.2' },
  { header: 'J1', pin: '3', label: 'RST', functions: ['RESET (active low)', 'PCINT14'], caps: ['reset'], volts: DIGITAL, net: 'RESET', note: 'pins.j1.3' },
  { header: 'J1', pin: '4', label: 'GND', functions: ['GND'], caps: ['gnd'], volts: null, net: 'GND' },
  { header: 'J1', pin: '5', label: 'D2', functions: ['INT0', 'PCINT18'], caps: ['digital', 'interrupt'], volts: DIGITAL, maxCurrentMa: 20, net: 'D2' },
  { header: 'J1', pin: '6', label: 'D3', functions: ['PWM OC2B (490 Hz)', 'INT1', 'PCINT19'], caps: ['digital', 'pwm', 'interrupt'], volts: DIGITAL, maxCurrentMa: 20, net: 'D3', note: 'pins.j1.6' },
  { header: 'J1', pin: '7', label: 'D4', functions: ['T0', 'XCK', 'PCINT20'], caps: ['digital'], volts: DIGITAL, maxCurrentMa: 20, net: 'D4' },
  { header: 'J1', pin: '8', label: 'D5', functions: ['PWM OC0B (977 Hz)', 'T1', 'PCINT21'], caps: ['digital', 'pwm'], volts: DIGITAL, maxCurrentMa: 20, net: 'D5', note: 'pins.j1.8' },
  { header: 'J1', pin: '9', label: 'D6', functions: ['PWM OC0A (977 Hz)', 'AIN0', 'PCINT22'], caps: ['digital', 'pwm'], volts: DIGITAL, maxCurrentMa: 20, net: 'D6', note: 'pins.j1.9' },
  { header: 'J1', pin: '10', label: 'D7', functions: ['AIN1', 'PCINT23'], caps: ['digital'], volts: DIGITAL, maxCurrentMa: 20, net: 'D7' },
  { header: 'J1', pin: '11', label: 'D8', functions: ['ICP1', 'CLKO', 'PCINT0'], caps: ['digital'], volts: DIGITAL, maxCurrentMa: 20, net: 'D8' },
  { header: 'J1', pin: '12', label: 'D9', functions: ['PWM OC1A (490 Hz)', 'PCINT1'], caps: ['digital', 'pwm'], volts: DIGITAL, maxCurrentMa: 20, net: 'D9', note: 'pins.j1.12' },
  { header: 'J1', pin: '13', label: 'D10', functions: ['PWM OC1B (490 Hz)', 'SPI SS', 'PCINT2'], caps: ['digital', 'pwm', 'spi'], volts: DIGITAL, maxCurrentMa: 20, net: 'D10', note: 'pins.j1.13' },
  { header: 'J1', pin: '14', label: 'D11', functions: ['PWM OC2A (490 Hz)', 'SPI MOSI (COPI)', 'PCINT3'], caps: ['digital', 'pwm', 'spi'], volts: DIGITAL, maxCurrentMa: 20, net: 'D11', note: 'pins.j1.14' },
  { header: 'J1', pin: '15', label: 'D12', functions: ['SPI MISO (CIPO)', 'PCINT4'], caps: ['digital', 'spi'], volts: DIGITAL, maxCurrentMa: 20, net: 'D12' },
];

const j2: PinRow[] = [
  { header: 'J2', pin: '1', label: 'VIN', functions: ['LDO input, 7-12 V'], caps: ['power'], volts: null, net: 'VIN', note: 'pins.j2.1' },
  { header: 'J2', pin: '2', label: 'GND', functions: ['GND'], caps: ['gnd'], volts: null, net: 'GND' },
  { header: 'J2', pin: '3', label: 'RST', functions: ['RESET (active low)'], caps: ['reset'], volts: DIGITAL, net: 'RESET', note: 'pins.j2.3' },
  { header: 'J2', pin: '4', label: '5V', functions: ['+5V rail, in or out'], caps: ['power'], volts: 5, net: '5V', note: 'pins.j2.4' },
  { header: 'J2', pin: '5', label: 'A7', functions: ['ADC7'], caps: ['analog-in', 'input-only'], volts: DIGITAL, net: 'A7', note: 'pins.j2.5' },
  { header: 'J2', pin: '6', label: 'A6', functions: ['ADC6'], caps: ['analog-in', 'input-only'], volts: DIGITAL, net: 'A6', note: 'pins.j2.6' },
  { header: 'J2', pin: '7', label: 'A5', functions: ['ADC5', 'I2C SCL', 'D19', 'PCINT13'], caps: ['digital', 'analog-in', 'i2c'], volts: DIGITAL, maxCurrentMa: 20, net: 'A5', note: 'pins.j2.7' },
  { header: 'J2', pin: '8', label: 'A4', functions: ['ADC4', 'I2C SDA', 'D18', 'PCINT12'], caps: ['digital', 'analog-in', 'i2c'], volts: DIGITAL, maxCurrentMa: 20, net: 'A4', note: 'pins.j2.8' },
  { header: 'J2', pin: '9', label: 'A3', functions: ['ADC3', 'D17', 'PCINT11'], caps: ['digital', 'analog-in'], volts: DIGITAL, maxCurrentMa: 20, net: 'A3' },
  { header: 'J2', pin: '10', label: 'A2', functions: ['ADC2', 'D16', 'PCINT10'], caps: ['digital', 'analog-in'], volts: DIGITAL, maxCurrentMa: 20, net: 'A2' },
  { header: 'J2', pin: '11', label: 'A1', functions: ['ADC1', 'D15', 'PCINT9'], caps: ['digital', 'analog-in'], volts: DIGITAL, maxCurrentMa: 20, net: 'A1' },
  { header: 'J2', pin: '12', label: 'A0', functions: ['ADC0', 'D14', 'PCINT8'], caps: ['digital', 'analog-in'], volts: DIGITAL, maxCurrentMa: 20, net: 'A0' },
  { header: 'J2', pin: '13', label: 'REF', functions: ['AREF', 'ADC reference'], caps: [], volts: DIGITAL, net: 'AREF', note: 'pins.j2.13' },
  { header: 'J2', pin: '14', label: '3.3V', functions: ['3.3 V out from the FT232 (50 mA)'], caps: ['power'], volts: 3.3, maxCurrentMa: 50, net: '3V3', note: 'pins.j2.14' },
  { header: 'J2', pin: '15', label: 'D13', functions: ['SPI SCK', 'LED L', 'PCINT5'], caps: ['digital', 'spi', 'led'], volts: DIGITAL, maxCurrentMa: 20, net: 'D13', note: 'pins.j2.15' },
];

const icsp: PinRow[] = [
  { header: 'J4', pin: '1', label: 'MISO', functions: ['D12', 'SPI MISO'], caps: ['spi'], volts: DIGITAL, net: 'D12', note: 'pins.j4.icsp' },
  { header: 'J4', pin: '2', label: '5V', functions: ['+5V'], caps: ['power'], volts: 5, net: '5V', note: 'pins.j4.icsp' },
  { header: 'J4', pin: '3', label: 'SCK', functions: ['D13', 'SPI SCK'], caps: ['spi'], volts: DIGITAL, net: 'D13', note: 'pins.j4.icsp' },
  { header: 'J4', pin: '4', label: 'MOSI', functions: ['D11', 'SPI MOSI'], caps: ['spi'], volts: DIGITAL, net: 'D11', note: 'pins.j4.icsp' },
  { header: 'J4', pin: '5', label: 'RESET', functions: ['RESET (active low)'], caps: ['reset'], volts: DIGITAL, net: 'RESET', note: 'pins.j4.icsp' },
  { header: 'J4', pin: '6', label: 'GND', functions: ['GND'], caps: ['gnd'], volts: null, net: 'GND', note: 'pins.j4.icsp' },
];

const nano: BoardContent = {
  lab: 'board',
  id: 'nano',
  maker: 'Arduino',
  variants: [],
  mcu: {
    part: 'ATmega328P-MU',
    core: 'AVR 8-bit RISC',
    cores: 1,
    clockHz: 16_000_000,
    flashBytes: 32_768,
    ramBytes: 2_048,
    eepromBytes: 1_024,
    target: 'avr',
    adcBits: 10,
    wireless: [],
    companions: [{ part: 'FT232RNL', role: 'mcu.ft232rnl' }],
  },
  logicVolts: 5,
  power: {
    inputs: [
      { id: 'usb', connector: 'mini-usb', part: 'J3', volts: { min: 4.75, max: 5.25 }, maxCurrentMa: 500, reverseProtected: true, protection: 'power.usb.protection' },
      { id: 'vin', connector: 'header-pin', part: 'J2', volts: { min: 7, max: 15, recommended: [7, 12] }, maxCurrentMa: 800, reverseProtected: false, protection: 'power.vin.protection' },
      { id: 'pin5', connector: 'header-pin', part: 'J2', volts: { min: 4.75, max: 5.25 }, reverseProtected: false, protection: 'power.pin5.protection' },
    ],
    rails: [
      { name: 'VUSB', volts: 5, maxCurrentMa: 500, from: 'F1', note: 'power.rails.vusb' },
      { name: '5V', volts: 5, maxCurrentMa: 800, from: 'IC2', note: 'power.rails.5v' },
      { name: '3V3', volts: 3.3, maxCurrentMa: 50, from: 'IC1', note: 'power.rails.3v3' },
    ],
    io: { perPinMa: 20, absMaxPerPinMa: 40, totalMa: 200, note: 'power.io' },
    brownoutVolts: 2.7,
    idleMa: 27,
  },
  pinout: [...j1, ...j2, ...icsp],
  leds: [
    { id: 'L', label: 'L', color: 'yellow', drivenBy: 'D13', activeLow: false, note: 'leds.L' },
    { id: 'TX', label: 'TX', color: 'green', drivenBy: 'usb-tx', activeLow: true, note: 'leds.TX' },
    { id: 'RX', label: 'RX', color: 'red', drivenBy: 'usb-rx', activeLow: true, note: 'leds.RX' },
    { id: 'PWR', label: 'ON', color: 'green', drivenBy: 'power', activeLow: false, note: 'leds.PWR' },
  ],
  controls: [{ id: 'SW1', label: 'RESET', kind: 'reset', pin: 'RESET', activeLow: true, act: 'ctl', effect: 'controls.SW1' }],
  displays: [],
  figure: {
    page: '/figures/boards/nano.html',
    sheets: ['board', 'breadboard', 'schematic', 'power'],
    parts: [
      { id: 'IC3', short: 'MCU', role: 'mcu', name: 'parts.IC3.name', what: 'parts.IC3.what' },
      { id: 'Y1', short: 'RESONATOR', role: 'crystal', name: 'parts.Y1.name', what: 'parts.Y1.what' },
      { id: 'SW1', short: 'RESET', role: 'button', name: 'parts.SW1.name', what: 'parts.SW1.what' },
      { id: 'TX', short: 'TX', role: 'led', name: 'parts.TX.name', what: 'parts.TX.what' },
      { id: 'RX', short: 'RX', role: 'led', name: 'parts.RX.name', what: 'parts.RX.what' },
      { id: 'PWR', short: 'ON', role: 'led', name: 'parts.PWR.name', what: 'parts.PWR.what' },
      { id: 'L', short: 'L LED', role: 'led', name: 'parts.L.name', what: 'parts.L.what' },
      { id: 'J3', short: 'MINI-USB', role: 'connector', name: 'parts.J3.name', what: 'parts.J3.what' },
      { id: 'J4', short: 'ICSP', role: 'header', name: 'parts.J4.name', what: 'parts.J4.what' },
      { id: 'J1', short: 'J1', role: 'header', name: 'parts.J1.name', what: 'parts.J1.what' },
      { id: 'J2', short: 'J2', role: 'header', name: 'parts.J2.name', what: 'parts.J2.what' },
      { id: 'IC1', short: 'USB-SERIAL', role: 'usb-bridge', name: 'parts.IC1.name', what: 'parts.IC1.what' },
      { id: 'IC2', short: '5V REG', role: 'regulator', name: 'parts.IC2.name', what: 'parts.IC2.what' },
      { id: 'D1', short: 'DIODE', role: 'protection', name: 'parts.D1.name', what: 'parts.D1.what' },
      { id: 'F1', short: 'POLYFUSE', role: 'protection', name: 'parts.F1.name', what: 'parts.F1.what' },
      { id: 'C2', short: 'C2', role: 'passive', name: 'parts.C2.name', what: 'parts.C2.what' },
      { id: 'C5', short: 'C5', role: 'passive', name: 'parts.C5.name', what: 'parts.C5.what' },
      { id: 'C1', short: 'C1', role: 'passive', name: 'parts.C1.name', what: 'parts.C1.what' },
      { id: 'C3', short: 'C3', role: 'passive', name: 'parts.C3.name', what: 'parts.C3.what' },
      { id: 'C4', short: 'AUTO-RESET', role: 'passive', name: 'parts.C4.name', what: 'parts.C4.what' },
      { id: 'C6', short: 'C6', role: 'passive', name: 'parts.C6.name', what: 'parts.C6.what' },
      { id: 'C7', short: 'C7', role: 'passive', name: 'parts.C7.name', what: 'parts.C7.what' },
      { id: 'C8', short: 'C8', role: 'passive', name: 'parts.C8.name', what: 'parts.C8.what' },
      { id: 'C9', short: 'C9', role: 'passive', name: 'parts.C9.name', what: 'parts.C9.what' },
      { id: 'RP1', short: 'RP1', role: 'passive', name: 'parts.RP1.name', what: 'parts.RP1.what' },
      { id: 'RP2', short: 'RP2', role: 'passive', name: 'parts.RP2.name', what: 'parts.RP2.what' },
    ],
  },
  wireables: [
    { part: 'led', supplyVolts: 5, note: 'wireables.led.note', caution: 'wireables.led.caution',
      connections: [{ from: 'A', to: 'D9', color: 'orange' }, { from: 'K', to: 'GND', color: 'black' }] },
    { part: 'push-button', supplyVolts: 5, note: 'wireables.push-button.note',
      connections: [{ from: '1', to: 'D2', color: 'blue' }, { from: '3', to: 'GND', color: 'black' }] },
    { part: 'potentiometer', supplyVolts: 5, note: 'wireables.potentiometer.note',
      connections: [{ from: '1', to: 'GND', color: 'black' }, { from: '2', to: 'A0', color: 'yellow' }, { from: '3', to: '5V', color: 'red' }] },
    { part: 'ldr', supplyVolts: 5, note: 'wireables.ldr.note',
      connections: [{ from: '1', to: '5V', color: 'red' }, { from: '2', to: 'A0', color: 'yellow' }] },
    { part: 'tmp36', supplyVolts: 5, note: 'wireables.tmp36.note',
      connections: [{ from: '+Vs', to: '5V', color: 'red' }, { from: 'Vout', to: 'A1', color: 'yellow' }, { from: 'GND', to: 'GND', color: 'black' }] },
    { part: 'piezo-buzzer', supplyVolts: 5, note: 'wireables.piezo-buzzer.note', caution: 'wireables.piezo-buzzer.caution',
      connections: [{ from: '+', to: 'D8', color: 'orange' }, { from: '−', to: 'GND', color: 'black' }] },
    { part: 'servo-sg90', supplyVolts: 5, note: 'wireables.servo-sg90.note', caution: 'wireables.servo-sg90.caution',
      connections: [{ from: 'SIG', to: 'D9', color: 'orange' }, { from: 'GND', to: 'GND', color: 'brown' }] },
    { part: 'hc-sr04', supplyVolts: 5, note: 'wireables.hc-sr04.note',
      connections: [{ from: 'VCC', to: '5V', color: 'red' }, { from: 'Trig', to: 'D9', color: 'yellow' }, { from: 'Echo', to: 'D10', color: 'green' }, { from: 'GND', to: 'GND', color: 'black' }] },
    { part: 'mpu6050', supplyVolts: 5, note: 'wireables.mpu6050.note', caution: 'wireables.mpu6050.caution',
      connections: [{ from: 'VCC', to: '5V', color: 'red' }, { from: 'GND', to: 'GND', color: 'black' }, { from: 'SCL', to: 'A5', color: 'yellow' }, { from: 'SDA', to: 'A4', color: 'blue' }] },
    { part: 'ssd1306', supplyVolts: 5, note: 'wireables.ssd1306.note', caution: 'wireables.ssd1306.caution',
      connections: [{ from: 'GND', to: 'GND', color: 'black' }, { from: 'VCC', to: '5V', color: 'red' }, { from: 'SCL', to: 'A5', color: 'yellow' }, { from: 'SDA', to: 'A4', color: 'blue' }] },
  ],
  failures: [
    { id: 'reverse-vin', kind: 'reverse-polarity', trigger: { by: 'reverse', input: 'vin' },
      figure: { type: 'set', state: { power: 'vin', fault: 'reverse-polarity:vin' } },
      effect: { power: 'off', halts: true, damages: ['IC2'] },
      title: 'failures.reverse-vin.title', symptom: 'failures.reverse-vin.symptom', explanation: 'failures.reverse-vin.explanation', fix: 'failures.reverse-vin.fix' },
    { id: 'reverse-5v', kind: 'reverse-polarity', trigger: { by: 'reverse', input: 'pin5' },
      figure: { type: 'set', state: { power: 'pin5', fault: 'reverse-polarity:pin5' } },
      effect: { power: 'off', halts: true, damages: ['IC3', 'C5'] },
      title: 'failures.reverse-5v.title', symptom: 'failures.reverse-5v.symptom', explanation: 'failures.reverse-5v.explanation', fix: 'failures.reverse-5v.fix' },
    { id: 'brownout', kind: 'brownout', trigger: { by: 'load', rail: '5V', ma: 1000, part: 'servo-sg90' },
      figure: { type: 'set', state: { power: 'usb', fault: 'brownout' } },
      effect: { power: 'resetting', halts: true, serial: ['Nano ready', 'Nano ready', 'Nano ready'] },
      title: 'failures.brownout.title', symptom: 'failures.brownout.symptom', explanation: 'failures.brownout.explanation', fix: 'failures.brownout.fix' },
    { id: 'vin-overvoltage', kind: 'wrong-voltage', trigger: { by: 'power-input', input: 'vin', volts: 19 },
      figure: { type: 'set', state: { power: 'vin', fault: 'wrong-voltage:vin:19' } },
      effect: { power: 'off', halts: true, damages: ['IC2'] },
      title: 'failures.vin-overvoltage.title', symptom: 'failures.vin-overvoltage.symptom', explanation: 'failures.vin-overvoltage.explanation', fix: 'failures.vin-overvoltage.fix' },
    { id: 'vin-too-low', kind: 'wrong-voltage', trigger: { by: 'power-input', input: 'vin', volts: 3.5 },
      figure: { type: 'set', state: { power: 'vin', fault: 'wrong-voltage:vin:3.5' } },
      effect: { power: 'resetting', halts: true },
      title: 'failures.vin-too-low.title', symptom: 'failures.vin-too-low.symptom', explanation: 'failures.vin-too-low.explanation', fix: 'failures.vin-too-low.fix' },
    { id: '5v-overvoltage', kind: 'wrong-voltage', trigger: { by: 'power-input', input: 'pin5', volts: 10 },
      figure: { type: 'set', state: { power: 'pin5', fault: 'wrong-voltage:pin5:10' } },
      effect: { power: 'off', halts: true, damages: ['IC3', 'IC1'] },
      title: 'failures.5v-overvoltage.title', symptom: 'failures.5v-overvoltage.symptom', explanation: 'failures.5v-overvoltage.explanation', fix: 'failures.5v-overvoltage.fix' },
    { id: '3v3-backfeed', kind: 'wrong-voltage', trigger: { by: 'power-input', input: 'pin3', volts: 5 },
      figure: { type: 'set', state: { power: 'pin3', fault: 'wrong-voltage:pin3:5' } },
      effect: { power: 'off', halts: true, damages: ['IC1'] },
      title: 'failures.3v3-backfeed.title', symptom: 'failures.3v3-backfeed.symptom', explanation: 'failures.3v3-backfeed.explanation', fix: 'failures.3v3-backfeed.fix' },
    { id: 'short-5v', kind: 'short', trigger: { by: 'short', nets: ['5V', 'GND'] },
      figure: { type: 'set', state: { power: 'usb', fault: 'short:5V:GND' } },
      effect: { power: 'off', halts: true },
      title: 'failures.short-5v.title', symptom: 'failures.short-5v.symptom', explanation: 'failures.short-5v.explanation', fix: 'failures.short-5v.fix' },
    { id: 'cold-usb', kind: 'cold-solder', trigger: { by: 'cold-joint', part: 'J3' },
      figure: { type: 'set', state: { power: 'usb', fault: 'cold:J3' } },
      effect: { power: 'resetting', halts: true },
      title: 'failures.cold-usb.title', symptom: 'failures.cold-usb.symptom', explanation: 'failures.cold-usb.explanation', fix: 'failures.cold-usb.fix' },
    { id: 'cold-resonator', kind: 'cold-solder', trigger: { by: 'cold-joint', part: 'Y1' },
      figure: { type: 'set', state: { power: 'usb', fault: 'cold:Y1' } },
      effect: { power: 'on', halts: true },
      title: 'failures.cold-resonator.title', symptom: 'failures.cold-resonator.symptom', explanation: 'failures.cold-resonator.explanation', fix: 'failures.cold-resonator.fix' },
    { id: 'cold-d9', kind: 'cold-solder', trigger: { by: 'cold-joint', part: 'J1', pin: 'J1.12' },
      figure: { type: 'set', state: { power: 'usb', circuit: 'fade', fault: 'cold:J1.12' } },
      effect: { power: 'on', halts: false, pins: { D9: 'noisy' } },
      title: 'failures.cold-d9.title', symptom: 'failures.cold-d9.symptom', explanation: 'failures.cold-d9.explanation', fix: 'failures.cold-d9.fix' },
    { id: 'missing-resonator', kind: 'missing-part', trigger: { by: 'remove-part', part: 'Y1' },
      figure: { type: 'set', state: { fault: 'missing:Y1' } },
      effect: { power: 'on', halts: true },
      title: 'failures.missing-resonator.title', symptom: 'failures.missing-resonator.symptom', explanation: 'failures.missing-resonator.explanation', fix: 'failures.missing-resonator.fix' },
    { id: 'missing-c4', kind: 'missing-part', trigger: { by: 'remove-part', part: 'C4' },
      figure: { type: 'set', state: { fault: 'missing:C4' } },
      effect: { power: 'on', halts: false },
      title: 'failures.missing-c4.title', symptom: 'failures.missing-c4.symptom', explanation: 'failures.missing-c4.explanation', fix: 'failures.missing-c4.fix' },
    { id: 'missing-d1', kind: 'missing-part', trigger: { by: 'remove-part', part: 'D1' },
      figure: { type: 'set', state: { fault: 'missing:D1' } },
      effect: { power: 'off', halts: true },
      title: 'failures.missing-d1.title', symptom: 'failures.missing-d1.symptom', explanation: 'failures.missing-d1.explanation', fix: 'failures.missing-d1.fix' },
    { id: 'reversed-c5', kind: 'reversed-part', trigger: { by: 'reverse-part', part: 'C5' },
      figure: { type: 'set', state: { fault: 'reversed:C5' } },
      effect: { power: 'off', halts: true, damages: ['C5'] },
      title: 'failures.reversed-c5.title', symptom: 'failures.reversed-c5.symptom', explanation: 'failures.reversed-c5.explanation', fix: 'failures.reversed-c5.fix' },
  ],
  assembly: [
    { id: 'unplug', kind: 'build', action: { type: 'set', state: { power: null } }, done: { power: null }, major: false,
      title: 'assembly.unplug.title', body: 'assembly.unplug.body' },
    { id: 'strip', kind: 'build', action: { type: 'press', id: 'strip' }, done: { build: 'bare' }, major: false,
      title: 'assembly.strip.title', body: 'assembly.strip.body', refusal: 'assembly.strip.refusal' },
    { id: 'reflow', kind: 'build', action: { type: 'press', id: 'pnp' }, done: { build: 'reflowed' }, major: false,
      title: 'assembly.reflow.title', body: 'assembly.reflow.body', refusal: 'assembly.reflow.refusal' },
    { id: 'header-j1', kind: 'build', action: { type: 'press', id: 'place', choice: 'j1' }, done: { 'missing.length': 1 }, major: false,
      title: 'assembly.header-j1.title', body: 'assembly.header-j1.body', refusal: 'assembly.header-j1.refusal' },
    { id: 'header-j2', kind: 'build', action: { type: 'press', id: 'place', choice: 'j2' }, done: { 'missing.length': 0 }, major: false,
      title: 'assembly.header-j2.title', body: 'assembly.header-j2.body', refusal: 'assembly.header-j2.refusal' },
    { id: 'solder', kind: 'build', action: { type: 'press', id: 'solder' }, done: { build: 'assembled' }, major: false,
      title: 'assembly.solder.title', body: 'assembly.solder.body', refusal: 'assembly.solder.refusal' },
    { id: 'power-up', kind: 'test', action: { type: 'set', state: { power: 'usb' } }, done: { status: 'running', 'leds.PWR': 1, 'rails.3V3': 3.3 }, major: false,
      title: 'assembly.power-up.title', body: 'assembly.power-up.body' },
    { id: 'factory-blink', kind: 'test', action: { type: 'set', state: { mode: 'blink' } }, done: { status: 'running', mode: 'blink' }, major: false,
      title: 'assembly.factory-blink.title', body: 'assembly.factory-blink.body' },
    { id: 'upload-hello', kind: 'test', action: { type: 'press', id: 'upload', choice: 'hello' }, done: { status: 'running', mode: 'hello' }, major: false,
      title: 'assembly.upload-hello.title', body: 'assembly.upload-hello.body', refusal: 'assembly.upload-hello.refusal' },
  ],
  lessons: [
    {
      id: 'blink', n: 1, level: 'io', language: 'arduino-cpp',
      code: {
        libraries: [],
        source: `// {{t:lessons.blink.code.intro}}
// {{t:lessons.blink.code.resistor}} {{p:resistor}}
const int LED_PIN = LED_BUILTIN;  // D13: L {{t:lessons.blink.code.pin}}

void setup() {
  pinMode(LED_PIN, OUTPUT);
}

void loop() {
  digitalWrite(LED_PIN, HIGH);
  delay({{p:on}});
  digitalWrite(LED_PIN, LOW);
  delay({{p:off}});
}
`,
      },
      params: [
        { id: 'on', kind: 'number', label: 'lessons.blink.params.on.label', default: 500, min: 50, max: 2000, step: 50, unit: 'ms' },
        { id: 'off', kind: 'number', label: 'lessons.blink.params.off.label', default: 500, min: 50, max: 2000, step: 50, unit: 'ms' },
        { id: 'resistor', kind: 'choice', label: 'lessons.blink.params.resistor.label', default: '220', figure: { part: 'R1', key: 'ohms' },
          options: [
            { value: '220', code: '220 Ω', figureValue: 220, label: 'lessons.blink.params.resistor.220', note: 'lessons.blink.params.resistor.220-note' },
            { value: '1k', code: '1 kΩ', figureValue: 1000, label: 'lessons.blink.params.resistor.1k', note: 'lessons.blink.params.resistor.1k-note' },
            { value: '10k', code: '10 kΩ', figureValue: 10000, label: 'lessons.blink.params.resistor.10k', note: 'lessons.blink.params.resistor.10k-note' },
          ] },
      ],
      circuit: 'blink',
      world: { inputs: [], script: [] },
      serial: { baud: 9600, sample: [] },
      runMs: 6000,
      checks: [
        { kind: 'runs', minMs: 6000, label: 'lessons.blink.checks.1' },
        { kind: 'pin-toggles', pin: 'D13', periodMs: [100, 4000], minCycles: 1, label: 'lessons.blink.checks.2' },
        { kind: 'code', must: ['pinMode', 'digitalWrite', 'delay'], mustNot: [], label: 'lessons.blink.checks.3' },
      ],
      variants: [],
      pins: [
        { pin: 'D13', to: 'lessons.blink.pins.D13.to', role: 'lessons.blink.pins.D13.role', color: 'orange' },
        { pin: 'GND', to: 'lessons.blink.pins.GND.to', role: 'lessons.blink.pins.GND.role', color: 'black' },
      ],
      callouts: [
        { part: 'L', text: 'lessons.blink.callouts.L' },
        { part: 'R1', text: 'lessons.blink.callouts.R1' },
        { part: 'LED1', text: 'lessons.blink.callouts.LED1' },
      ],
      specs: [
        { label: 'lessons.blink.specs.1.label', value: 'lessons.blink.specs.1.value' },
        { label: 'lessons.blink.specs.2.label', value: 'lessons.blink.specs.2.value' },
        { label: 'lessons.blink.specs.3.label', value: 'lessons.blink.specs.3.value' },
        { label: 'lessons.blink.specs.4.label', value: 'lessons.blink.specs.4.value' },
      ],
      features: [
        { icon: 'board', text: 'lessons.blink.features.1' },
        { icon: 'tip', text: 'lessons.blink.features.2' },
        { icon: 'play', text: 'lessons.blink.features.3' },
      ],
      title: 'lessons.blink.title', lede: 'lessons.blink.lede',
      steps: ['lessons.blink.steps.1', 'lessons.blink.steps.2', 'lessons.blink.steps.3'],
      hints: ['lessons.blink.hints.1', 'lessons.blink.hints.2'],
      quiz: {
        id: 'blink', afterStep: null,
        questions: [
          { id: 'q1', q: 'lessons.blink.quiz.q1.q', options: ['lessons.blink.quiz.q1.options.1', 'lessons.blink.quiz.q1.options.2', 'lessons.blink.quiz.q1.options.3'], answer: 1, why: 'lessons.blink.quiz.q1.why' },
          { id: 'q2', q: 'lessons.blink.quiz.q2.q', options: ['lessons.blink.quiz.q2.options.1', 'lessons.blink.quiz.q2.options.2', 'lessons.blink.quiz.q2.options.3'], answer: 0, why: 'lessons.blink.quiz.q2.why' },
        ],
      },
    },
    {
      id: 'button-sensor', n: 2, level: 'input', language: 'arduino-cpp',
      code: {
        libraries: [],
        source: `// {{t:lessons.button-sensor.code.intro}}
const int BUTTON_PIN = 2;   // {{t:lessons.button-sensor.code.button}}
const int SENSOR_PIN = A0;  // {{t:lessons.button-sensor.code.sensor}}

void setup() {
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(LED_BUILTIN, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  bool pressed = digitalRead(BUTTON_PIN) == LOW;  // {{t:lessons.button-sensor.code.low}}
  digitalWrite(LED_BUILTIN, pressed ? HIGH : LOW);

  int raw = analogRead(SENSOR_PIN);  // 0..1023
  float volts = raw * (5.0 / 1023.0);
  Serial.print("A0=");
  Serial.print(raw);
  Serial.print(" (");
  Serial.print(volts, 2);
  Serial.print(" V) D2=");
  Serial.println(pressed ? "LOW" : "HIGH");
  delay({{p:period}});
}
`,
      },
      params: [
        { id: 'period', kind: 'number', label: 'lessons.button-sensor.params.period.label', default: 250, min: 50, max: 1000, step: 50, unit: 'ms' },
      ],
      circuit: 'button-sensor',
      world: {
        inputs: [
          { id: 'button', quantity: 'button', device: { kind: 'button', pull: 'internal-up', bounceMs: 5 }, pins: ['D2'], part: 'SW2',
            min: 0, max: 1, step: 1, default: 0, gesture: 'press', label: 'lessons.button-sensor.world.button' },
          { id: 'knob', quantity: 'angle-deg', device: { kind: 'pot', ohms: 10000 }, pins: ['A0'], part: 'RV1',
            min: 0, max: 300, step: 1, default: 150, unit: '°', gesture: 'knob', label: 'lessons.button-sensor.world.knob' },
        ],
        script: [
          { t: 0, input: 'knob', value: 150 },
          { t: 1200, input: 'button', value: 1 },
          { t: 2200, input: 'button', value: 0 },
          { t: 2600, input: 'knob', value: 300 },
        ],
      },
      serial: { baud: 9600, sample: ['A0=512 (2.50 V) D2=HIGH', 'A0=512 (2.50 V) D2=LOW', 'A0=1023 (5.00 V) D2=HIGH'] },
      runMs: 4000,
      checks: [
        { kind: 'runs', minMs: 4000, label: 'lessons.button-sensor.checks.1' },
        { kind: 'serial', match: 'A0=\\d+ \\(\\d\\.\\d\\d V\\) D2=HIGH', regex: true, minCount: 3, label: 'lessons.button-sensor.checks.2' },
        { kind: 'responds', after: { t: 1200, input: 'button', value: 1 }, pin: 'D13', withinMs: 1100, mode: 'out', v: [1, 1], label: 'lessons.button-sensor.checks.3' },
        { kind: 'serial', match: 'D2=LOW', regex: false, minCount: 1, byMs: 2300, label: 'lessons.button-sensor.checks.4' },
        { kind: 'serial', match: 'A0=10[0-2]\\d', regex: true, minCount: 1, label: 'lessons.button-sensor.checks.5' },
      ],
      variants: [],
      pins: [
        { pin: 'D2', to: 'lessons.button-sensor.pins.D2.to', role: 'lessons.button-sensor.pins.D2.role', color: 'blue' },
        { pin: 'A0', to: 'lessons.button-sensor.pins.A0.to', role: 'lessons.button-sensor.pins.A0.role', color: 'yellow' },
        { pin: '5V', to: 'lessons.button-sensor.pins.5V.to', role: 'lessons.button-sensor.pins.5V.role', color: 'red' },
        { pin: 'GND', to: 'lessons.button-sensor.pins.GND.to', role: 'lessons.button-sensor.pins.GND.role', color: 'black' },
      ],
      callouts: [
        { part: 'SW2', text: 'lessons.button-sensor.callouts.SW2' },
        { part: 'RV1', text: 'lessons.button-sensor.callouts.RV1' },
        { part: 'L', text: 'lessons.button-sensor.callouts.L' },
      ],
      specs: [
        { label: 'lessons.button-sensor.specs.1.label', value: 'lessons.button-sensor.specs.1.value' },
        { label: 'lessons.button-sensor.specs.2.label', value: 'lessons.button-sensor.specs.2.value' },
        { label: 'lessons.button-sensor.specs.3.label', value: 'lessons.button-sensor.specs.3.value' },
        { label: 'lessons.button-sensor.specs.4.label', value: 'lessons.button-sensor.specs.4.value' },
      ],
      features: [
        { icon: 'play', text: 'lessons.button-sensor.features.1' },
        { icon: 'board', text: 'lessons.button-sensor.features.2' },
        { icon: 'info', text: 'lessons.button-sensor.features.3' },
      ],
      title: 'lessons.button-sensor.title', lede: 'lessons.button-sensor.lede',
      steps: ['lessons.button-sensor.steps.1', 'lessons.button-sensor.steps.2', 'lessons.button-sensor.steps.3'],
      hints: ['lessons.button-sensor.hints.1', 'lessons.button-sensor.hints.2', 'lessons.button-sensor.hints.3'],
      quiz: {
        id: 'button-sensor', afterStep: null,
        questions: [
          { id: 'q1', q: 'lessons.button-sensor.quiz.q1.q', options: ['lessons.button-sensor.quiz.q1.options.1', 'lessons.button-sensor.quiz.q1.options.2', 'lessons.button-sensor.quiz.q1.options.3'], answer: 2, why: 'lessons.button-sensor.quiz.q1.why' },
          { id: 'q2', q: 'lessons.button-sensor.quiz.q2.q', options: ['lessons.button-sensor.quiz.q2.options.1', 'lessons.button-sensor.quiz.q2.options.2', 'lessons.button-sensor.quiz.q2.options.3'], answer: 1, why: 'lessons.button-sensor.quiz.q2.why' },
        ],
      },
    },
    {
      id: 'fade', n: 3, level: 'analog', language: 'arduino-cpp',
      code: {
        libraries: [],
        source: `// {{t:lessons.fade.code.intro}}
const int LED_PIN = 9;     // {{t:lessons.fade.code.pin}}
const int KNOB_PIN = A0;

void setup() {
  pinMode(LED_PIN, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  int raw = analogRead(KNOB_PIN);          // 0..1023
  int duty = map(raw, 0, 1023, 0, 255);    // {{t:lessons.fade.code.map}}
  analogWrite(LED_PIN, duty);
  Serial.print("raw=");
  Serial.print(raw);
  Serial.print(" duty=");
  Serial.println(duty);
  delay({{p:period}});
}
`,
      },
      params: [
        { id: 'period', kind: 'number', label: 'lessons.fade.params.period.label', default: 200, min: 20, max: 500, step: 10, unit: 'ms' },
      ],
      circuit: 'fade',
      world: {
        inputs: [
          { id: 'knob', quantity: 'angle-deg', device: { kind: 'pot', ohms: 10000 }, pins: ['A0'], part: 'RV1',
            min: 0, max: 300, step: 1, default: 75, unit: '°', gesture: 'knob', label: 'lessons.fade.world.knob' },
        ],
        script: [
          { t: 0, input: 'knob', value: 75 },
          { t: 1500, input: 'knob', value: 300 },
          { t: 3000, input: 'knob', value: 0 },
        ],
      },
      serial: { baud: 9600, sample: ['raw=256 duty=63', 'raw=1023 duty=255', 'raw=0 duty=0'] },
      runMs: 4500,
      checks: [
        { kind: 'runs', minMs: 4500, label: 'lessons.fade.checks.1' },
        { kind: 'pwm', pin: 'D9', duty: [.2, .3], atMs: 1000, label: 'lessons.fade.checks.2' },
        { kind: 'pwm', pin: 'D9', duty: [.95, 1], atMs: 2500, label: 'lessons.fade.checks.3' },
        { kind: 'serial', match: 'raw=0 duty=0', regex: false, minCount: 1, label: 'lessons.fade.checks.4' },
      ],
      variants: [],
      pins: [
        { pin: 'D9', to: 'lessons.fade.pins.D9.to', role: 'lessons.fade.pins.D9.role', color: 'orange' },
        { pin: 'A0', to: 'lessons.fade.pins.A0.to', role: 'lessons.fade.pins.A0.role', color: 'yellow' },
        { pin: '5V', to: 'lessons.fade.pins.5V.to', role: 'lessons.fade.pins.5V.role', color: 'red' },
        { pin: 'GND', to: 'lessons.fade.pins.GND.to', role: 'lessons.fade.pins.GND.role', color: 'black' },
      ],
      callouts: [
        { part: 'LED1', text: 'lessons.fade.callouts.LED1' },
        { part: 'RV1', text: 'lessons.fade.callouts.RV1' },
        { part: 'R1', text: 'lessons.fade.callouts.R1' },
      ],
      specs: [
        { label: 'lessons.fade.specs.1.label', value: 'lessons.fade.specs.1.value' },
        { label: 'lessons.fade.specs.2.label', value: 'lessons.fade.specs.2.value' },
        { label: 'lessons.fade.specs.3.label', value: 'lessons.fade.specs.3.value' },
      ],
      features: [
        { icon: 'play', text: 'lessons.fade.features.1' },
        { icon: 'tip', text: 'lessons.fade.features.2' },
        { icon: 'warn', text: 'lessons.fade.features.3' },
      ],
      title: 'lessons.fade.title', lede: 'lessons.fade.lede',
      steps: ['lessons.fade.steps.1', 'lessons.fade.steps.2', 'lessons.fade.steps.3'],
      hints: ['lessons.fade.hints.1', 'lessons.fade.hints.2'],
      quiz: {
        id: 'fade', afterStep: null,
        questions: [
          { id: 'q1', q: 'lessons.fade.quiz.q1.q', options: ['lessons.fade.quiz.q1.options.1', 'lessons.fade.quiz.q1.options.2', 'lessons.fade.quiz.q1.options.3'], answer: 0, why: 'lessons.fade.quiz.q1.why' },
          { id: 'q2', q: 'lessons.fade.quiz.q2.q', options: ['lessons.fade.quiz.q2.options.1', 'lessons.fade.quiz.q2.options.2', 'lessons.fade.quiz.q2.options.3'], answer: 2, why: 'lessons.fade.quiz.q2.why' },
        ],
      },
    },
    {
      id: 'i2c', n: 4, level: 'protocol', language: 'arduino-cpp',
      code: {
        libraries: ['Wire'],
        source: `// {{t:lessons.i2c.code.intro}}
#include <Wire.h>

const byte MPU_ADDR = 0x68;   // {{t:lessons.i2c.code.addr}}
const byte WHO_AM_I = 0x75;

void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
  Serial.begin(9600);
  Wire.begin();               // A4 = SDA, A5 = SCL
  byte found = 0;
  for (byte addr = 1; addr < 127; addr++) {
    Wire.beginTransmission(addr);
    if (Wire.endTransmission() == 0) {
      Serial.print("Found device at 0x");
      Serial.println(addr, HEX);
      found++;
    }
  }
  Serial.print("Devices: ");
  Serial.println(found);

  Wire.beginTransmission(MPU_ADDR);
  Wire.write(WHO_AM_I);
  Wire.endTransmission(false);  // {{t:lessons.i2c.code.restart}}
  Wire.requestFrom(MPU_ADDR, (byte)1);
  if (Wire.available()) {
    Serial.print("WHO_AM_I = 0x");
    Serial.println(Wire.read(), HEX);
  }
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);  // {{t:lessons.i2c.code.alive}}
  delay({{p:blink}});
  digitalWrite(LED_BUILTIN, LOW);
  delay({{p:blink}});
}
`,
      },
      params: [
        { id: 'blink', kind: 'number', label: 'lessons.i2c.params.blink.label', default: 500, min: 100, max: 1000, step: 100, unit: 'ms' },
      ],
      circuit: 'i2c',
      world: {
        inputs: [
          { id: 'imu', quantity: 'tilt-deg', device: { kind: 'mpu6050', address: 0x68 }, pins: ['A4', 'A5'], part: 'M1',
            min: -90, max: 90, step: 1, default: 0, unit: '°', gesture: 'tilt', label: 'lessons.i2c.world.imu' },
        ],
        script: [],
      },
      serial: { baud: 9600, sample: ['Found device at 0x68', 'Devices: 1', 'WHO_AM_I = 0x68'] },
      runMs: 3000,
      checks: [
        { kind: 'runs', minMs: 3000, label: 'lessons.i2c.checks.1' },
        { kind: 'serial', match: 'Found device at 0x68', regex: false, minCount: 1, label: 'lessons.i2c.checks.2' },
        { kind: 'serial', match: 'WHO_AM_I = 0x68', regex: false, minCount: 1, label: 'lessons.i2c.checks.3' },
        { kind: 'code', must: ['Wire.begin', 'Wire.beginTransmission', 'Wire.endTransmission'], mustNot: [], label: 'lessons.i2c.checks.4' },
      ],
      variants: [],
      pins: [
        { pin: 'A4', to: 'lessons.i2c.pins.A4.to', role: 'lessons.i2c.pins.A4.role', color: 'blue' },
        { pin: 'A5', to: 'lessons.i2c.pins.A5.to', role: 'lessons.i2c.pins.A5.role', color: 'yellow' },
        { pin: '5V', to: 'lessons.i2c.pins.5V.to', role: 'lessons.i2c.pins.5V.role', color: 'red' },
        { pin: 'GND', to: 'lessons.i2c.pins.GND.to', role: 'lessons.i2c.pins.GND.role', color: 'black' },
      ],
      callouts: [
        { part: 'M1', text: 'lessons.i2c.callouts.M1' },
        { part: 'IC3', text: 'lessons.i2c.callouts.IC3' },
      ],
      specs: [
        { label: 'lessons.i2c.specs.1.label', value: 'lessons.i2c.specs.1.value' },
        { label: 'lessons.i2c.specs.2.label', value: 'lessons.i2c.specs.2.value' },
        { label: 'lessons.i2c.specs.3.label', value: 'lessons.i2c.specs.3.value' },
        { label: 'lessons.i2c.specs.4.label', value: 'lessons.i2c.specs.4.value' },
      ],
      features: [
        { icon: 'play', text: 'lessons.i2c.features.1' },
        { icon: 'board', text: 'lessons.i2c.features.2' },
        { icon: 'tip', text: 'lessons.i2c.features.3' },
      ],
      title: 'lessons.i2c.title', lede: 'lessons.i2c.lede',
      steps: ['lessons.i2c.steps.1', 'lessons.i2c.steps.2', 'lessons.i2c.steps.3'],
      hints: ['lessons.i2c.hints.1', 'lessons.i2c.hints.2', 'lessons.i2c.hints.3'],
      quiz: {
        id: 'i2c', afterStep: null,
        questions: [
          { id: 'q1', q: 'lessons.i2c.quiz.q1.q', options: ['lessons.i2c.quiz.q1.options.1', 'lessons.i2c.quiz.q1.options.2', 'lessons.i2c.quiz.q1.options.3'], answer: 1, why: 'lessons.i2c.quiz.q1.why' },
          { id: 'q2', q: 'lessons.i2c.quiz.q2.q', options: ['lessons.i2c.quiz.q2.options.1', 'lessons.i2c.quiz.q2.options.2', 'lessons.i2c.quiz.q2.options.3'], answer: 0, why: 'lessons.i2c.quiz.q2.why' },
        ],
      },
    },
  ],
  serial: { baud: 9600, sample: ['Nano ready', 'hello from the Nano #0', 'hello from the Nano #1'] },
  sources: [
    { title: 'Arduino Nano user manual / datasheet (A000005)', url: 'https://docs.arduino.cc/resources/datasheets/A000005-datasheet.pdf' },
    { title: 'Arduino Nano product page and tech specs', url: 'https://docs.arduino.cc/hardware/nano/' },
    { title: 'Arduino Nano CAD files (NanoV3.3 Eagle board and schematic)', url: 'https://docs.arduino.cc/static/e3c4fe1f9bee7ec63df398422b3257f4/A000005-cad-files.zip' },
    { title: 'Arduino Nano schematic (PDF)', url: 'https://docs.arduino.cc/resources/schematics/A000005-schematics.pdf' },
    { title: 'Arduino Nano full pinout (PDF)', url: 'https://docs.arduino.cc/resources/pinouts/A000005-full-pinout.pdf' },
    { title: 'Microchip ATmega328P datasheet (DS40002061)', url: 'https://www.microchip.com/en-us/product/ATmega328P' },
    { title: 'FTDI FT232R datasheet', url: 'https://ftdichip.com/products/ft232rl/' },
    { title: 'Texas Instruments LM1117 datasheet', url: 'https://www.ti.com/lit/ds/symlink/lm1117.pdf' },
    { title: 'Bourns MF-FSMF polyfuse datasheet', url: 'https://www.bourns.com/docs/Product-Datasheets/mffsmf.pdf' },
    { title: 'ArduinoCore-avr boards.txt (nano entries)', url: 'https://github.com/arduino/ArduinoCore-avr/blob/master/boards.txt' },
  ],
  title: 'title',
  tagline: 'tagline',
  overview: 'overview',
};

export default nano;
