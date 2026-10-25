// Arduino UNO R4 Minima (ABX00080) and UNO R4 WiFi (ABX00087). Facts: docs/facts/uno-r4.md (Arduino's Altium
// design files, datasheets and the ArduinoCore-renesas variants). Figure: figures/boards/uno-r4.js, which owns the
// geometry, build groups, power tree and lesson circuits; ids here (part ids, nets, circuit keys, fault ids) match it.
// Variants share the outline and headers; where a designator means different parts on the two boards (J1, J2, J3,
// U2, D2, D3) the part text names both.
import type { BoardContent, Quiz } from '@/content/schema';

/** A lesson's three-question quiz; `answers` are the right option (0-2) of q1, q2, q3. */
const quiz = (lesson: string, answers: [number, number, number]): Quiz => ({
  id: `${lesson}-quiz`,
  afterStep: null,
  questions: answers.map((answer, i) => {
    const key = `lessons.${lesson}.quiz.q${i + 1}`;
    return { id: `q${i + 1}`, q: `${key}.q`, options: [`${key}.options.1`, `${key}.options.2`, `${key}.options.3`], answer, why: `${key}.why` };
  }),
});

const board = {
  lab: 'board',
  id: 'uno-r4',
  maker: 'Arduino',
  title: 'title',
  tagline: 'tagline',
  overview: 'overview',

  variants: [
    { id: 'minima', name: 'Arduino UNO R4 Minima', note: 'variants.minima', figureVariant: 'minima' },
    {
      id: 'wifi',
      name: 'Arduino UNO R4 WiFi',
      note: 'variants.wifi',
      figureVariant: 'wifi',
      mcu: {
        part: 'R7FA4M1AB3CFM#AA0',
        core: 'Arm Cortex-M4F',
        cores: 1,
        clockHz: 48_000_000,
        flashBytes: 262_144,
        ramBytes: 32_768,
        eepromBytes: 8_192,
        target: 'renesas-ra4m1',
        adcBits: 14,
        wireless: ['wifi', 'ble'],
        companions: [{ part: 'ESP32-S3-MINI-1-N8', role: 'mcu.esp32-s3-mini-1-n8' }],
      },
      leds: [
        { id: 'DL4', label: 'L', color: 'yellow', drivenBy: 'D13', activeLow: false, note: 'leds.DL4-wifi' },
        { id: 'DL1', label: 'TX', color: 'yellow', drivenBy: 'usb-tx', activeLow: true, note: 'leds.DL1-wifi' },
        { id: 'DL2', label: 'RX', color: 'yellow', drivenBy: 'usb-rx', activeLow: true, note: 'leds.DL2-wifi' },
        { id: 'DL3', label: 'ON', color: 'green', drivenBy: 'power', activeLow: false, note: 'leds.DL3' },
      ],
      displays: [
        {
          id: 'U_LEDMATRIX',
          kind: 'led-matrix',
          size: [12, 8],
          pins: ['P003', 'P004', 'P011', 'P012', 'P013', 'P015', 'P204', 'P205', 'P206', 'P212', 'P213'],
          activeLow: false,
          note: 'displays.U_LEDMATRIX',
        },
      ],
      pinPatch: [
        { header: 'JDIGITAL', pin: '3', label: '2', functions: ['D2', 'P104', 'IRQ1'], caps: ['digital', 'interrupt'], volts: 5, fiveVoltTolerant: true, maxCurrentMa: 8, net: 'D2' },
        { header: 'JDIGITAL', pin: '4', label: '~3', functions: ['D3', 'P105', 'IRQ0', 'PWM'], caps: ['digital', 'pwm', 'interrupt'], volts: 5, fiveVoltTolerant: true, maxCurrentMa: 8, net: 'D3' },
        { header: 'JDIGITAL', pin: '5', label: '4', functions: ['D4', 'P106'], caps: ['digital'], volts: 5, fiveVoltTolerant: true, maxCurrentMa: 8, net: 'D4' },
        { header: 'JDIGITAL', pin: '6', label: '~5', functions: ['D5', 'P107', 'PWM'], caps: ['digital', 'pwm'], volts: 5, fiveVoltTolerant: true, maxCurrentMa: 8, net: 'D5' },
        { header: 'JDIGITAL', pin: '7', label: '~6', functions: ['D6', 'P111', 'PWM'], caps: ['digital', 'pwm'], volts: 5, fiveVoltTolerant: true, maxCurrentMa: 8, net: 'D6' },
        { header: 'JDIGITAL', pin: '8', label: '7', functions: ['D7', 'P112'], caps: ['digital'], volts: 5, fiveVoltTolerant: true, maxCurrentMa: 8, net: 'D7' },
        { header: 'JDIGITAL', pin: '11', label: '~10', functions: ['D10', 'P103', 'SPI CS', 'CAN TX', 'PWM'], caps: ['digital', 'pwm', 'spi', 'can'], volts: 5, fiveVoltTolerant: true, maxCurrentMa: 8, net: 'D10' },
        { header: 'JDIGITAL', pin: '12', label: '~11', functions: ['D11', 'P411', 'SPI COPI', 'PWM'], caps: ['digital', 'pwm', 'spi'], volts: 5, fiveVoltTolerant: true, maxCurrentMa: 8, net: 'D11' },
        { header: 'JDIGITAL', pin: '13', label: '12', functions: ['D12', 'P410', 'SPI CIPO'], caps: ['digital', 'spi'], volts: 5, fiveVoltTolerant: true, maxCurrentMa: 8, net: 'D12' },
        { header: 'JDIGITAL', pin: '14', label: '13', functions: ['D13', 'P102', 'SPI SCK', 'CAN RX', 'LED_BUILTIN'], caps: ['digital', 'spi', 'can', 'led'], volts: 5, fiveVoltTolerant: true, maxCurrentMa: 8, net: 'D13', note: 'pins.jdigital.14-wifi' },
      ],
    },
  ],

  mcu: {
    part: 'R7FA4M1AB3CFM#AA0',
    core: 'Arm Cortex-M4F',
    cores: 1,
    clockHz: 48_000_000,
    flashBytes: 262_144,
    ramBytes: 32_768,
    eepromBytes: 8_192,
    target: 'renesas-ra4m1',
    adcBits: 14,
    wireless: [],
    companions: [],
  },
  logicVolts: 5,

  power: {
    inputs: [
      { id: 'usb', connector: 'usb-c', part: 'J3', volts: { min: 4.8, max: 5.5 }, reverseProtected: true, protection: 'power.usb.protection' },
      { id: 'jack', connector: 'barrel-5.5x2.1', part: 'J4', volts: { min: 6, max: 24 }, maxCurrentMa: 1200, reverseProtected: true, protection: 'power.jack.protection' },
      { id: 'vin', connector: 'header-pin', part: 'JANALOG_P', volts: { min: 6, max: 24 }, maxCurrentMa: 1200, reverseProtected: true, protection: 'power.vin.protection' },
      { id: 'pin5', connector: 'header-pin', part: 'JANALOG_P', volts: { min: 4.8, max: 5.5 }, reverseProtected: false, protection: 'power.pin5.protection' },
    ],
    rails: [
      { name: '5V', volts: 5, maxCurrentMa: 1200, from: 'U2', note: 'power.rails.5v' },
      { name: '3V3', volts: 3.3, from: 'U1', note: 'power.rails.3v3' },
      { name: 'IOREF', volts: 5, from: 'U2', note: 'power.rails.ioref' },
      { name: '3V3_I2C', volts: 3.3, maxCurrentMa: 500, from: 'F1', note: 'power.rails.3v3-i2c' },
    ],
    io: { perPinMa: 8, note: 'power.io' },
    brownoutVolts: 1.8,
    idleMa: 33,
  },

  pinout: [
    { header: 'JANALOG', pin: '1', label: 'BOOT', functions: ['MD (P201)', 'boot mode strap'], caps: ['strapping'], volts: 5, net: 'MD', note: 'pins.janalog.1' },
    { header: 'JANALOG', pin: '2', label: 'IOREF', functions: ['5 V logic reference'], caps: ['power'], volts: 5, net: 'IOREF', note: 'pins.janalog.2' },
    { header: 'JANALOG', pin: '3', label: 'RESET', functions: ['RESET (active low)'], caps: ['reset'], volts: 5, net: 'RESET' },
    { header: 'JANALOG', pin: '4', label: '3.3V', functions: ['3.3 V out'], caps: ['power'], volts: 3.3, net: '3V3', note: 'pins.janalog.4' },
    { header: 'JANALOG', pin: '5', label: '5V', functions: ['5 V rail'], caps: ['power'], volts: 5, net: '5V', note: 'pins.janalog.5' },
    { header: 'JANALOG', pin: '6', label: 'GND', functions: ['ground'], caps: ['gnd'], volts: null, net: 'GND' },
    { header: 'JANALOG', pin: '7', label: 'GND', functions: ['ground'], caps: ['gnd'], volts: null, net: 'GND' },
    { header: 'JANALOG', pin: '8', label: 'VIN', functions: ['6-24 V in'], caps: ['power'], volts: null, net: 'VIN', note: 'pins.janalog.8' },
    { header: 'JANALOG', pin: '9', label: 'A0', functions: ['A0', 'P014', 'AN09', 'DAC (12-bit)'], caps: ['analog-in', 'analog-out', 'digital'], volts: 5, fiveVoltTolerant: true, maxCurrentMa: 8, net: 'A0', note: 'pins.janalog.9' },
    { header: 'JANALOG', pin: '10', label: 'A1', functions: ['A1', 'P000', 'AN00', 'OPAMP +'], caps: ['analog-in', 'digital'], volts: 5, fiveVoltTolerant: true, maxCurrentMa: 8, net: 'A1' },
    { header: 'JANALOG', pin: '11', label: 'A2', functions: ['A2', 'P001', 'AN01', 'OPAMP -'], caps: ['analog-in', 'digital'], volts: 5, fiveVoltTolerant: true, maxCurrentMa: 8, net: 'A2' },
    { header: 'JANALOG', pin: '12', label: 'A3', functions: ['A3', 'P002', 'AN02', 'OPAMP out'], caps: ['analog-in', 'digital'], volts: 5, fiveVoltTolerant: true, maxCurrentMa: 8, net: 'A3' },
    { header: 'JANALOG', pin: '13', label: 'A4', functions: ['A4', 'P101', 'AN21', 'I2C SDA (Wire)'], caps: ['analog-in', 'digital', 'i2c'], volts: 5, fiveVoltTolerant: true, maxCurrentMa: 8, net: 'A4' },
    { header: 'JANALOG', pin: '14', label: 'A5', functions: ['A5', 'P100', 'AN22', 'I2C SCL (Wire)'], caps: ['analog-in', 'digital', 'i2c'], volts: 5, fiveVoltTolerant: true, maxCurrentMa: 8, net: 'A5' },

    { header: 'JDIGITAL', pin: '1', label: 'RX◂0', functions: ['D0', 'P301', 'Serial1 RX'], caps: ['digital', 'uart'], volts: 5, fiveVoltTolerant: true, maxCurrentMa: 8, net: 'D0', note: 'pins.jdigital.1' },
    { header: 'JDIGITAL', pin: '2', label: 'TX▸1', functions: ['D1', 'P302', 'Serial1 TX'], caps: ['digital', 'uart'], volts: 5, fiveVoltTolerant: true, maxCurrentMa: 8, net: 'D1' },
    { header: 'JDIGITAL', pin: '3', label: '2', functions: ['D2', 'P105', 'IRQ0'], caps: ['digital', 'interrupt'], volts: 5, fiveVoltTolerant: true, maxCurrentMa: 8, net: 'D2' },
    { header: 'JDIGITAL', pin: '4', label: '~3', functions: ['D3', 'P104', 'IRQ1', 'PWM'], caps: ['digital', 'pwm', 'interrupt'], volts: 5, fiveVoltTolerant: true, maxCurrentMa: 8, net: 'D3' },
    { header: 'JDIGITAL', pin: '5', label: '4', functions: ['D4', 'P103', 'CAN TX'], caps: ['digital', 'can'], volts: 5, fiveVoltTolerant: true, maxCurrentMa: 8, net: 'D4' },
    { header: 'JDIGITAL', pin: '6', label: '~5', functions: ['D5', 'P102', 'CAN RX', 'PWM'], caps: ['digital', 'pwm', 'can'], volts: 5, fiveVoltTolerant: true, maxCurrentMa: 8, net: 'D5' },
    { header: 'JDIGITAL', pin: '7', label: '~6', functions: ['D6', 'P106', 'PWM'], caps: ['digital', 'pwm'], volts: 5, fiveVoltTolerant: true, maxCurrentMa: 8, net: 'D6' },
    { header: 'JDIGITAL', pin: '8', label: '7', functions: ['D7', 'P107'], caps: ['digital'], volts: 5, fiveVoltTolerant: true, maxCurrentMa: 8, net: 'D7' },
    { header: 'JDIGITAL', pin: '9', label: '8', functions: ['D8', 'P304'], caps: ['digital'], volts: 5, fiveVoltTolerant: true, maxCurrentMa: 8, net: 'D8' },
    { header: 'JDIGITAL', pin: '10', label: '~9', functions: ['D9', 'P303', 'PWM'], caps: ['digital', 'pwm'], volts: 5, fiveVoltTolerant: true, maxCurrentMa: 8, net: 'D9' },
    { header: 'JDIGITAL', pin: '11', label: '~10', functions: ['D10', 'P112', 'SPI CS', 'PWM'], caps: ['digital', 'pwm', 'spi'], volts: 5, fiveVoltTolerant: true, maxCurrentMa: 8, net: 'D10' },
    { header: 'JDIGITAL', pin: '12', label: '~11', functions: ['D11', 'P109', 'SPI COPI', 'PWM'], caps: ['digital', 'pwm', 'spi'], volts: 5, fiveVoltTolerant: true, maxCurrentMa: 8, net: 'D11' },
    { header: 'JDIGITAL', pin: '13', label: '12', functions: ['D12', 'P110', 'SPI CIPO'], caps: ['digital', 'spi'], volts: 5, fiveVoltTolerant: true, maxCurrentMa: 8, net: 'D12' },
    { header: 'JDIGITAL', pin: '14', label: '13', functions: ['D13', 'P111', 'SPI SCK', 'LED_BUILTIN'], caps: ['digital', 'spi', 'led'], volts: 5, fiveVoltTolerant: true, maxCurrentMa: 8, net: 'D13', note: 'pins.jdigital.14' },
    { header: 'JDIGITAL', pin: '15', label: 'GND', functions: ['ground'], caps: ['gnd'], volts: null, net: 'GND' },
    { header: 'JDIGITAL', pin: '16', label: 'AREF', functions: ['analog reference in'], caps: ['analog-in'], volts: 5, net: 'AREF', note: 'pins.jdigital.16' },
    { header: 'JDIGITAL', pin: '17', label: 'SDA', functions: ['I2C SDA (Wire)', 'same pin as A4'], caps: ['i2c'], volts: 5, fiveVoltTolerant: true, maxCurrentMa: 8, net: 'SDA', note: 'pins.jdigital.17' },
    { header: 'JDIGITAL', pin: '18', label: 'SCL', functions: ['I2C SCL (Wire)', 'same pin as A5'], caps: ['i2c'], volts: 5, fiveVoltTolerant: true, maxCurrentMa: 8, net: 'SCL' },

    { header: 'ICSP', pin: '1', label: 'CIPO', functions: ['SPI CIPO', 'same signal as D12'], caps: ['spi'], volts: 5, net: 'D12' },
    { header: 'ICSP', pin: '2', label: '5V', functions: ['5 V rail'], caps: ['power'], volts: 5, net: '5V' },
    { header: 'ICSP', pin: '3', label: 'SCK', functions: ['SPI SCK', 'same signal as D13'], caps: ['spi'], volts: 5, net: 'D13' },
    { header: 'ICSP', pin: '4', label: 'COPI', functions: ['SPI COPI', 'same signal as D11'], caps: ['spi'], volts: 5, net: 'D11' },
    { header: 'ICSP', pin: '5', label: 'RESET', functions: ['RESET (active low)'], caps: ['reset'], volts: 5, net: 'RESET' },
    { header: 'ICSP', pin: '6', label: 'GND', functions: ['ground'], caps: ['gnd'], volts: null, net: 'GND' },

    { header: 'SWD', pin: '1', label: '+5V', functions: ['target voltage (5 V)'], caps: ['power'], volts: 5, net: '5V', note: 'pins.swd.1' },
    { header: 'SWD', pin: '2', label: 'SWDIO', functions: ['P108 SWDIO'], caps: ['swd'], volts: 5, net: 'SWDIO' },
    { header: 'SWD', pin: '3', label: 'GND', functions: ['ground'], caps: ['gnd'], volts: null, net: 'GND' },
    { header: 'SWD', pin: '4', label: 'SWCLK', functions: ['P300 SWCLK'], caps: ['swd'], volts: 5, net: 'SWCLK' },
    { header: 'SWD', pin: '5', label: 'GND', functions: ['ground'], caps: ['gnd'], volts: null, net: 'GND' },
    { header: 'SWD', pin: '6', label: 'NC', functions: ['not connected'], caps: ['nc'], volts: null, net: 'NC' },
    { header: 'SWD', pin: '7', label: 'RX', functions: ['P502 RXD1 (spare UART)'], caps: ['uart'], volts: 5, net: 'RXD1' },
    { header: 'SWD', pin: '8', label: 'TX', functions: ['P501 TXD1 (spare UART)'], caps: ['uart'], volts: 5, net: 'TXD1' },
    { header: 'SWD', pin: '9', label: 'GND', functions: ['ground'], caps: ['gnd'], volts: null, net: 'GND' },
    { header: 'SWD', pin: '10', label: 'RESET', functions: ['RESET (active low)'], caps: ['reset'], volts: 5, net: 'RESET', note: 'pins.swd.10' },

    { header: 'ESP', pin: '1', label: 'IO42', functions: ['ESP32-S3 GPIO42', 'MTMS (JTAG)'], caps: ['digital', 'jtag'], volts: 3.3, fiveVoltTolerant: false, net: 'ESP_IO42', note: 'pins.esp.1' },
    { header: 'ESP', pin: '2', label: 'IO41', functions: ['ESP32-S3 GPIO41', 'MTDI (JTAG)'], caps: ['digital', 'jtag'], volts: 3.3, fiveVoltTolerant: false, net: 'ESP_IO41' },
    { header: 'ESP', pin: '3', label: 'TXD0', functions: ['ESP32-S3 UART0 TX'], caps: ['uart'], volts: 3.3, fiveVoltTolerant: false, net: 'ESP_TXD0' },
    { header: 'ESP', pin: '4', label: 'DOWNLOAD', functions: ['ESP32-S3 GPIO0', 'boot strap'], caps: ['strapping'], volts: 3.3, fiveVoltTolerant: false, net: 'ESP_DOWNLOAD', note: 'pins.esp.4' },
    { header: 'ESP', pin: '5', label: 'RXD0', functions: ['ESP32-S3 UART0 RX'], caps: ['uart'], volts: 3.3, fiveVoltTolerant: false, net: 'ESP_RXD0' },
    { header: 'ESP', pin: '6', label: 'GND', functions: ['ground'], caps: ['gnd'], volts: null, net: 'GND' },

    { header: 'JOFF', pin: '1', label: 'OFF', functions: ['buck enable (pulled up)'], caps: ['power'], volts: null, net: 'OFF', note: 'pins.joff.1' },
    { header: 'JOFF', pin: '2', label: 'GND', functions: ['ground'], caps: ['gnd'], volts: null, net: 'GND' },
    { header: 'JOFF', pin: '3', label: 'VRTC', functions: ['RA4M1 VBATT (RTC backup)'], caps: ['power'], volts: null, net: 'VRTC', note: 'pins.joff.3' },

    { header: 'QWIIC', pin: '1', label: 'GND', functions: ['ground'], caps: ['gnd'], volts: null, net: 'GND' },
    { header: 'QWIIC', pin: '2', label: '3.3V', functions: ['3.3 V through a 500 mA PTC'], caps: ['power'], volts: 3.3, net: '3V3_I2C', note: 'pins.qwiic.2' },
    { header: 'QWIIC', pin: '3', label: 'SDA', functions: ['Wire1 SDA (P401, level-shifted)'], caps: ['i2c'], volts: 3.3, fiveVoltTolerant: false, net: 'QWIIC_SDA', note: 'pins.qwiic.3' },
    { header: 'QWIIC', pin: '4', label: 'SCL', functions: ['Wire1 SCL (P400, level-shifted)'], caps: ['i2c'], volts: 3.3, fiveVoltTolerant: false, net: 'QWIIC_SCL' },
  ],

  leds: [
    { id: 'DL4', label: 'L', color: 'yellow', drivenBy: 'D13', activeLow: false, note: 'leds.DL4' },
    { id: 'DL1', label: 'TX', color: 'yellow', drivenBy: 'usb-tx', activeLow: true, note: 'leds.DL1' },
    { id: 'DL2', label: 'RX', color: 'yellow', drivenBy: 'usb-rx', activeLow: true, note: 'leds.DL2' },
    { id: 'DL3', label: 'ON', color: 'green', drivenBy: 'power', activeLow: false, note: 'leds.DL3' },
  ],
  controls: [{ id: 'PB1', label: 'RESET', kind: 'reset', pin: 'RESET', activeLow: true, act: 'PB1', effect: 'controls.PB1' }],
  displays: [],

  figure: {
    page: '/figures/boards/uno-r4.html',
    sheets: ['board', 'breadboard', 'schematic', 'power'],
    parts: [
      { id: 'U1', short: 'MCU', role: 'mcu', name: 'parts.U1.name', what: 'parts.U1.what' },
      { id: 'M1', short: 'ESP32-S3', role: 'radio', name: 'parts.M1.name', what: 'parts.M1.what' },
      { id: 'U2', short: 'U2', role: 'regulator', name: 'parts.U2.name', what: 'parts.U2.what' },
      { id: 'U3', short: 'BUCK', role: 'regulator', name: 'parts.U3.name', what: 'parts.U3.what' },
      { id: 'L3', short: '10 µH', role: 'passive', name: 'parts.L3.name', what: 'parts.L3.what' },
      { id: 'U5', short: '3V3 REG', role: 'regulator', name: 'parts.U5.name', what: 'parts.U5.what' },
      { id: 'U4', short: 'LEVEL SHIFT', role: 'other', name: 'parts.U4.name', what: 'parts.U4.what' },
      { id: 'U6', short: 'USB SW', role: 'other', name: 'parts.U6.name', what: 'parts.U6.what' },
      { id: 'D1', short: 'SCHOTTKY', role: 'protection', name: 'parts.D1.name', what: 'parts.D1.what' },
      { id: 'D2', short: 'SCHOTTKY', role: 'protection', name: 'parts.D2.name', what: 'parts.D2.what' },
      { id: 'D3', short: 'D3', role: 'protection', name: 'parts.D3.name', what: 'parts.D3.what' },
      { id: 'D4', short: 'ESD', role: 'protection', name: 'parts.D4.name', what: 'parts.D4.what' },
      { id: 'F1', short: 'PTC', role: 'protection', name: 'parts.F1.name', what: 'parts.F1.what' },
      { id: 'Q3', short: 'Q3', role: 'driver', name: 'parts.Q3.name', what: 'parts.Q3.what' },
      { id: 'DL4', short: 'L LED', role: 'led', name: 'parts.DL4.name', what: 'parts.DL4.what' },
      { id: 'DL1', short: 'TX', role: 'led', name: 'parts.DL1.name', what: 'parts.DL1.what' },
      { id: 'DL2', short: 'RX', role: 'led', name: 'parts.DL2.name', what: 'parts.DL2.what' },
      { id: 'DL3', short: 'ON', role: 'led', name: 'parts.DL3.name', what: 'parts.DL3.what' },
      { id: 'U_LEDMATRIX', short: 'LED MATRIX', role: 'display', name: 'parts.U_LEDMATRIX.name', what: 'parts.U_LEDMATRIX.what' },
      { id: 'PB1', short: 'RESET', role: 'button', name: 'parts.PB1.name', what: 'parts.PB1.what' },
      { id: 'J1', short: 'J1', role: 'connector', name: 'parts.J1.name', what: 'parts.J1.what' },
      { id: 'J2', short: 'J2', role: 'connector', name: 'parts.J2.name', what: 'parts.J2.what' },
      { id: 'J3', short: 'J3', role: 'connector', name: 'parts.J3.name', what: 'parts.J3.what' },
      { id: 'J4', short: 'POWER JACK', role: 'connector', name: 'parts.J4.name', what: 'parts.J4.what' },
      { id: 'J5', short: 'POWER JACK', role: 'connector', name: 'parts.J5.name', what: 'parts.J5.what' },
      { id: 'J6', short: 'ESP', role: 'header', name: 'parts.J6.name', what: 'parts.J6.what' },
      { id: 'JOFF', short: 'OFF VRTC', role: 'header', name: 'parts.JOFF.name', what: 'parts.JOFF.what' },
      { id: 'JDIGITAL_H', short: 'D8-D13', role: 'header', name: 'parts.JDIGITAL_H.name', what: 'parts.JDIGITAL_H.what' },
      { id: 'JDIGITAL_L', short: 'D0-D7', role: 'header', name: 'parts.JDIGITAL_L.name', what: 'parts.JDIGITAL_L.what' },
      { id: 'JANALOG_P', short: 'POWER', role: 'header', name: 'parts.JANALOG_P.name', what: 'parts.JANALOG_P.what' },
      { id: 'JANALOG_A', short: 'A0-A5', role: 'header', name: 'parts.JANALOG_A.name', what: 'parts.JANALOG_A.what' },
      { id: 'Y1', short: 'Y1', role: 'crystal', name: 'parts.Y1.name', what: 'parts.Y1.what' },
      { id: 'SJ1', short: 'SJ1', role: 'jumper', name: 'parts.SJ1.name', what: 'parts.SJ1.what' },
      { id: 'PASSIVES', short: '0402', role: 'passive', name: 'parts.PASSIVES.name', what: 'parts.PASSIVES.what' },
    ],
  },

  wireables: [
    {
      part: 'led',
      connections: [{ from: 'A', to: 'D13', color: 'orange' }, { from: 'K', to: 'GND', color: 'black' }],
      supplyVolts: 5,
      caution: 'wireables.led.caution',
      note: 'wireables.led.note',
    },
    {
      part: 'push-button',
      connections: [{ from: '1', to: 'D2', color: 'yellow' }, { from: '3', to: 'GND', color: 'black' }],
      supplyVolts: 5,
      note: 'wireables.push-button.note',
    },
    {
      part: 'potentiometer',
      connections: [{ from: '1', to: 'GND', color: 'black' }, { from: '2', to: 'A1', color: 'blue' }, { from: '3', to: '5V', color: 'red' }],
      supplyVolts: 5,
      note: 'wireables.potentiometer.note',
    },
    {
      part: 'servo-sg90',
      connections: [{ from: 'brown', to: 'GND', color: 'brown' }, { from: 'red', to: '5V', color: 'red' }, { from: 'orange', to: 'D9', color: 'orange' }],
      supplyVolts: 5,
      caution: 'wireables.servo-sg90.caution',
      note: 'wireables.servo-sg90.note',
    },
    {
      part: 'hc-sr04',
      connections: [{ from: 'VCC', to: '5V', color: 'red' }, { from: 'Trig', to: 'D7', color: 'green' }, { from: 'Echo', to: 'D6', color: 'yellow' }, { from: 'GND', to: 'GND', color: 'black' }],
      supplyVolts: 5,
      note: 'wireables.hc-sr04.note',
    },
    {
      part: 'mpu6050',
      connections: [{ from: 'VCC', to: '5V', color: 'red' }, { from: 'GND', to: 'GND', color: 'black' }, { from: 'SDA', to: 'SDA', color: 'blue' }, { from: 'SCL', to: 'SCL', color: 'yellow' }],
      supplyVolts: 5,
      caution: 'wireables.mpu6050.caution',
      note: 'wireables.mpu6050.note',
    },
  ],

  failures: [
    {
      id: 'reverse-jack',
      kind: 'reverse-polarity',
      trigger: { by: 'reverse', input: 'jack' },
      figure: { type: 'set', state: { power: 'jack', fault: 'reverse-polarity:jack' } },
      effect: { power: 'off', halts: true },
      title: 'failures.reverse-jack.title',
      symptom: 'failures.reverse-jack.symptom',
      explanation: 'failures.reverse-jack.explanation',
      fix: 'failures.reverse-jack.fix',
    },
    {
      id: 'reverse-5v-pin',
      kind: 'reverse-polarity',
      trigger: { by: 'reverse', input: 'pin5' },
      figure: { type: 'set', state: { power: 'pin5', fault: 'reverse-polarity:pin5' } },
      effect: { power: 'off', halts: true, damages: ['U1'] },
      title: 'failures.reverse-5v-pin.title',
      symptom: 'failures.reverse-5v-pin.symptom',
      explanation: 'failures.reverse-5v-pin.explanation',
      fix: 'failures.reverse-5v-pin.fix',
    },
    {
      id: 'brownout',
      kind: 'brownout',
      trigger: { by: 'load', rail: '5V', ma: 1500, part: 'dc-motor' },
      // the motor's start current sags VBUS at the board to about 2 V (no polyfuse, so the cable and the host port
      // limit it); the figure's own `brownout` dips stay above the RA4M1's 1.8 V and never show a reset
      figure: { type: 'set', state: { power: 'usb', fault: 'wrong-voltage:usb:2' } },
      effect: { power: 'resetting', halts: true, extraMa: 1500 },
      title: 'failures.brownout.title',
      symptom: 'failures.brownout.symptom',
      explanation: 'failures.brownout.explanation',
      fix: 'failures.brownout.fix',
    },
    {
      id: 'nine-volts-on-5v',
      kind: 'wrong-voltage',
      trigger: { by: 'power-input', input: 'pin5', volts: 9 },
      figure: { type: 'set', state: { power: 'pin5', fault: 'wrong-voltage:pin5:9' } },
      effect: { power: 'off', halts: true, damages: ['U1'] },
      title: 'failures.nine-volts-on-5v.title',
      symptom: 'failures.nine-volts-on-5v.symptom',
      explanation: 'failures.nine-volts-on-5v.explanation',
      fix: 'failures.nine-volts-on-5v.fix',
    },
    {
      id: 'jack-48v',
      kind: 'wrong-voltage',
      trigger: { by: 'power-input', input: 'jack', volts: 48 },
      figure: { type: 'set', state: { power: 'jack', fault: 'wrong-voltage:jack:48' } },
      effect: { power: 'off', halts: true },
      title: 'failures.jack-48v.title',
      symptom: 'failures.jack-48v.symptom',
      explanation: 'failures.jack-48v.explanation',
      fix: 'failures.jack-48v.fix',
    },
    {
      id: 'five-volts-into-3v3',
      kind: 'wrong-voltage',
      trigger: { by: 'short', nets: ['5V', '3V3'] },
      figure: { type: 'set', state: { power: 'pin33', fault: 'wrong-voltage:pin33:5' } },
      effect: { power: 'off', halts: true },
      title: 'failures.five-volts-into-3v3.title',
      symptom: 'failures.five-volts-into-3v3.symptom',
      explanation: 'failures.five-volts-into-3v3.explanation',
      fix: 'failures.five-volts-into-3v3.fix',
    },
    {
      id: 'cold-d13',
      kind: 'cold-solder',
      trigger: { by: 'cold-joint', part: 'JDIGITAL_H', pin: 'JDIGITAL_H.5' },
      figure: { type: 'set', state: { fault: 'cold:JDIGITAL_H.5' } },
      effect: { power: 'on', halts: false, pins: { D13: 'noisy' } },
      title: 'failures.cold-d13.title',
      symptom: 'failures.cold-d13.symptom',
      explanation: 'failures.cold-d13.explanation',
      fix: 'failures.cold-d13.fix',
    },
    {
      id: 'missing-inductor',
      kind: 'missing-part',
      trigger: { by: 'remove-part', part: 'L3' },
      figure: { type: 'set', state: { power: 'jack', fault: 'missing:L3' } },
      effect: { power: 'off', halts: true },
      title: 'failures.missing-inductor.title',
      symptom: 'failures.missing-inductor.symptom',
      explanation: 'failures.missing-inductor.explanation',
      fix: 'failures.missing-inductor.fix',
    },
    {
      id: 'boot-strap',
      kind: 'boot-strap',
      trigger: { by: 'short', nets: ['MD', 'GND'] },
      figure: { type: 'set', state: { power: 'usb', fault: 'short:MD:GND' } },
      effect: { power: 'on', halts: true },
      title: 'failures.boot-strap.title',
      symptom: 'failures.boot-strap.symptom',
      explanation: 'failures.boot-strap.explanation',
      fix: 'failures.boot-strap.fix',
    },
    {
      id: 'esp-download-strap',
      kind: 'boot-strap',
      trigger: { by: 'short', nets: ['ESP_DOWNLOAD', 'GND'] },
      figure: { type: 'set', state: { power: 'usb', fault: 'short:ESP_DOWNLOAD:GND' } },
      effect: { power: 'on', halts: false },
      title: 'failures.esp-download-strap.title',
      symptom: 'failures.esp-download-strap.symptom',
      explanation: 'failures.esp-download-strap.explanation',
      fix: 'failures.esp-download-strap.fix',
    },
    {
      id: 'short-5v-gnd',
      kind: 'short',
      trigger: { by: 'short', nets: ['5V', 'GND'] },
      figure: { type: 'set', state: { fault: 'short:5V:GND' } },
      effect: { power: 'off', halts: true },
      title: 'failures.short-5v-gnd.title',
      symptom: 'failures.short-5v-gnd.symptom',
      explanation: 'failures.short-5v-gnd.explanation',
      fix: 'failures.short-5v-gnd.fix',
    },
  ],

  // Both variants: every SMD part (U1, the buck, LEDs, USB-C, RESET) goes on in one reflow, then the low headers
  // (ICSP, SWD on the Minima; ICSP, ESP and OFF/VRTC on the WiFi), then the tall ones (barrel jack and the four
  // shield headers). The done conditions avoid part counts, which differ between the variants.
  assembly: [
    { id: 'unplug', kind: 'build', action: { type: 'set', state: { power: null } }, done: { power: null }, major: false, title: 'assembly.unplug.title', body: 'assembly.unplug.body' },
    { id: 'strip', kind: 'build', action: { type: 'press', id: 'strip' }, done: { build: 'bare' }, major: false, title: 'assembly.strip.title', body: 'assembly.strip.body', refusal: 'assembly.strip.refusal' },
    { id: 'smd', kind: 'build', action: { type: 'press', id: 'pnp' }, done: { build: 'reflowed' }, major: false, title: 'assembly.smd.title', body: 'assembly.smd.body', refusal: 'assembly.smd.refusal' },
    { id: 'low', kind: 'build', action: { type: 'press', id: 'place', choice: 'group-low' }, done: { build: 'tht' }, major: false, title: 'assembly.low.title', body: 'assembly.low.body', refusal: 'assembly.low.refusal' },
    { id: 'tall', kind: 'build', action: { type: 'press', id: 'place', choice: 'group-tall' }, done: { 'missing.length': 0 }, major: false, title: 'assembly.tall.title', body: 'assembly.tall.body', refusal: 'assembly.tall.refusal' },
    { id: 'solder', kind: 'build', action: { type: 'press', id: 'solder' }, done: { build: 'assembled' }, major: false, title: 'assembly.solder.title', body: 'assembly.solder.body', refusal: 'assembly.solder.refusal' },
    { id: 'power-up', kind: 'test', action: { type: 'set', state: { power: 'usb' } }, done: { power: 'usb', status: 'running', 'leds.DL3': 1 }, major: false, title: 'assembly.power-up.title', body: 'assembly.power-up.body', refusal: 'assembly.power-up.refusal' },
    { id: 'rails', kind: 'test', action: null, done: { 'rails.5V': 4.7, 'rails.3V3': 3.3 }, major: false, title: 'assembly.rails.title', body: 'assembly.rails.body' },
    { id: 'upload', kind: 'test', action: { type: 'press', id: 'upload', choice: 'hello' }, done: { mode: 'hello', status: 'running' }, major: false, title: 'assembly.upload.title', body: 'assembly.upload.body', refusal: 'assembly.upload.refusal' },
    { id: 'reset', kind: 'test', action: { type: 'press', id: 'ctl-pb1' }, done: { 'controls.PB1': 0, status: 'running' }, major: false, title: 'assembly.reset.title', body: 'assembly.reset.body' },
  ],

  lessons: [
    {
      id: 'blink',
      n: 1,
      level: 'io',
      language: 'arduino-cpp',
      code: {
        source: `// {{t:lessons.blink.code.header}}
// R1 = {{p:ohms}} ohms: {{t:lessons.blink.code.resistor}}
const int LED_PIN = 13;           // {{t:lessons.blink.code.pin}}
const int WAIT_MS = {{p:wait}};

void setup() {
  pinMode(LED_PIN, OUTPUT);       // {{t:lessons.blink.code.setup}}
}

void loop() {
  digitalWrite(LED_PIN, HIGH);
  delay(WAIT_MS);
  digitalWrite(LED_PIN, LOW);
  delay(WAIT_MS);
}
`,
        libraries: [],
      },
      params: [
        { id: 'wait', kind: 'number', label: 'lessons.blink.params.wait.label', default: 500, min: 100, max: 1000, step: 100, unit: 'ms' },
        {
          id: 'ohms',
          kind: 'choice',
          label: 'lessons.blink.params.ohms.label',
          default: '1000',
          options: [
            { value: '220', code: '220', figureValue: 220, label: 'lessons.blink.params.ohms.220', note: 'lessons.blink.params.ohms.220-note' },
            { value: '470', code: '470', figureValue: 470, label: 'lessons.blink.params.ohms.470' },
            { value: '1000', code: '1000', figureValue: 1000, label: 'lessons.blink.params.ohms.1000' },
          ],
          figure: { part: 'R1', key: 'ohms' },
        },
      ],
      circuit: 'blink',
      world: { inputs: [], script: [] },
      serial: { baud: 9600, sample: [] },
      // a full blink is 2 x WAIT_MS: 200-2000 ms over the chip's range, so the check follows whatever the code says
      runMs: 5000,
      checks: [
        { kind: 'pin-toggles', pin: 'D13', periodMs: [180, 2200], minCycles: 2, label: 'lessons.blink.checks.1' },
        { kind: 'code', must: ['pinMode', 'OUTPUT', 'digitalWrite'], mustNot: [], label: 'lessons.blink.checks.2' },
      ],
      variants: [],
      pins: [
        { pin: 'D13', to: 'lessons.blink.pins.D13.to', role: 'lessons.blink.pins.D13.role', color: 'orange' },
        { pin: 'GND', to: 'lessons.blink.pins.GND.to', role: 'lessons.blink.pins.GND.role', color: 'black' },
      ],
      callouts: [
        { part: 'R1', text: 'lessons.blink.callouts.R1' },
        { part: 'DL4', text: 'lessons.blink.callouts.DL4' },
      ],
      specs: [
        { label: 'lessons.blink.specs.1.label', value: 'lessons.blink.specs.1.value' },
        { label: 'lessons.blink.specs.2.label', value: 'lessons.blink.specs.2.value' },
        { label: 'lessons.blink.specs.3.label', value: 'lessons.blink.specs.3.value' },
      ],
      features: [
        { icon: 'board', text: 'lessons.blink.features.1' },
        { icon: 'warn', text: 'lessons.blink.features.2' },
        { icon: 'tip', text: 'lessons.blink.features.3' },
      ],
      title: 'lessons.blink.title',
      lede: 'lessons.blink.lede',
      steps: ['lessons.blink.steps.1', 'lessons.blink.steps.2', 'lessons.blink.steps.3'],
      hints: ['lessons.blink.hints.1', 'lessons.blink.hints.2'],
      quiz: quiz('blink', [1, 0, 2]),
    },
    {
      id: 'button',
      n: 2,
      level: 'input',
      language: 'arduino-cpp',
      code: {
        source: `// {{t:lessons.button.code.header}}
const int BUTTON_PIN = 2;
const int LED_PIN = 13;
const unsigned long DEBOUNCE_MS = {{p:debounce}};

volatile bool pressed = false;
volatile unsigned long lastChange = 0;
int count = 0;
bool ledOn = false;

// {{t:lessons.button.code.isr}}
void onChange() {
  unsigned long now = millis();
  if (digitalRead(BUTTON_PIN) == LOW && now - lastChange > DEBOUNCE_MS) {
    pressed = true;
  }
  lastChange = now;
}

void setup() {
  Serial.begin(9600);
  pinMode(BUTTON_PIN, INPUT_PULLUP);   // {{t:lessons.button.code.pullup}}
  pinMode(LED_PIN, OUTPUT);
  attachInterrupt(digitalPinToInterrupt(BUTTON_PIN), onChange, CHANGE);
}

void loop() {
  if (pressed) {
    pressed = false;
    count++;
    ledOn = !ledOn;
    digitalWrite(LED_PIN, ledOn ? HIGH : LOW);
    Serial.print("presses: ");
    Serial.println(count);
  }
}
`,
        libraries: [],
      },
      params: [{ id: 'debounce', kind: 'number', label: 'lessons.button.params.debounce.label', default: 30, min: 5, max: 200, step: 5, unit: 'ms' }],
      circuit: 'button',
      world: {
        inputs: [
          {
            id: 'button',
            quantity: 'button',
            device: { kind: 'button', pull: 'internal-up', bounceMs: 5 },
            pins: ['D2'],
            part: 'SW1',
            min: 0,
            max: 1,
            step: 1,
            default: 0,
            gesture: 'press',
            label: 'lessons.button.world.button',
          },
        ],
        script: [
          { t: 1000, input: 'button', value: 1 },
          { t: 1300, input: 'button', value: 0 },
          { t: 2500, input: 'button', value: 1 },
          { t: 2800, input: 'button', value: 0 },
        ],
      },
      serial: { baud: 9600, sample: ['presses: 1', 'presses: 2'] },
      runMs: 3500,
      checks: [
        { kind: 'responds', after: { t: 1000, input: 'button', value: 1 }, pin: 'D13', withinMs: 50, mode: 'out', v: [1, 1], label: 'lessons.button.checks.1' },
        { kind: 'serial', match: '^presses: 2$', regex: true, minCount: 1, byMs: 3000, label: 'lessons.button.checks.2' },
        { kind: 'code', must: ['attachInterrupt', 'INPUT_PULLUP'], mustNot: [], label: 'lessons.button.checks.3' },
      ],
      variants: [],
      pins: [
        { pin: 'D2', to: 'lessons.button.pins.D2.to', role: 'lessons.button.pins.D2.role', color: 'yellow' },
        { pin: 'D13', to: 'lessons.button.pins.D13.to', role: 'lessons.button.pins.D13.role', color: 'orange' },
        { pin: 'GND', to: 'lessons.button.pins.GND.to', role: 'lessons.button.pins.GND.role', color: 'black' },
      ],
      callouts: [
        { part: 'SW1', text: 'lessons.button.callouts.SW1' },
        { part: 'R1', text: 'lessons.button.callouts.R1' },
      ],
      specs: [
        { label: 'lessons.button.specs.1.label', value: 'lessons.button.specs.1.value' },
        { label: 'lessons.button.specs.2.label', value: 'lessons.button.specs.2.value' },
      ],
      features: [
        { icon: 'board', text: 'lessons.button.features.1' },
        { icon: 'tip', text: 'lessons.button.features.2' },
        { icon: 'info', text: 'lessons.button.features.3' },
      ],
      title: 'lessons.button.title',
      lede: 'lessons.button.lede',
      steps: ['lessons.button.steps.1', 'lessons.button.steps.2', 'lessons.button.steps.3'],
      hints: ['lessons.button.hints.1', 'lessons.button.hints.2'],
      quiz: quiz('button', [2, 0, 1]),
    },
    {
      id: 'pot-pwm',
      n: 3,
      level: 'analog',
      language: 'arduino-cpp',
      code: {
        source: `// {{t:lessons.pot-pwm.code.header}}
const int POT_PIN = A1;
const int LED_PIN = 9;            // {{t:lessons.pot-pwm.code.pwm}}
const int BITS = {{p:bits}};      // {{t:lessons.pot-pwm.code.bits}}

void setup() {
  Serial.begin(115200);
  analogReadResolution(BITS);
  pinMode(LED_PIN, OUTPUT);
}

void loop() {
  int top = (1 << BITS) - 1;
  int raw = analogRead(POT_PIN);
  float volts = raw * 5.0 / top;
  int duty = map(raw, 0, top, 0, 255);
  analogWrite(LED_PIN, duty);
  Serial.print("A1 = ");
  Serial.print(raw);
  Serial.print("  ");
  Serial.print(volts, 2);
  Serial.println(" V");
  delay(250);
}
`,
        libraries: [],
      },
      params: [
        {
          id: 'bits',
          kind: 'choice',
          label: 'lessons.pot-pwm.params.bits.label',
          default: '14',
          options: [
            { value: '10', code: '10', label: 'lessons.pot-pwm.params.bits.10' },
            { value: '12', code: '12', label: 'lessons.pot-pwm.params.bits.12' },
            { value: '14', code: '14', label: 'lessons.pot-pwm.params.bits.14' },
          ],
        },
      ],
      circuit: 'pot-pwm',
      world: {
        inputs: [
          {
            id: 'knob',
            quantity: 'level',
            device: { kind: 'pot', ohms: 10_000 },
            pins: ['A1'],
            part: 'POT1',
            min: 0,
            max: 1,
            step: 0.01,
            default: 0.5,
            gesture: 'knob',
            label: 'lessons.pot-pwm.world.knob',
          },
        ],
        script: [
          { t: 0, input: 'knob', value: 0.25 },
          { t: 1000, input: 'knob', value: 0.75 },
        ],
      },
      serial: { baud: 115200, sample: ['A1 = 4096  1.25 V', 'A1 = 12287  3.75 V'] },
      runMs: 2000,
      checks: [
        { kind: 'serial', match: '^A1 = \\d+  \\d\\.\\d\\d V$', regex: true, minCount: 4, byMs: 2000, label: 'lessons.pot-pwm.checks.1' },
        { kind: 'pwm', pin: 'D9', duty: [0.7, 0.8], atMs: 1600, label: 'lessons.pot-pwm.checks.2' },
        { kind: 'pwm', pin: 'D9', duty: [0.2, 0.3], atMs: 800, label: 'lessons.pot-pwm.checks.3' },
        { kind: 'code', must: ['analogReadResolution', 'analogWrite'], mustNot: [], label: 'lessons.pot-pwm.checks.4' },
      ],
      variants: [],
      pins: [
        { pin: 'A1', to: 'lessons.pot-pwm.pins.A1.to', role: 'lessons.pot-pwm.pins.A1.role', color: 'blue' },
        { pin: 'D9', to: 'lessons.pot-pwm.pins.D9.to', role: 'lessons.pot-pwm.pins.D9.role', color: 'orange' },
        { pin: '5V', to: 'lessons.pot-pwm.pins.5V.to', role: 'lessons.pot-pwm.pins.5V.role', color: 'red' },
        { pin: 'GND', to: 'lessons.pot-pwm.pins.GND.to', role: 'lessons.pot-pwm.pins.GND.role', color: 'black' },
      ],
      callouts: [
        { part: 'POT1', text: 'lessons.pot-pwm.callouts.POT1' },
        { part: 'LED1', text: 'lessons.pot-pwm.callouts.LED1' },
      ],
      specs: [
        { label: 'lessons.pot-pwm.specs.1.label', value: 'lessons.pot-pwm.specs.1.value' },
        { label: 'lessons.pot-pwm.specs.2.label', value: 'lessons.pot-pwm.specs.2.value' },
        { label: 'lessons.pot-pwm.specs.3.label', value: 'lessons.pot-pwm.specs.3.value' },
      ],
      features: [
        { icon: 'board', text: 'lessons.pot-pwm.features.1' },
        { icon: 'info', text: 'lessons.pot-pwm.features.2' },
        { icon: 'tip', text: 'lessons.pot-pwm.features.3' },
      ],
      title: 'lessons.pot-pwm.title',
      lede: 'lessons.pot-pwm.lede',
      steps: ['lessons.pot-pwm.steps.1', 'lessons.pot-pwm.steps.2', 'lessons.pot-pwm.steps.3'],
      hints: ['lessons.pot-pwm.hints.1', 'lessons.pot-pwm.hints.2'],
      quiz: quiz('pot-pwm', [0, 2, 1]),
    },
    {
      id: 'dac-wave',
      n: 4,
      level: 'analog',
      language: 'arduino-cpp',
      code: {
        source: `// {{t:lessons.dac-wave.code.header}}
const int STEPS = {{p:steps}};

void setup() {
  Serial.begin(115200);
  analogWriteResolution(12);       // {{t:lessons.dac-wave.code.res}}
}

void loop() {
  for (int i = 0; i < STEPS; i++) {
    int level = (long)i * 4095 / (STEPS - 1);
    analogWrite(DAC, level);       // {{t:lessons.dac-wave.code.dac}}
    delay(10);
    if (i % (STEPS / 4) == 0) {
      Serial.print("DAC ");
      Serial.print(level);
      Serial.print(" = ");
      Serial.print(level * 5.0 / 4095, 2);
      Serial.println(" V");
    }
  }
}
`,
        libraries: [],
      },
      params: [
        {
          id: 'steps',
          kind: 'choice',
          label: 'lessons.dac-wave.params.steps.label',
          default: '64',
          options: [
            { value: '16', code: '16', label: 'lessons.dac-wave.params.steps.16' },
            { value: '64', code: '64', label: 'lessons.dac-wave.params.steps.64' },
            { value: '256', code: '256', label: 'lessons.dac-wave.params.steps.256' },
          ],
        },
      ],
      circuit: 'dac-wave',
      world: { inputs: [], script: [] },
      serial: { baud: 115200, sample: ['DAC 0 = 0.00 V', 'DAC 1040 = 1.27 V'] },
      // 256 steps take 2.6 s a sweep and print every 64th step, so four lines need about 2 s
      runMs: 3000,
      checks: [
        { kind: 'serial', match: '^DAC \\d+ = \\d\\.\\d\\d V$', regex: true, minCount: 4, byMs: 3000, label: 'lessons.dac-wave.checks.1' },
        { kind: 'serial', match: '^DAC 0 = 0\\.00 V', regex: true, minCount: 1, byMs: 700, label: 'lessons.dac-wave.checks.2' },
        { kind: 'code', must: ['analogWriteResolution(12)', 'DAC'], mustNot: [], label: 'lessons.dac-wave.checks.3' },
      ],
      variants: [],
      pins: [
        { pin: 'A0', to: 'lessons.dac-wave.pins.A0.to', role: 'lessons.dac-wave.pins.A0.role', color: 'purple' },
      ],
      callouts: [{ part: 'U1', text: 'lessons.dac-wave.callouts.U1' }],
      specs: [
        { label: 'lessons.dac-wave.specs.1.label', value: 'lessons.dac-wave.specs.1.value' },
        { label: 'lessons.dac-wave.specs.2.label', value: 'lessons.dac-wave.specs.2.value' },
      ],
      features: [
        { icon: 'board', text: 'lessons.dac-wave.features.1' },
        { icon: 'info', text: 'lessons.dac-wave.features.2' },
        { icon: 'warn', text: 'lessons.dac-wave.features.3' },
      ],
      title: 'lessons.dac-wave.title',
      lede: 'lessons.dac-wave.lede',
      steps: ['lessons.dac-wave.steps.1', 'lessons.dac-wave.steps.2', 'lessons.dac-wave.steps.3'],
      hints: ['lessons.dac-wave.hints.1', 'lessons.dac-wave.hints.2'],
      quiz: quiz('dac-wave', [1, 2, 0]),
    },
    {
      id: 'i2c-scan',
      n: 5,
      level: 'protocol',
      language: 'arduino-cpp',
      code: {
        source: `#include <Wire.h>
// {{t:lessons.i2c-scan.code.header}}
const int IMU = {{p:address}};

void setup() {
  Serial.begin(115200);
  Wire.begin();                    // {{t:lessons.i2c-scan.code.begin}}
  Serial.println("Scanning I2C...");
  int found = 0;
  for (int address = 1; address < 127; address++) {
    Wire.beginTransmission(address);
    if (Wire.endTransmission() == 0) {
      Serial.print("Found a device at 0x");
      Serial.println(address, HEX);
      found++;
    }
  }
  Serial.print("Devices found: ");
  Serial.println(found);
}

void loop() {
  Wire.beginTransmission(IMU);
  Wire.write(0x75);                // {{t:lessons.i2c-scan.code.whoami}}
  Wire.endTransmission(false);
  Wire.requestFrom(IMU, 1);
  if (Wire.available()) {
    Serial.print("WHO_AM_I = 0x");
    Serial.println(Wire.read(), HEX);
  } else {
    Serial.println("No answer");
  }
  delay(1000);
}
`,
        libraries: ['Wire'],
      },
      params: [
        {
          id: 'address',
          kind: 'choice',
          label: 'lessons.i2c-scan.params.address.label',
          default: '0x68',
          options: [
            { value: '0x68', code: '0x68', label: 'lessons.i2c-scan.params.address.0x68' },
            { value: '0x69', code: '0x69', label: 'lessons.i2c-scan.params.address.0x69', note: 'lessons.i2c-scan.params.address.0x69-note' },
          ],
        },
      ],
      circuit: null,
      world: {
        inputs: [
          {
            id: 'imu',
            quantity: 'tilt-deg',
            device: { kind: 'mpu6050', address: 0x68 },
            pins: ['A4', 'A5'],
            part: 'MPU1',
            min: -90,
            max: 90,
            step: 1,
            default: 0,
            unit: '°',
            gesture: 'tilt',
            label: 'lessons.i2c-scan.world.imu',
          },
        ],
        script: [],
      },
      serial: { baud: 115200, sample: ['Scanning I2C...', 'Found a device at 0x68', 'Devices found: 1', 'WHO_AM_I = 0x68'] },
      runMs: 2500,
      checks: [
        { kind: 'serial', match: 'Found a device at 0x68', regex: false, minCount: 1, byMs: 1000, label: 'lessons.i2c-scan.checks.1' },
        { kind: 'serial', match: '^WHO_AM_I = 0x68$', regex: true, minCount: 2, byMs: 2500, label: 'lessons.i2c-scan.checks.2' },
        { kind: 'code', must: ['Wire.begin', 'beginTransmission', 'requestFrom'], mustNot: [], label: 'lessons.i2c-scan.checks.3' },
      ],
      variants: [],
      pins: [
        { pin: 'SDA', to: 'lessons.i2c-scan.pins.SDA.to', role: 'lessons.i2c-scan.pins.SDA.role', color: 'blue' },
        { pin: 'SCL', to: 'lessons.i2c-scan.pins.SCL.to', role: 'lessons.i2c-scan.pins.SCL.role', color: 'yellow' },
        { pin: '5V', to: 'lessons.i2c-scan.pins.5V.to', role: 'lessons.i2c-scan.pins.5V.role', color: 'red' },
        { pin: 'GND', to: 'lessons.i2c-scan.pins.GND.to', role: 'lessons.i2c-scan.pins.GND.role', color: 'black' },
      ],
      callouts: [{ part: 'JDIGITAL_H', text: 'lessons.i2c-scan.callouts.JDIGITAL_H' }],
      specs: [
        { label: 'lessons.i2c-scan.specs.1.label', value: 'lessons.i2c-scan.specs.1.value' },
        { label: 'lessons.i2c-scan.specs.2.label', value: 'lessons.i2c-scan.specs.2.value' },
      ],
      features: [
        { icon: 'board', text: 'lessons.i2c-scan.features.1' },
        { icon: 'info', text: 'lessons.i2c-scan.features.2' },
        { icon: 'warn', text: 'lessons.i2c-scan.features.3' },
      ],
      title: 'lessons.i2c-scan.title',
      lede: 'lessons.i2c-scan.lede',
      steps: ['lessons.i2c-scan.steps.1', 'lessons.i2c-scan.steps.2', 'lessons.i2c-scan.steps.3'],
      hints: ['lessons.i2c-scan.hints.1', 'lessons.i2c-scan.hints.2'],
      quiz: quiz('i2c-scan', [2, 1, 0]),
    },
    {
      id: 'wifi',
      n: 6,
      level: 'wireless',
      language: 'arduino-cpp',
      code: {
        source: `#include "WiFiS3.h"
// {{t:lessons.wifi.code.header}}
const char SSID[] = "{{p:ssid}}";
const char PASS[] = "simlab-demo";    // {{t:lessons.wifi.code.pass}}

void setup() {
  Serial.begin(115200);
  Serial.print("Connecting to ");
  Serial.println(SSID);
  WiFi.begin(SSID, PASS);
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 10000) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("Connected, IP ");
    Serial.println(WiFi.localIP());
    Serial.print("Signal ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  } else {
    Serial.println("Not connected: check the name and password");
  }
}

void loop() {
}
`,
        libraries: ['WiFiS3'],
      },
      params: [
        {
          id: 'ssid',
          kind: 'choice',
          label: 'lessons.wifi.params.ssid.label',
          default: 'SimLab',
          options: [
            { value: 'SimLab', code: 'SimLab', label: 'lessons.wifi.params.ssid.SimLab' },
            { value: 'Workshop-5G', code: 'Workshop-5G', label: 'lessons.wifi.params.ssid.Workshop-5G', note: 'lessons.wifi.params.ssid.Workshop-5G-note' },
          ],
        },
      ],
      circuit: null,
      world: {
        inputs: [
          {
            id: 'ap',
            quantity: 'request',
            device: { kind: 'network', ssid: 'SimLab', ip: '192.168.4.1', requests: [] },
            pins: [],
            part: 'M1',
            min: 0,
            max: 0,
            step: 1,
            default: 0,
            gesture: 'tap',
            label: 'lessons.wifi.world.ap',
          },
        ],
        script: [],
      },
      serial: { baud: 115200, sample: ['Connecting to SimLab', '...', 'Connected, IP 192.168.4.166', 'Signal -55 dBm'] },
      runMs: 4000,
      checks: [
        { kind: 'serial', match: '^Connected, IP 192\\.168\\.4\\.\\d+$', regex: true, minCount: 1, byMs: 4000, label: 'lessons.wifi.checks.1' },
        { kind: 'serial', match: '^Signal -\\d+ dBm$', regex: true, minCount: 1, byMs: 4000, label: 'lessons.wifi.checks.2' },
        { kind: 'code', must: ['WiFiS3.h', 'WiFi.begin', 'WL_CONNECTED'], mustNot: [], label: 'lessons.wifi.checks.3' },
      ],
      variants: ['wifi'],
      pins: [],
      callouts: [
        { part: 'M1', text: 'lessons.wifi.callouts.M1' },
        { part: 'U4', text: 'lessons.wifi.callouts.U4' },
      ],
      specs: [
        { label: 'lessons.wifi.specs.1.label', value: 'lessons.wifi.specs.1.value' },
        { label: 'lessons.wifi.specs.2.label', value: 'lessons.wifi.specs.2.value' },
      ],
      features: [
        { icon: 'globe', text: 'lessons.wifi.features.1' },
        { icon: 'info', text: 'lessons.wifi.features.2' },
        { icon: 'tip', text: 'lessons.wifi.features.3' },
      ],
      title: 'lessons.wifi.title',
      lede: 'lessons.wifi.lede',
      steps: ['lessons.wifi.steps.1', 'lessons.wifi.steps.2', 'lessons.wifi.steps.3'],
      hints: ['lessons.wifi.hints.1', 'lessons.wifi.hints.2'],
      quiz: quiz('wifi', [0, 2, 1]),
    },
    {
      id: 'matrix',
      n: 7,
      level: 'project',
      language: 'arduino-cpp',
      code: {
        source: `#include "Arduino_LED_Matrix.h"
// {{t:lessons.matrix.code.header}}
ArduinoLEDMatrix matrix;

uint8_t heart[8][12] = {
  { 0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0 },
  { 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1 },
  { 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1 },
  { 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0 },
  { 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0 },
  { 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0 },
  { 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0 },
  { 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0 }
};

void setup() {
  Serial.begin(115200);
  matrix.begin();                  // {{t:lessons.matrix.code.begin}}
  Serial.println("Matrix ready");
}

void loop() {
  matrix.renderBitmap(heart, 8, 12);   // {{t:lessons.matrix.code.render}}
  delay({{p:beat}});
  matrix.clear();
  delay({{p:beat}});
}
`,
        libraries: ['Arduino_LED_Matrix'],
      },
      params: [{ id: 'beat', kind: 'number', label: 'lessons.matrix.params.beat.label', default: 500, min: 100, max: 1500, step: 100, unit: 'ms' }],
      circuit: null,
      world: { inputs: [], script: [] },
      serial: { baud: 115200, sample: ['Matrix ready'] },
      runMs: 2500,
      checks: [
        { kind: 'serial', match: 'Matrix ready', regex: false, minCount: 1, byMs: 500, label: 'lessons.matrix.checks.1' },
        { kind: 'runs', minMs: 2000, label: 'lessons.matrix.checks.2' },
        { kind: 'code', must: ['matrix.begin()', 'renderBitmap'], mustNot: [], label: 'lessons.matrix.checks.3' },
      ],
      variants: ['wifi'],
      pins: [],
      callouts: [{ part: 'U_LEDMATRIX', text: 'lessons.matrix.callouts.U_LEDMATRIX' }],
      specs: [
        { label: 'lessons.matrix.specs.1.label', value: 'lessons.matrix.specs.1.value' },
        { label: 'lessons.matrix.specs.2.label', value: 'lessons.matrix.specs.2.value' },
      ],
      features: [
        { icon: 'board', text: 'lessons.matrix.features.1' },
        { icon: 'info', text: 'lessons.matrix.features.2' },
        { icon: 'tip', text: 'lessons.matrix.features.3' },
      ],
      title: 'lessons.matrix.title',
      lede: 'lessons.matrix.lede',
      steps: ['lessons.matrix.steps.1', 'lessons.matrix.steps.2', 'lessons.matrix.steps.3'],
      hints: ['lessons.matrix.hints.1', 'lessons.matrix.hints.2'],
      quiz: quiz('matrix', [1, 0, 2]),
    },
  ],

  serial: { baud: 115200, sample: ['UNO R4 Minima ready', 'hello from the R4 #1', 'hello from the R4 #2'] },

  sources: [
    { title: 'Arduino UNO R4 Minima datasheet (ABX00080)', url: 'https://docs.arduino.cc/resources/datasheets/ABX00080-datasheet.pdf' },
    { title: 'Arduino UNO R4 WiFi datasheet (ABX00087)', url: 'https://docs.arduino.cc/resources/datasheets/ABX00087-datasheet.pdf' },
    { title: 'UNO R4 Minima CAD files (Altium board, schematic, BOM, STEP)', url: 'https://docs.arduino.cc/resources/cad-files/ABX00080-cad-files.zip' },
    { title: 'UNO R4 WiFi CAD files (Altium board, schematic, BOM, STEP)', url: 'https://docs.arduino.cc/resources/cad-files/ABX00087-cad-files.zip' },
    { title: 'UNO R4 Minima schematics', url: 'https://docs.arduino.cc/resources/schematics/ABX00080-schematics.pdf' },
    { title: 'UNO R4 WiFi schematics', url: 'https://docs.arduino.cc/resources/schematics/ABX00087-schematics.pdf' },
    { title: 'UNO R4 Minima full pinout', url: 'https://docs.arduino.cc/resources/pinouts/ABX00080-full-pinout.pdf' },
    { title: 'UNO R4 WiFi full pinout', url: 'https://docs.arduino.cc/resources/pinouts/ABX00087-full-pinout.pdf' },
    { title: 'Arduino Renesas core (variants, LED matrix, WiFiS3, analog)', url: 'https://github.com/arduino/ArduinoCore-renesas' },
    { title: 'Renesas RA4M1 group', url: 'https://www.renesas.com/en/products/microcontrollers-microprocessors/ra-cortex-m-mcus/ra4m1-32-bit-microcontrollers-48mhz-arm-cortex-m4-and-lcd-controller-and-cap-touch-hmi' },
    { title: 'Espressif ESP32-S3-MINI-1 datasheet', url: 'https://www.espressif.com/sites/default/files/documentation/esp32-s3-mini-1_mini-1u_datasheet_en.pdf' },
    { title: 'Renesas ISL854102 buck regulator', url: 'https://www.renesas.com/en/products/power-management/dc-dc-converters/isl854102' },
    { title: 'UNO R4 WiFi USB bridge firmware', url: 'https://github.com/arduino/uno-r4-wifi-usb-bridge' },
  ],
} satisfies BoardContent;

export default board;
