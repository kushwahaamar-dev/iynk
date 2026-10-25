// Espressif ESP32-S3-DevKitC-1 v1.1 (default) and v1.0. Facts: docs/facts/esp32-s3-devkitc-1.md (Espressif's user
// guide, schematic, PADS design file and the module datasheets). Figure: figures/boards/esp32-s3-devkitc-1.js; part
// ids, nets, control ids, fault ids and circuit keys here are the figure's.
import type { BoardContent, PinCap, PinRow } from '@/content/schema';

const IO: PinCap[] = ['digital', 'pwm', 'interrupt'];
const gpio = (header: 'J1' | 'J3', pin: number, label: string, n: number, functions: string[], caps: PinCap[], note?: string): PinRow => ({
  header, pin: String(pin), label, functions, caps: [...IO, ...caps], volts: 3.3, fiveVoltTolerant: false, maxCurrentMa: 20,
  net: `GPIO${n}`, ...(note ? { note } : {}),
});
const power = (header: 'J1' | 'J3', pin: number, label: string, net: string, volts: number | null, note?: string): PinRow => ({
  header, pin: String(pin), label, functions: [], caps: [volts === null ? 'gnd' : 'power'], volts, net, ...(note ? { note } : {}),
});
// GPIO35-37 are wired to the octal PSRAM inside the N8R8 module: printed on the header, not usable
const psram = (pin: number, n: number, functions: string[]): PinRow => ({
  header: 'J3', pin: String(pin), label: String(n), functions, caps: [], volts: 3.3, fiveVoltTolerant: false, net: `GPIO${n}`, note: `pins.j3.${pin}`,
});

const pinout: PinRow[] = [
  power('J1', 1, '3V3', '3V3', 3.3, 'pins.j1.1'),
  power('J1', 2, '3V3', '3V3', 3.3),
  { header: 'J1', pin: '3', label: 'RST', functions: ['CHIP_PU', 'EN'], caps: ['reset'], volts: 3.3, fiveVoltTolerant: false, net: 'EN', note: 'pins.j1.3' },
  gpio('J1', 4, '4', 4, ['RTC_GPIO4', 'TOUCH4', 'ADC1_CH3'], ['analog-in', 'touch'], 'pins.j1.4'),
  gpio('J1', 5, '5', 5, ['RTC_GPIO5', 'TOUCH5', 'ADC1_CH4'], ['analog-in', 'touch']),
  gpio('J1', 6, '6', 6, ['RTC_GPIO6', 'TOUCH6', 'ADC1_CH5'], ['analog-in', 'touch']),
  gpio('J1', 7, '7', 7, ['RTC_GPIO7', 'TOUCH7', 'ADC1_CH6'], ['analog-in', 'touch']),
  gpio('J1', 8, '15', 15, ['RTC_GPIO15', 'U0RTS', 'ADC2_CH4', 'XTAL_32K_P'], ['analog-in', 'uart']),
  gpio('J1', 9, '16', 16, ['RTC_GPIO16', 'U0CTS', 'ADC2_CH5', 'XTAL_32K_N'], ['analog-in', 'uart']),
  gpio('J1', 10, '17', 17, ['RTC_GPIO17', 'U1TXD', 'ADC2_CH6'], ['analog-in', 'uart']),
  gpio('J1', 11, '18', 18, ['RTC_GPIO18', 'U1RXD', 'ADC2_CH7', 'CLK_OUT3'], ['analog-in', 'uart']),
  gpio('J1', 12, '8', 8, ['RTC_GPIO8', 'TOUCH8', 'ADC1_CH7', 'SUBSPICS1', 'I2C SDA (Arduino default)'], ['analog-in', 'touch', 'i2c'], 'pins.j1.12'),
  gpio('J1', 13, '3', 3, ['RTC_GPIO3', 'TOUCH3', 'ADC1_CH2'], ['analog-in', 'touch', 'strapping'], 'pins.j1.13'),
  gpio('J1', 14, '46', 46, ['GPIO46'], ['strapping'], 'pins.j1.14'),
  gpio('J1', 15, '9', 9, ['RTC_GPIO9', 'TOUCH9', 'ADC1_CH8', 'FSPIHD', 'SUBSPIHD', 'I2C SCL (Arduino default)'], ['analog-in', 'touch', 'i2c', 'spi']),
  gpio('J1', 16, '10', 10, ['RTC_GPIO10', 'TOUCH10', 'ADC1_CH9', 'FSPICS0', 'FSPIIO4', 'SUBSPICS0', 'SPI SS (Arduino default)'], ['analog-in', 'touch', 'spi']),
  gpio('J1', 17, '11', 11, ['RTC_GPIO11', 'TOUCH11', 'ADC2_CH0', 'FSPID', 'FSPIIO5', 'SUBSPID', 'SPI MOSI (Arduino default)'], ['analog-in', 'touch', 'spi']),
  gpio('J1', 18, '12', 12, ['RTC_GPIO12', 'TOUCH12', 'ADC2_CH1', 'FSPICLK', 'FSPIIO6', 'SUBSPICLK', 'SPI SCK (Arduino default)'], ['analog-in', 'touch', 'spi']),
  gpio('J1', 19, '13', 13, ['RTC_GPIO13', 'TOUCH13', 'ADC2_CH2', 'FSPIQ', 'FSPIIO7', 'SUBSPIQ', 'SPI MISO (Arduino default)'], ['analog-in', 'touch', 'spi']),
  gpio('J1', 20, '14', 14, ['RTC_GPIO14', 'TOUCH14', 'ADC2_CH3', 'FSPIWP', 'FSPIDQS', 'SUBSPIWP'], ['analog-in', 'touch', 'spi']),
  power('J1', 21, '5V', '5V', 5, 'pins.j1.21'),
  power('J1', 22, 'G', 'GND', null),
  power('J3', 1, 'G', 'GND', null),
  { header: 'J3', pin: '2', label: 'TX', functions: ['U0TXD', 'CLK_OUT1'], caps: ['digital', 'uart'], volts: 3.3, fiveVoltTolerant: false, maxCurrentMa: 20, net: 'GPIO43', note: 'pins.j3.2' },
  { header: 'J3', pin: '3', label: 'RX', functions: ['U0RXD', 'CLK_OUT2'], caps: ['digital', 'uart'], volts: 3.3, fiveVoltTolerant: false, maxCurrentMa: 20, net: 'GPIO44', note: 'pins.j3.3' },
  gpio('J3', 4, '1', 1, ['RTC_GPIO1', 'TOUCH1', 'ADC1_CH0'], ['analog-in', 'touch']),
  gpio('J3', 5, '2', 2, ['RTC_GPIO2', 'TOUCH2', 'ADC1_CH1'], ['analog-in', 'touch']),
  gpio('J3', 6, '42', 42, ['MTMS'], ['jtag']),
  gpio('J3', 7, '41', 41, ['MTDI', 'CLK_OUT1'], ['jtag']),
  gpio('J3', 8, '40', 40, ['MTDO', 'CLK_OUT2'], ['jtag']),
  gpio('J3', 9, '39', 39, ['MTCK', 'CLK_OUT3', 'SUBSPICS1'], ['jtag']),
  gpio('J3', 10, '38', 38, ['FSPIWP', 'SUBSPIWP', 'RGB LED data (v1.1)'], ['led'], 'pins.j3.10'),
  psram(11, 37, ['SPIDQS', 'FSPIQ', 'SUBSPIQ']),
  psram(12, 36, ['SPIIO7', 'FSPICLK', 'SUBSPICLK']),
  psram(13, 35, ['SPIIO6', 'FSPID', 'SUBSPID']),
  gpio('J3', 14, '0', 0, ['RTC_GPIO0', 'BOOT button'], ['strapping'], 'pins.j3.14'),
  gpio('J3', 15, '45', 45, ['GPIO45'], ['strapping'], 'pins.j3.15'),
  gpio('J3', 16, '48', 48, ['SPICLK_N', 'SUBSPICLK_N_DIFF', 'RGB LED data (v1.0)'], [], 'pins.j3.16'),
  gpio('J3', 17, '47', 47, ['SPICLK_P', 'SUBSPICLK_P_DIFF'], [], 'pins.j3.17'),
  gpio('J3', 18, '21', 21, ['RTC_GPIO21'], []),
  gpio('J3', 19, '20', 20, ['RTC_GPIO20', 'U1CTS', 'ADC2_CH9', 'CLK_OUT1', 'USB_D+'], ['analog-in', 'usb'], 'pins.j3.19'),
  gpio('J3', 20, '19', 19, ['RTC_GPIO19', 'U1RTS', 'ADC2_CH8', 'CLK_OUT2', 'USB_D-'], ['analog-in', 'usb'], 'pins.j3.20'),
  power('J3', 21, 'G', 'GND', null),
  power('J3', 22, 'G', 'GND', null),
];

// Annotated rather than `satisfies`: the mixed assembly steps would otherwise widen to optional-undefined fields
// that StateCond's index signature rejects when the registry loads the module as BoardContent.
const board: BoardContent = {
  lab: 'board',
  id: 'esp32-s3-devkitc-1',
  maker: 'Espressif',
  title: 'title',
  tagline: 'tagline',
  overview: 'overview',

  variants: [
    { id: 'v1.1', name: 'ESP32-S3-DevKitC-1 v1.1', note: 'variants.v1-1', figureVariant: 'v1.1' },
    {
      id: 'v1.0', name: 'ESP32-S3-DevKitC-1 v1.0', note: 'variants.v1-0', figureVariant: 'v1.0',
      leds: [
        { id: 'D5', label: 'D5', color: 'red', drivenBy: 'power', activeLow: false, note: 'leds.D5' },
        { id: 'D6', label: 'RGB@IO48', color: 'rgb', drivenBy: 'GPIO48', activeLow: false, note: 'leds.D6-v1-0' },
      ],
      pinPatch: [
        gpio('J3', 10, '38', 38, ['FSPIWP', 'SUBSPIWP'], []),
        gpio('J3', 16, '48', 48, ['SPICLK_N', 'SUBSPICLK_N_DIFF', 'RGB LED data (v1.0)'], ['led'], 'pins.j3.16'),
      ],
    },
  ],

  mcu: {
    part: 'ESP32-S3-WROOM-1-N8R8',
    core: 'Xtensa LX7 dual-core',
    cores: 2,
    clockHz: 240_000_000,
    flashBytes: 8 * 1024 * 1024,
    ramBytes: 512 * 1024,
    target: 'esp32-s3',
    adcBits: 12,
    wireless: ['wifi', 'ble'],
    companions: [{ part: 'CP2102N-A02-GQFN28', role: 'mcu.cp2102n' }],
  },
  logicVolts: 3.3,

  power: {
    inputs: [
      { id: 'uart', connector: 'micro-usb', part: 'J2', volts: { min: 4.75, max: 5.25 }, maxCurrentMa: 500, reverseProtected: true, protection: 'power.uart.protection' },
      { id: 'usb', connector: 'micro-usb', part: 'J4', volts: { min: 4.75, max: 5.25 }, maxCurrentMa: 500, reverseProtected: true, protection: 'power.usb.protection' },
      { id: 'pin5', connector: 'header-pin', part: 'J1', volts: { min: 3.75, max: 20, recommended: [4.75, 5.25] }, maxCurrentMa: 800, reverseProtected: false, protection: 'power.pin5.protection' },
      { id: 'pin3', connector: 'header-pin', part: 'J1', volts: { min: 3.0, max: 3.6, recommended: [3.3, 3.3] }, reverseProtected: false, protection: 'power.pin3.protection' },
    ],
    rails: [
      { name: '5V', volts: 4.65, from: 'D1', note: 'power.rails.5v' },
      { name: 'VCC_3V3', volts: 3.3, maxCurrentMa: 800, from: 'U2', note: 'power.rails.vcc-3v3' },
      { name: '3V3', volts: 3.3, maxCurrentMa: 800, from: 'R24', note: 'power.rails.3v3' },
    ],
    io: { perPinMa: 20, absMaxPerPinMa: 40, totalMa: 1500, note: 'power.io' },
    brownoutVolts: 2.7,
    idleMa: 50,
  },

  pinout,

  leds: [
    { id: 'D5', label: 'D5', color: 'red', drivenBy: 'power', activeLow: false, note: 'leds.D5' },
    { id: 'D6', label: 'RGB@IO38', color: 'rgb', drivenBy: 'GPIO38', activeLow: false, note: 'leds.D6' },
  ],
  controls: [
    { id: 'SW1', label: 'BOOT', kind: 'boot', pin: 'GPIO0', activeLow: true, act: 'ctl-sw1', effect: 'controls.SW1' },
    { id: 'SW2', label: 'RESET', kind: 'reset', pin: 'EN', activeLow: true, act: 'ctl-sw2', effect: 'controls.SW2' },
  ],
  displays: [],

  figure: {
    page: '/figures/boards/esp32-s3-devkitc-1.html',
    sheets: ['board', 'breadboard', 'schematic', 'power'],
    parts: [
      { id: 'U4', short: 'ESP32-S3 MODULE', role: 'soc', name: 'parts.U4.name', what: 'parts.U4.what' },
      { id: 'U3', short: 'USB-UART', role: 'usb-bridge', name: 'parts.U3.name', what: 'parts.U3.what' },
      { id: 'U2', short: '3V3 LDO', role: 'regulator', name: 'parts.U2.name', what: 'parts.U2.what' },
      { id: 'D6', short: 'RGB LED', role: 'led', name: 'parts.D6.name', what: 'parts.D6.what' },
      { id: 'D5', short: 'POWER LED', role: 'led', name: 'parts.D5.name', what: 'parts.D5.what' },
      { id: 'SW1', short: 'BOOT', role: 'button', name: 'parts.SW1.name', what: 'parts.SW1.what' },
      { id: 'SW2', short: 'RESET', role: 'button', name: 'parts.SW2.name', what: 'parts.SW2.what' },
      { id: 'J2', short: 'UART PORT', role: 'connector', name: 'parts.J2.name', what: 'parts.J2.what' },
      { id: 'J4', short: 'USB PORT', role: 'connector', name: 'parts.J4.name', what: 'parts.J4.what' },
      { id: 'J1', short: 'J1', role: 'header', name: 'parts.J1.name', what: 'parts.J1.what' },
      { id: 'J3', short: 'J3', role: 'header', name: 'parts.J3.name', what: 'parts.J3.what' },
      { id: 'Q1', short: 'Q1', role: 'other', name: 'parts.Q1.name', what: 'parts.Q1.what' },
      { id: 'Q2', short: 'Q2', role: 'other', name: 'parts.Q2.name', what: 'parts.Q2.what' },
      { id: 'D1', short: 'D1', role: 'protection', name: 'parts.D1.name', what: 'parts.D1.what' },
      { id: 'D7', short: 'D7', role: 'protection', name: 'parts.D7.name', what: 'parts.D7.what' },
      { id: 'D2', short: 'D2', role: 'protection', name: 'parts.D2.name', what: 'parts.esd.what' },
      { id: 'D3', short: 'D3', role: 'protection', name: 'parts.D3.name', what: 'parts.esd.what' },
      { id: 'D4', short: 'D4', role: 'protection', name: 'parts.D4.name', what: 'parts.esd.what' },
      { id: 'D8', short: 'D8', role: 'protection', name: 'parts.D8.name', what: 'parts.esd.what' },
      { id: 'D9', short: 'D9', role: 'protection', name: 'parts.D9.name', what: 'parts.esd.what' },
      { id: 'D10', short: 'D10', role: 'protection', name: 'parts.D10.name', what: 'parts.esd.what' },
      { id: 'C3', short: 'C3', role: 'passive', name: 'parts.C3.name', what: 'parts.C3.what' },
      { id: 'C7', short: 'C7', role: 'passive', name: 'parts.C7.name', what: 'parts.ldo-caps.what' },
      { id: 'C8', short: 'C8', role: 'passive', name: 'parts.C8.name', what: 'parts.ldo-caps.what' },
      { id: 'C9', short: 'C9', role: 'passive', name: 'parts.C9.name', what: 'parts.ldo-caps.what' },
      { id: 'C10', short: 'C10', role: 'passive', name: 'parts.C10.name', what: 'parts.ldo-caps.what' },
      { id: 'C1', short: 'C1', role: 'passive', name: 'parts.C1.name', what: 'parts.C1.what' },
      { id: 'C2', short: 'C2', role: 'passive', name: 'parts.C2.name', what: 'parts.C2.what' },
      { id: 'R24', short: 'R24', role: 'passive', name: 'parts.R24.name', what: 'parts.R24.what' },
      { id: 'R5', short: 'R5', role: 'passive', name: 'parts.R5.name', what: 'parts.R5.what' },
      { id: 'C6', short: 'C6', role: 'passive', name: 'parts.C6.name', what: 'parts.C6.what' },
      { id: 'R11', short: 'R11', role: 'passive', name: 'parts.R11.name', what: 'parts.R11.what' },
      { id: 'R17', short: 'R17', role: 'passive', name: 'parts.R17.name', what: 'parts.R17.what' },
      { id: 'R8', short: 'R8', role: 'passive', name: 'parts.R8.name', what: 'parts.autoprog.what' },
      { id: 'R13', short: 'R13', role: 'passive', name: 'parts.R13.name', what: 'parts.autoprog.what' },
      { id: 'R10', short: 'R10', role: 'passive', name: 'parts.R10.name', what: 'parts.autoprog.what' },
      { id: 'R12', short: 'R12', role: 'passive', name: 'parts.R12.name', what: 'parts.autoprog.what' },
      { id: 'R7', short: 'R7', role: 'passive', name: 'parts.R7.name', what: 'parts.uart-links.what' },
      { id: 'R9', short: 'R9', role: 'passive', name: 'parts.R9.name', what: 'parts.uart-links.what' },
      { id: 'R19', short: 'R19', role: 'passive', name: 'parts.R19.name', what: 'parts.vbus-sense.what' },
      { id: 'R18', short: 'R18', role: 'passive', name: 'parts.R18.name', what: 'parts.vbus-sense.what' },
      { id: 'C12', short: 'C12', role: 'passive', name: 'parts.C12.name', what: 'parts.vbus-sense.what' },
      { id: 'R16', short: 'R16', role: 'passive', name: 'parts.R16.name', what: 'parts.R16.what' },
      { id: 'C11', short: 'C11', role: 'passive', name: 'parts.C11.name', what: 'parts.C11.what' },
    ],
  },

  wireables: [
    { part: 'led', supplyVolts: 3.3, note: 'wireables.led.note',
      connections: [{ from: 'A (through 330 Ω)', to: '4', color: 'orange' }, { from: 'K', to: 'G', color: 'black' }] },
    { part: 'push-button', supplyVolts: 3.3, note: 'wireables.push-button.note',
      connections: [{ from: '1', to: '5', color: 'yellow' }, { from: '2', to: 'G', color: 'black' }] },
    { part: 'potentiometer', supplyVolts: 3.3, note: 'wireables.potentiometer.note', caution: 'wireables.potentiometer.caution',
      connections: [{ from: '1', to: '3V3', color: 'red' }, { from: 'wiper', to: '1', color: 'green' }, { from: '3', to: 'G', color: 'black' }] },
    { part: 'ldr', supplyVolts: 3.3, note: 'wireables.ldr.note',
      connections: [{ from: 'LDR leg 1', to: '3V3', color: 'red' }, { from: 'LDR leg 2 + 10 kΩ to G', to: '2', color: 'green' }, { from: '10 kΩ', to: 'G', color: 'black' }] },
    { part: 'servo-sg90', supplyVolts: 5, note: 'wireables.servo-sg90.note', caution: 'wireables.servo-sg90.caution',
      connections: [{ from: 'brown (GND)', to: 'G', color: 'brown' }, { from: 'red (V+)', to: '5V', color: 'red' }, { from: 'orange (signal)', to: '18', color: 'orange' }] },
    { part: 'hc-sr04', supplyVolts: 5, note: 'wireables.hc-sr04.note', caution: 'wireables.hc-sr04.caution',
      connections: [{ from: 'VCC', to: '5V', color: 'red' }, { from: 'TRIG', to: '5', color: 'yellow' }, { from: 'ECHO (through 1 kΩ / 2 kΩ divider)', to: '6', color: 'green' }, { from: 'GND', to: 'G', color: 'black' }] },
    { part: 'mpu6050', supplyVolts: 3.3, note: 'wireables.mpu6050.note',
      connections: [{ from: 'VCC', to: '3V3', color: 'red' }, { from: 'GND', to: 'G', color: 'black' }, { from: 'SDA', to: '8', color: 'blue' }, { from: 'SCL', to: '9', color: 'yellow' }] },
    { part: 'ssd1306', supplyVolts: 3.3, note: 'wireables.ssd1306.note',
      connections: [{ from: 'VCC', to: '3V3', color: 'red' }, { from: 'GND', to: 'G', color: 'black' }, { from: 'SDA', to: '8', color: 'blue' }, { from: 'SCL', to: '9', color: 'yellow' }] },
    { part: 'piezo-buzzer', supplyVolts: 3.3, note: 'wireables.piezo-buzzer.note',
      connections: [{ from: '+', to: '7', color: 'orange' }, { from: '−', to: 'G', color: 'black' }] },
    { part: 'tmp36', supplyVolts: 3.3, note: 'wireables.tmp36.note',
      connections: [{ from: '+Vs', to: '3V3', color: 'red' }, { from: 'Vout', to: '1', color: 'green' }, { from: 'GND', to: 'G', color: 'black' }] },
  ],

  failures: [
    { id: 'reverse-pin5', kind: 'reverse-polarity', trigger: { by: 'reverse', input: 'pin5' },
      figure: { type: 'set', state: { power: 'pin5', fault: 'reverse-polarity:pin5' } },
      effect: { power: 'off', halts: true, damages: ['U2'] },
      title: 'failures.reverse-pin5.title', symptom: 'failures.reverse-pin5.symptom', explanation: 'failures.reverse-pin5.explanation', fix: 'failures.reverse-pin5.fix' },
    { id: 'reverse-pin3', kind: 'reverse-polarity', trigger: { by: 'reverse', input: 'pin3' },
      figure: { type: 'set', state: { power: 'pin3', fault: 'reverse-polarity:pin3' } },
      effect: { power: 'off', halts: true, damages: ['U4'] },
      title: 'failures.reverse-pin3.title', symptom: 'failures.reverse-pin3.symptom', explanation: 'failures.reverse-pin3.explanation', fix: 'failures.reverse-pin3.fix' },
    { id: 'five-volts-on-3v3', kind: 'wrong-voltage', trigger: { by: 'power-input', input: 'pin3', volts: 5 },
      figure: { type: 'set', state: { power: 'pin3', fault: 'wrong-voltage:pin3:5' } },
      effect: { power: 'off', halts: true, damages: ['U4'] },
      title: 'failures.five-volts-on-3v3.title', symptom: 'failures.five-volts-on-3v3.symptom', explanation: 'failures.five-volts-on-3v3.explanation', fix: 'failures.five-volts-on-3v3.fix' },
    { id: 'overvoltage-pin5', kind: 'wrong-voltage', trigger: { by: 'power-input', input: 'pin5', volts: 24 },
      figure: { type: 'set', state: { power: 'pin5', fault: 'wrong-voltage:pin5:24' } },
      effect: { power: 'off', halts: true, damages: ['U2'] },
      title: 'failures.overvoltage-pin5.title', symptom: 'failures.overvoltage-pin5.symptom', explanation: 'failures.overvoltage-pin5.explanation', fix: 'failures.overvoltage-pin5.fix' },
    { id: 'brownout', kind: 'brownout', trigger: { by: 'load', rail: '5V', ma: 650, part: 'tt-motor' },
      figure: { type: 'set', state: { fault: 'brownout' } },
      effect: { power: 'resetting', halts: true, serial: ['Brownout detector was triggered', 'ESP-ROM:esp32s3-20210327'] },
      title: 'failures.brownout.title', symptom: 'failures.brownout.symptom', explanation: 'failures.brownout.explanation', fix: 'failures.brownout.fix' },
    { id: 'low-voltage-pin5', kind: 'brownout', trigger: { by: 'power-input', input: 'pin5', volts: 3 },
      figure: { type: 'set', state: { power: 'pin5', fault: 'wrong-voltage:pin5:3' } },
      effect: { power: 'resetting', halts: true },
      title: 'failures.low-voltage-pin5.title', symptom: 'failures.low-voltage-pin5.symptom', explanation: 'failures.low-voltage-pin5.explanation', fix: 'failures.low-voltage-pin5.fix' },
    { id: 'cold-gpio4', kind: 'cold-solder', trigger: { by: 'cold-joint', part: 'J1', pin: 'J1.4' },
      figure: { type: 'set', state: { fault: 'cold:J1.4' } },
      effect: { power: 'on', halts: false, pins: { GPIO4: 'noisy' } },
      title: 'failures.cold-gpio4.title', symptom: 'failures.cold-gpio4.symptom', explanation: 'failures.cold-gpio4.explanation', fix: 'failures.cold-gpio4.fix' },
    { id: 'cold-usb', kind: 'cold-solder', trigger: { by: 'cold-joint', part: 'J2' },
      figure: { type: 'set', state: { fault: 'cold:J2' } },
      effect: { power: 'resetting', halts: true },
      title: 'failures.cold-usb.title', symptom: 'failures.cold-usb.symptom', explanation: 'failures.cold-usb.explanation', fix: 'failures.cold-usb.fix' },
    { id: 'missing-r17', kind: 'missing-part', trigger: { by: 'remove-part', part: 'R17' },
      figure: { type: 'set', state: { remove: 'R17' } },
      effect: { power: 'on', halts: false },
      title: 'failures.missing-r17.title', symptom: 'failures.missing-r17.symptom', explanation: 'failures.missing-r17.explanation', fix: 'failures.missing-r17.fix' },
    { id: 'missing-r24', kind: 'missing-part', trigger: { by: 'remove-part', part: 'R24' },
      figure: { type: 'set', state: { remove: 'R24' } },
      effect: { power: 'off', halts: true },
      title: 'failures.missing-r24.title', symptom: 'failures.missing-r24.symptom', explanation: 'failures.missing-r24.explanation', fix: 'failures.missing-r24.fix' },
    { id: 'missing-u3', kind: 'missing-part', trigger: { by: 'remove-part', part: 'U3' },
      figure: { type: 'set', state: { remove: 'U3' } },
      effect: { power: 'on', halts: false },
      title: 'failures.missing-u3.title', symptom: 'failures.missing-u3.symptom', explanation: 'failures.missing-u3.explanation', fix: 'failures.missing-u3.fix' },
    { id: 'strap-gpio0', kind: 'boot-strap', trigger: { by: 'control', control: 'SW1', during: 'boot' },
      figure: { type: 'set', state: { fault: 'strap:GPIO0' } },
      effect: { power: 'on', halts: true, serial: ['rst:0x1 (POWERON),boot:0x0 (DOWNLOAD(USB/UART0))', 'waiting for download'] },
      title: 'failures.strap-gpio0.title', symptom: 'failures.strap-gpio0.symptom', explanation: 'failures.strap-gpio0.explanation', fix: 'failures.strap-gpio0.fix' },
    { id: 'five-volts-on-gpio', kind: 'level-mismatch', trigger: { by: 'wiring', part: 'hc-sr04', from: 'ECHO', to: 'GPIO4' },
      figure: { type: 'set', state: { fault: 'gpio5v:GPIO4' } },
      effect: { power: 'on', halts: false, pins: { GPIO4: 'dead' }, damages: ['U4'] },
      title: 'failures.five-volts-on-gpio.title', symptom: 'failures.five-volts-on-gpio.symptom', explanation: 'failures.five-volts-on-gpio.explanation', fix: 'failures.five-volts-on-gpio.fix' },
    { id: 'short-5v', kind: 'short', trigger: { by: 'short', nets: ['5V', 'GND'] },
      figure: { type: 'set', state: { fault: 'short:5V:GND' } },
      effect: { power: 'off', halts: true },
      title: 'failures.short-5v.title', symptom: 'failures.short-5v.symptom', explanation: 'failures.short-5v.explanation', fix: 'failures.short-5v.fix' },
  ],

  assembly: [
    { id: 'strip', kind: 'build', action: { type: 'press', id: 'strip' }, done: { build: 'bare' }, major: false,
      title: 'assembly.strip.title', body: 'assembly.strip.body', refusal: 'assembly.strip.refusal' },
    { id: 'pick-place', kind: 'build', action: { type: 'press', id: 'pnp' }, done: { build: 'reflowed' }, major: false,
      title: 'assembly.pick-place.title', body: 'assembly.pick-place.body', refusal: 'assembly.pick-place.refusal' },
    { id: 'first-power', kind: 'test', action: { type: 'press', id: 'power', choice: 'uart' }, done: { status: 'running', 'rails.3V3': 3.3 }, major: false,
      title: 'assembly.first-power.title', body: 'assembly.first-power.body' },
    { id: 'unplug', kind: 'build', action: { type: 'press', id: 'power', choice: 'off' }, done: { power: null }, major: false,
      title: 'assembly.unplug.title', body: 'assembly.unplug.body' },
    { id: 'place-j1', kind: 'build', action: { type: 'press', id: 'place', choice: 'j1' }, done: { 'missing.0': 'J3' }, major: false,
      title: 'assembly.place-j1.title', body: 'assembly.place-j1.body', refusal: 'assembly.place-j1.refusal' },
    { id: 'place-j3', kind: 'build', action: { type: 'press', id: 'place', choice: 'j3' }, done: { 'missing.length': 0 }, major: false,
      title: 'assembly.place-j3.title', body: 'assembly.place-j3.body', refusal: 'assembly.place-j1.refusal' },
    { id: 'solder', kind: 'build', action: { type: 'press', id: 'solder' }, done: { build: 'assembled' }, major: false,
      title: 'assembly.solder.title', body: 'assembly.solder.body', refusal: 'assembly.solder.refusal' },
    { id: 'plug-uart', kind: 'test', action: { type: 'press', id: 'power', choice: 'uart' }, done: { status: 'running', 'leds.D5': 1 }, major: false,
      title: 'assembly.plug-uart.title', body: 'assembly.plug-uart.body', refusal: 'assembly.plug-uart.refusal' },
    { id: 'upload', kind: 'test', action: { type: 'press', id: 'upload', choice: 'rainbow' }, done: { mode: 'rainbow', status: 'running' }, major: false,
      title: 'assembly.upload.title', body: 'assembly.upload.body', refusal: 'assembly.upload.refusal' },
    { id: 'download-mode', kind: 'test', action: null, done: { boot: 'download' }, major: false,
      title: 'assembly.download-mode.title', body: 'assembly.download-mode.body' },
    { id: 'power-up-check', kind: 'test', action: { type: 'press', id: 'ctl-sw2' }, done: { status: 'running', 'rails.3V3': 3.3, 'leds.D5': 1 }, major: false,
      title: 'assembly.power-up-check.title', body: 'assembly.power-up-check.body' },
  ],

  lessons: [
    {
      id: 'blink', n: 1, level: 'io', language: 'arduino-cpp', circuit: 'blink', variants: [], runMs: 4000,
      code: {
        libraries: [],
        source: `// {{t:lessons.blink.code.header}}
const uint8_t LED_PIN = 4;                 // {{t:lessons.blink.code.led}}
const uint8_t RGB_PIN = {{p:rgbPin}};                // {{t:lessons.blink.code.rgb}}
const unsigned long HALF_MS = {{p:halfMs}};

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  Serial.println("blink ready");
}

void loop() {
  digitalWrite(LED_PIN, HIGH);
  rgbLedWrite(RGB_PIN, 64, 0, 0);          // {{t:lessons.blink.code.red}}
  Serial.println("on");
  delay(HALF_MS);
  digitalWrite(LED_PIN, LOW);
  rgbLedWrite(RGB_PIN, 0, 0, 0);           // {{t:lessons.blink.code.off}}
  Serial.println("off");
  delay(HALF_MS);
}
`,
      },
      params: [
        { id: 'halfMs', kind: 'number', label: 'lessons.blink.params.halfMs.label', default: 500, min: 50, max: 2000, step: 50, unit: 'ms' },
        { id: 'rgbPin', kind: 'choice', label: 'lessons.blink.params.rgbPin.label', default: '38', options: [
          { value: '38', code: '38', label: 'lessons.blink.params.rgbPin.38' },
          { value: '48', code: '48', label: 'lessons.blink.params.rgbPin.48', note: 'lessons.blink.params.rgbPin.note' },
        ] },
      ],
      world: { inputs: [], script: [] },
      serial: { baud: 115200, sample: ['blink ready', 'on', 'off', 'on', 'off'] },
      checks: [
        { kind: 'runs', minMs: 3000, label: 'lessons.blink.checks.1' },
        { kind: 'serial', match: 'blink ready', regex: false, minCount: 1, byMs: 500, label: 'lessons.blink.checks.2' },
        { kind: 'pin-toggles', pin: 'GPIO4', periodMs: [100, 4000], minCycles: 1, label: 'lessons.blink.checks.3' },
        { kind: 'code', must: ['rgbLedWrite'], mustNot: ['neopixelWrite'], label: 'lessons.blink.checks.4' },
      ],
      pins: [
        { pin: 'GPIO4', to: 'lessons.blink.pins.GPIO4.to', role: 'lessons.blink.pins.GPIO4.role', color: 'orange' },
        { pin: 'GPIO38', to: 'lessons.blink.pins.GPIO38.to', role: 'lessons.blink.pins.GPIO38.role', color: 'white' },
        { pin: 'GND', to: 'lessons.blink.pins.GND.to', role: 'lessons.blink.pins.GND.role', color: 'black' },
      ],
      callouts: [{ part: 'D6', text: 'lessons.blink.callouts.D6' }, { part: 'R1', text: 'lessons.blink.callouts.R1' }],
      specs: [
        { label: 'lessons.blink.specs.1.label', value: 'lessons.blink.specs.1.value' },
        { label: 'lessons.blink.specs.2.label', value: 'lessons.blink.specs.2.value' },
        { label: 'lessons.blink.specs.3.label', value: 'lessons.blink.specs.3.value' },
      ],
      features: [
        { icon: 'board', text: 'lessons.blink.features.1' },
        { icon: 'tip', text: 'lessons.blink.features.2' },
        { icon: 'warn', text: 'lessons.blink.features.3' },
      ],
      title: 'lessons.blink.title', lede: 'lessons.blink.lede',
      steps: ['lessons.blink.steps.1', 'lessons.blink.steps.2', 'lessons.blink.steps.3', 'lessons.blink.steps.4'],
      hints: ['lessons.blink.hints.1', 'lessons.blink.hints.2', 'lessons.blink.hints.3'],
      quiz: {
        id: 'blink', afterStep: null,
        questions: [
          { id: 'data', q: 'lessons.blink.quiz.data.q', answer: 2, why: 'lessons.blink.quiz.data.why',
            options: ['lessons.blink.quiz.data.options.1', 'lessons.blink.quiz.data.options.2', 'lessons.blink.quiz.data.options.3'] },
          { id: 'pin', q: 'lessons.blink.quiz.pin.q', answer: 0, why: 'lessons.blink.quiz.pin.why',
            options: ['lessons.blink.quiz.pin.options.1', 'lessons.blink.quiz.pin.options.2', 'lessons.blink.quiz.pin.options.3'] },
          { id: 'power', q: 'lessons.blink.quiz.power.q', answer: 1, why: 'lessons.blink.quiz.power.why',
            options: ['lessons.blink.quiz.power.options.1', 'lessons.blink.quiz.power.options.2', 'lessons.blink.quiz.power.options.3'] },
        ],
      },
    },
    {
      id: 'boot-button', n: 2, level: 'input', language: 'arduino-cpp', circuit: 'boot-button', variants: [], runMs: 3500,
      code: {
        libraries: [],
        source: `// {{t:lessons.boot-button.code.header}}
const uint8_t BOOT_PIN = 0;                // {{t:lessons.boot-button.code.boot}}
const uint8_t LED_PIN = 4;
const unsigned long DEBOUNCE_MS = {{p:debounceMs}};

bool ledOn = false;
int lastReading = HIGH;
int stable = HIGH;
unsigned long changedAt = 0;
int presses = 0;

void setup() {
  Serial.begin(115200);
  pinMode(BOOT_PIN, INPUT_PULLUP);         // {{t:lessons.boot-button.code.pullup}}
  pinMode(LED_PIN, OUTPUT);
  Serial.println("press BOOT");
}

void loop() {
  int reading = digitalRead(BOOT_PIN);
  if (reading != lastReading) {            // {{t:lessons.boot-button.code.edge}}
    changedAt = millis();
    lastReading = reading;
  }
  if (millis() - changedAt >= DEBOUNCE_MS && reading != stable) {
    stable = reading;
    if (stable == LOW) {                   // {{t:lessons.boot-button.code.low}}
      presses++;
      ledOn = !ledOn;
      digitalWrite(LED_PIN, ledOn ? HIGH : LOW);
      float chipC = temperatureRead();     // {{t:lessons.boot-button.code.temp}}
      Serial.printf("BOOT pressed #%d, chip %.1f C\\n", presses, chipC);
    }
  }
}
`,
      },
      params: [
        { id: 'debounceMs', kind: 'number', label: 'lessons.boot-button.params.debounceMs.label', default: 30, min: 0, max: 200, step: 5, unit: 'ms' },
      ],
      world: {
        inputs: [
          { id: 'boot', quantity: 'button', device: { kind: 'button', pull: 'internal-up', bounceMs: 8 }, pins: ['GPIO0'], part: 'SW1',
            min: 0, max: 1, step: 1, default: 0, gesture: 'press', label: 'lessons.boot-button.world.boot' },
        ],
        script: [
          { t: 1000, input: 'boot', value: 1 }, { t: 1300, input: 'boot', value: 0 },
          { t: 2500, input: 'boot', value: 1 }, { t: 2800, input: 'boot', value: 0 },
        ],
      },
      serial: { baud: 115200, sample: ['press BOOT', 'BOOT pressed #1, chip 41.5 C', 'BOOT pressed #2, chip 41.5 C'] },
      checks: [
        { kind: 'runs', minMs: 3000, label: 'lessons.boot-button.checks.1' },
        { kind: 'responds', after: { t: 1000, input: 'boot', value: 1 }, pin: 'GPIO4', withinMs: 100, mode: 'out', v: [1, 1], label: 'lessons.boot-button.checks.2' },
        { kind: 'responds', after: { t: 2500, input: 'boot', value: 1 }, pin: 'GPIO4', withinMs: 100, mode: 'out', v: [0, 0], label: 'lessons.boot-button.checks.3' },
        { kind: 'serial', match: 'BOOT pressed #\\d+, chip \\d+\\.\\d C', regex: true, minCount: 2, label: 'lessons.boot-button.checks.4' },
      ],
      pins: [
        { pin: 'GPIO0', to: 'lessons.boot-button.pins.GPIO0.to', role: 'lessons.boot-button.pins.GPIO0.role', color: 'yellow' },
        { pin: 'GPIO4', to: 'lessons.boot-button.pins.GPIO4.to', role: 'lessons.boot-button.pins.GPIO4.role', color: 'orange' },
      ],
      callouts: [{ part: 'SW1', text: 'lessons.boot-button.callouts.SW1' }, { part: 'U4', text: 'lessons.boot-button.callouts.U4' }],
      specs: [
        { label: 'lessons.boot-button.specs.1.label', value: 'lessons.boot-button.specs.1.value' },
        { label: 'lessons.boot-button.specs.2.label', value: 'lessons.boot-button.specs.2.value' },
        { label: 'lessons.boot-button.specs.3.label', value: 'lessons.boot-button.specs.3.value' },
      ],
      features: [
        { icon: 'board', text: 'lessons.boot-button.features.1' },
        { icon: 'tip', text: 'lessons.boot-button.features.2' },
        { icon: 'warn', text: 'lessons.boot-button.features.3' },
      ],
      title: 'lessons.boot-button.title', lede: 'lessons.boot-button.lede',
      steps: ['lessons.boot-button.steps.1', 'lessons.boot-button.steps.2', 'lessons.boot-button.steps.3'],
      hints: ['lessons.boot-button.hints.1', 'lessons.boot-button.hints.2', 'lessons.boot-button.hints.3'],
      quiz: {
        id: 'boot-button', afterStep: null,
        questions: [
          { id: 'reset', q: 'lessons.boot-button.quiz.reset.q', answer: 1, why: 'lessons.boot-button.quiz.reset.why',
            options: ['lessons.boot-button.quiz.reset.options.1', 'lessons.boot-button.quiz.reset.options.2', 'lessons.boot-button.quiz.reset.options.3'] },
          { id: 'bounce', q: 'lessons.boot-button.quiz.bounce.q', answer: 0, why: 'lessons.boot-button.quiz.bounce.why',
            options: ['lessons.boot-button.quiz.bounce.options.1', 'lessons.boot-button.quiz.bounce.options.2', 'lessons.boot-button.quiz.bounce.options.3'] },
          { id: 'temp', q: 'lessons.boot-button.quiz.temp.q', answer: 2, why: 'lessons.boot-button.quiz.temp.why',
            options: ['lessons.boot-button.quiz.temp.options.1', 'lessons.boot-button.quiz.temp.options.2', 'lessons.boot-button.quiz.temp.options.3'] },
        ],
      },
    },
    {
      id: 'dimmer', n: 3, level: 'analog', language: 'arduino-cpp', circuit: 'dimmer', variants: [], runMs: 3500,
      code: {
        libraries: [],
        source: `// {{t:lessons.dimmer.code.header}}
const uint8_t POT_PIN = 1;                 // {{t:lessons.dimmer.code.pot}}
const uint8_t LED_PIN = 4;
const uint8_t RGB_PIN = 38;
const uint32_t PWM_HZ = {{p:pwmHz}};
const uint8_t PWM_BITS = 8;                // {{t:lessons.dimmer.code.bits}}

unsigned long lastPrint = 0;

void setup() {
  Serial.begin(115200);
  analogReadResolution(12);                // {{t:lessons.dimmer.code.adc}}
  ledcAttach(LED_PIN, PWM_HZ, PWM_BITS);   // {{t:lessons.dimmer.code.attach}}
}

void loop() {
  int raw = analogRead(POT_PIN);           // {{t:lessons.dimmer.code.raw}}
  int mv = analogReadMilliVolts(POT_PIN);
  int duty = raw / 16;                     // {{t:lessons.dimmer.code.scale}}
  ledcWrite(LED_PIN, duty);
  rgbLedWrite(RGB_PIN, duty / 4, 0, (255 - duty) / 4);
  if (millis() - lastPrint >= 250) {
    lastPrint = millis();
    Serial.printf("pot %d (%d mV) -> duty %d\\n", raw, mv, duty);
  }
  delay(10);
}
`,
      },
      params: [
        { id: 'pwmHz', kind: 'number', label: 'lessons.dimmer.params.pwmHz.label', default: 5000, min: 500, max: 20000, step: 500, unit: 'Hz' },
      ],
      world: {
        inputs: [
          { id: 'knob', quantity: 'angle-deg', device: { kind: 'pot', ohms: 10000 }, pins: ['GPIO1'], part: 'POT1',
            min: 0, max: 300, step: 1, default: 75, unit: '°', gesture: 'knob', label: 'lessons.dimmer.world.knob' },
        ],
        script: [
          { t: 0, input: 'knob', value: 75 }, { t: 1500, input: 'knob', value: 225 }, { t: 3000, input: 'knob', value: 300 },
        ],
      },
      serial: { baud: 115200, sample: ['pot 1024 (825 mV) -> duty 64', 'pot 3071 (2475 mV) -> duty 191', 'pot 4095 (3300 mV) -> duty 255'] },
      checks: [
        { kind: 'runs', minMs: 3000, label: 'lessons.dimmer.checks.1' },
        { kind: 'pwm', pin: 'GPIO4', duty: [0.2, 0.3], atMs: 1000, label: 'lessons.dimmer.checks.2' },
        { kind: 'pwm', pin: 'GPIO4', duty: [0.7, 0.8], atMs: 2500, label: 'lessons.dimmer.checks.3' },
        { kind: 'pwm', pin: 'GPIO4', duty: [0.95, 1], atMs: 3400, label: 'lessons.dimmer.checks.4' },
        { kind: 'serial', match: 'pot \\d+ \\(\\d+ mV\\) -> duty \\d+', regex: true, minCount: 8, label: 'lessons.dimmer.checks.5' },
        { kind: 'code', must: ['analogRead(', 'ledcAttach(', 'ledcWrite('], mustNot: ['ledcSetup', 'ledcAttachPin'], label: 'lessons.dimmer.checks.6' },
      ],
      pins: [
        { pin: 'GPIO1', to: 'lessons.dimmer.pins.GPIO1.to', role: 'lessons.dimmer.pins.GPIO1.role', color: 'green' },
        { pin: 'GPIO4', to: 'lessons.dimmer.pins.GPIO4.to', role: 'lessons.dimmer.pins.GPIO4.role', color: 'orange' },
        { pin: '3V3', to: 'lessons.dimmer.pins.3V3.to', role: 'lessons.dimmer.pins.3V3.role', color: 'red' },
      ],
      callouts: [{ part: 'POT1', text: 'lessons.dimmer.callouts.POT1' }, { part: 'LED1', text: 'lessons.dimmer.callouts.LED1' }],
      specs: [
        { label: 'lessons.dimmer.specs.1.label', value: 'lessons.dimmer.specs.1.value' },
        { label: 'lessons.dimmer.specs.2.label', value: 'lessons.dimmer.specs.2.value' },
        { label: 'lessons.dimmer.specs.3.label', value: 'lessons.dimmer.specs.3.value' },
      ],
      features: [
        { icon: 'board', text: 'lessons.dimmer.features.1' },
        { icon: 'tip', text: 'lessons.dimmer.features.2' },
        { icon: 'info', text: 'lessons.dimmer.features.3' },
      ],
      title: 'lessons.dimmer.title', lede: 'lessons.dimmer.lede',
      steps: ['lessons.dimmer.steps.1', 'lessons.dimmer.steps.2', 'lessons.dimmer.steps.3'],
      hints: ['lessons.dimmer.hints.1', 'lessons.dimmer.hints.2', 'lessons.dimmer.hints.3'],
      quiz: {
        id: 'dimmer', afterStep: null,
        questions: [
          { id: 'scale', q: 'lessons.dimmer.quiz.scale.q', answer: 1, why: 'lessons.dimmer.quiz.scale.why',
            options: ['lessons.dimmer.quiz.scale.options.1', 'lessons.dimmer.quiz.scale.options.2', 'lessons.dimmer.quiz.scale.options.3'] },
          { id: 'adc2', q: 'lessons.dimmer.quiz.adc2.q', answer: 0, why: 'lessons.dimmer.quiz.adc2.why',
            options: ['lessons.dimmer.quiz.adc2.options.1', 'lessons.dimmer.quiz.adc2.options.2', 'lessons.dimmer.quiz.adc2.options.3'] },
          { id: 'freq', q: 'lessons.dimmer.quiz.freq.q', answer: 2, why: 'lessons.dimmer.quiz.freq.why',
            options: ['lessons.dimmer.quiz.freq.options.1', 'lessons.dimmer.quiz.freq.options.2', 'lessons.dimmer.quiz.freq.options.3'] },
        ],
      },
    },
    {
      id: 'web-server', n: 4, level: 'wireless', language: 'arduino-cpp', circuit: 'web-server', variants: [], runMs: 5000,
      code: {
        libraries: ['WiFi', 'WebServer'],
        source: `// {{t:lessons.web-server.code.header}}
#include <WiFi.h>
#include <WebServer.h>

const char* SSID = "{{p:ssid}}";
const char* PASS = "robotics";             // {{t:lessons.web-server.code.pass}}
const uint8_t LED_PIN = 4;
const uint8_t RGB_PIN = 38;

WebServer server(80);

void handleRoot() {
  server.send(200, "text/html", "<h1>ESP32-S3</h1><a href=\\"/on\\">LED on</a> <a href=\\"/off\\">LED off</a>");
}

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  WiFi.mode(WIFI_STA);                     // {{t:lessons.web-server.code.sta}}
  WiFi.begin(SSID, PASS);
  Serial.print("Connecting to ");
  Serial.println(SSID);
  while (WiFi.status() != WL_CONNECTED) {
    rgbLedWrite(RGB_PIN, 0, 0, 64);        // {{t:lessons.web-server.code.blue}}
    delay(250);
    rgbLedWrite(RGB_PIN, 0, 0, 0);
    delay(250);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("Connected, IP ");
  Serial.println(WiFi.localIP().toString());
  rgbLedWrite(RGB_PIN, 0, 64, 0);          // {{t:lessons.web-server.code.green}}
  server.on("/", handleRoot);
  server.on("/on", []() {
    digitalWrite(LED_PIN, HIGH);
    server.send(200, "text/plain", "LED on");
    Serial.println("GET /on");
  });
  server.on("/off", []() {
    digitalWrite(LED_PIN, LOW);
    server.send(200, "text/plain", "LED off");
    Serial.println("GET /off");
  });
  server.begin();
}

void loop() {
  server.handleClient();                   // {{t:lessons.web-server.code.loop}}
}
`,
      },
      params: [
        { id: 'ssid', kind: 'choice', label: 'lessons.web-server.params.ssid.label', default: 'bench-lab', options: [
          { value: 'bench-lab', code: 'bench-lab', label: 'lessons.web-server.params.ssid.bench-lab' },
          { value: 'HackTX', code: 'HackTX', label: 'lessons.web-server.params.ssid.HackTX', note: 'lessons.web-server.params.ssid.note' },
        ] },
      ],
      world: {
        inputs: [
          { id: 'phone', quantity: 'request', device: { kind: 'network', ssid: 'bench-lab', ip: '192.168.4.17', requests: ['GET /on', 'GET /off', 'GET /'] },
            pins: [], part: 'U4', min: 0, max: 2, step: 1, default: 2, gesture: 'tap', label: 'lessons.web-server.world.phone' },
        ],
        script: [
          { t: 3000, input: 'phone', value: 0 }, { t: 3600, input: 'phone', value: 1 }, { t: 4200, input: 'phone', value: 0 },
        ],
      },
      serial: { baud: 115200, sample: ['Connecting to bench-lab', '...', 'Connected, IP 192.168.4.x', 'GET /on', 'GET /off', 'GET /on'] },
      checks: [
        { kind: 'runs', minMs: 4500, label: 'lessons.web-server.checks.1' },
        { kind: 'serial', match: 'Connected, IP 192\\.168\\.4\\.\\d+', regex: true, minCount: 1, byMs: 2500, label: 'lessons.web-server.checks.2' },
        { kind: 'responds', after: { t: 3000, input: 'phone', value: 0 }, pin: 'GPIO4', withinMs: 100, mode: 'out', v: [1, 1], label: 'lessons.web-server.checks.3' },
        { kind: 'responds', after: { t: 3600, input: 'phone', value: 1 }, pin: 'GPIO4', withinMs: 100, mode: 'out', v: [0, 0], label: 'lessons.web-server.checks.4' },
        { kind: 'code', must: ['WiFi.begin', 'server.handleClient()'], mustNot: [], label: 'lessons.web-server.checks.5' },
      ],
      pins: [
        { pin: 'GPIO4', to: 'lessons.web-server.pins.GPIO4.to', role: 'lessons.web-server.pins.GPIO4.role', color: 'orange' },
        { pin: 'GPIO38', to: 'lessons.web-server.pins.GPIO38.to', role: 'lessons.web-server.pins.GPIO38.role', color: 'white' },
      ],
      callouts: [{ part: 'U4', text: 'lessons.web-server.callouts.U4' }, { part: 'D6', text: 'lessons.web-server.callouts.D6' }],
      specs: [
        { label: 'lessons.web-server.specs.1.label', value: 'lessons.web-server.specs.1.value' },
        { label: 'lessons.web-server.specs.2.label', value: 'lessons.web-server.specs.2.value' },
        { label: 'lessons.web-server.specs.3.label', value: 'lessons.web-server.specs.3.value' },
      ],
      features: [
        { icon: 'globe', text: 'lessons.web-server.features.1' },
        { icon: 'tip', text: 'lessons.web-server.features.2' },
        { icon: 'warn', text: 'lessons.web-server.features.3' },
      ],
      title: 'lessons.web-server.title', lede: 'lessons.web-server.lede',
      steps: ['lessons.web-server.steps.1', 'lessons.web-server.steps.2', 'lessons.web-server.steps.3', 'lessons.web-server.steps.4'],
      hints: ['lessons.web-server.hints.1', 'lessons.web-server.hints.2', 'lessons.web-server.hints.3'],
      quiz: {
        id: 'web-server', afterStep: null,
        questions: [
          { id: 'band', q: 'lessons.web-server.quiz.band.q', answer: 1, why: 'lessons.web-server.quiz.band.why',
            options: ['lessons.web-server.quiz.band.options.1', 'lessons.web-server.quiz.band.options.2', 'lessons.web-server.quiz.band.options.3'] },
          { id: 'loop', q: 'lessons.web-server.quiz.loop.q', answer: 2, why: 'lessons.web-server.quiz.loop.why',
            options: ['lessons.web-server.quiz.loop.options.1', 'lessons.web-server.quiz.loop.options.2', 'lessons.web-server.quiz.loop.options.3'] },
          { id: 'power', q: 'lessons.web-server.quiz.power.q', answer: 0, why: 'lessons.web-server.quiz.power.why',
            options: ['lessons.web-server.quiz.power.options.1', 'lessons.web-server.quiz.power.options.2', 'lessons.web-server.quiz.power.options.3'] },
        ],
      },
    },
  ],

  serial: {
    baud: 115200,
    sample: [
      'ESP-ROM:esp32s3-20210327',
      'Build:Mar 27 2021',
      'rst:0x1 (POWERON),boot:0x8 (SPI_FAST_FLASH_BOOT)',
      'SPIWP:0xee',
      'mode:DIO, clock div:1',
      'entry 0x403c98d0',
    ],
  },

  sources: [
    { title: 'Espressif, ESP32-S3-DevKitC-1 v1.1 user guide', url: 'https://docs.espressif.com/projects/esp-dev-kits/en/latest/esp32s3/esp32-s3-devkitc-1/user_guide_v1.1.html' },
    { title: 'Espressif, ESP32-S3-DevKitC-1 v1.1 dimensions (DXF/PDF)', url: 'https://dl.espressif.com/dl/schematics/esp_idf/DXF_ESP32-S3-DevKitC-1_V1.1_20220429.pdf' },
    { title: 'Espressif, ESP32-S3-DevKitC-1 reference design (schematic, PCB, BOM)', url: 'https://dl.espressif.com/dl/schematics/ESP32-S3-DevKitC-1_Reference_Design.zip' },
    { title: 'Espressif, ESP32-S3-WROOM-1 / WROOM-1U datasheet', url: 'https://www.espressif.com/sites/default/files/documentation/esp32-s3-wroom-1_wroom-1u_datasheet_en.pdf' },
    { title: 'Espressif, ESP32-S3 Series datasheet', url: 'https://www.espressif.com/sites/default/files/documentation/esp32-s3_datasheet_en.pdf' },
    { title: 'Silicon Labs, CP2102N datasheet', url: 'https://www.silabs.com/documents/public/data-sheets/cp2102n-datasheet.pdf' },
    { title: 'espressif/arduino-esp32: variants/esp32s3/pins_arduino.h', url: 'https://github.com/espressif/arduino-esp32/blob/master/variants/esp32s3/pins_arduino.h' },
    { title: 'MicroPython downloads: ESP32_GENERIC_S3', url: 'https://micropython.org/download/ESP32_GENERIC_S3/' },
  ],
};

export default board;
