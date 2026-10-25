// ST NUCLEO-F401RE (MB1136 rev C, assembly C-04). Facts: docs/facts/nucleo-f401re.md (geometry, nets and parts from
// ST's MB1136 Altium board file and C-04 BOM; pins and limits from UM1724 and DS10086; STM32duino names from its
// NUCLEO_F401RE variant). Figure: figures/boards/nucleo-f401re.js; part ids, nets, circuit keys (= lesson ids) and
// fault ids here match that file exactly. Sketches are STM32duino Arduino C++, Serial over the ST-LINK at 115200.
import type { BoardContent, PartRole, PinCap, PinRow, Quiz } from '@/content/schema';

const IO = 3.3;

/** A 5 V tolerant GPIO (every GPIO on the LQFP64 is FT while it is a digital pin). */
const gpio = (header: string, pin: string, label: string, net: string, functions: string[], caps: PinCap[] = ['digital'], note?: string): PinRow => ({
  header, pin, label, functions, caps, volts: IO, fiveVoltTolerant: true, maxCurrentMa: 20, net, ...(note ? { note } : {}),
});
/** An ADC pin: in analog mode it loses its 5 V tolerance (4.0 V absolute maximum). */
const adc = (header: string, pin: string, label: string, net: string, functions: string[]): PinRow => ({
  header, pin, label, functions, caps: ['digital', 'analog-in'], volts: IO, fiveVoltTolerant: false, maxCurrentMa: 20, net, note: 'pins.analog',
});
const power = (header: string, pin: string, label: string, net: string, volts: number | null, functions: string[], note?: string, maxCurrentMa?: number): PinRow => ({
  header, pin, label, functions, caps: ['power'], volts, net, ...(maxCurrentMa ? { maxCurrentMa } : {}), ...(note ? { note } : {}),
});
const gnd = (header: string, pin: string, label = 'GND'): PinRow => ({ header, pin, label, functions: ['GND'], caps: ['gnd'], volts: null, net: 'GND' });
const nc = (header: string, pin: string, label: string, functions: string[] = [], note?: string): PinRow => ({
  header, pin, label, functions, caps: ['nc'], volts: null, net: 'NC', ...(note ? { note } : {}),
});

const cn6: PinRow[] = [
  nc('CN6', '1', 'NC'),
  power('CN6', '2', 'IOREF', '3V3', 3.3, ['I/O reference for shields (+3V3)'], 'pins.ioref'),
  { header: 'CN6', pin: '3', label: 'NRST', functions: ['RESET (active low)'], caps: ['reset'], volts: IO, net: 'NRST', note: 'pins.nrst' },
  power('CN6', '4', '3V3', '3V3', 3.3, ['+3V3 from the LD39050 (U4)'], 'pins.3v3', 500),
  power('CN6', '5', '5V', '5V', 5, ['+5V rail, output'], 'pins.5v'),
  gnd('CN6', '6'),
  gnd('CN6', '7'),
  power('CN6', '8', 'VIN', 'VIN', null, ['7-12 V into the LD1117 (U3)'], 'pins.vin'),
];

const cn8: PinRow[] = [
  adc('CN8', '1', 'A0', 'A0', ['PA0', 'ADC1_IN0']),
  adc('CN8', '2', 'A1', 'A1', ['PA1', 'ADC1_IN1']),
  adc('CN8', '3', 'A2', 'A2', ['PA4', 'ADC1_IN4']),
  adc('CN8', '4', 'A3', 'A3', ['PB0', 'ADC1_IN8']),
  adc('CN8', '5', 'A4', 'A4', ['PC1', 'ADC1_IN11']),
  adc('CN8', '6', 'A5', 'A5', ['PC0', 'ADC1_IN10']),
];

const cn5: PinRow[] = [
  gpio('CN5', '1', 'D8', 'D8', ['PA9', 'USART1 TX'], ['digital', 'interrupt', 'uart']),
  gpio('CN5', '2', 'D9', 'D9', ['PC7', 'PWM TIM3_CH2 (1 kHz)'], ['digital', 'interrupt', 'pwm']),
  gpio('CN5', '3', 'D10', 'D10', ['PB6', 'PWM TIM4_CH1', 'SPI CS'], ['digital', 'interrupt', 'pwm', 'spi']),
  gpio('CN5', '4', 'D11', 'D11', ['PA7', 'PWM TIM1_CH1N', 'SPI1 MOSI'], ['digital', 'interrupt', 'pwm', 'spi']),
  gpio('CN5', '5', 'D12', 'D12', ['PA6', 'SPI1 MISO'], ['digital', 'interrupt', 'spi']),
  gpio('CN5', '6', 'D13', 'D13', ['PA5', 'SPI1 SCK', 'LD2'], ['digital', 'interrupt', 'spi', 'led'], 'pins.d13'),
  gnd('CN5', '7'),
  power('CN5', '8', 'AVDD', 'AVDD', 3.3, ['VDDA / VREF+ (analog supply and ADC reference)'], 'pins.avdd'),
  gpio('CN5', '9', 'D14', 'D14', ['PB9', 'I2C1 SDA'], ['digital', 'interrupt', 'i2c'], 'pins.i2c'),
  gpio('CN5', '10', 'D15', 'D15', ['PB8', 'I2C1 SCL'], ['digital', 'interrupt', 'i2c'], 'pins.i2c'),
];

const cn9: PinRow[] = [
  nc('CN9', '1', 'D0', ['PA3', 'USART2 RX'], 'pins.d0d1'),
  nc('CN9', '2', 'D1', ['PA2', 'USART2 TX'], 'pins.d0d1'),
  gpio('CN9', '3', 'D2', 'D2', ['PA10', 'USART1 RX'], ['digital', 'interrupt', 'uart']),
  gpio('CN9', '4', 'D3', 'D3', ['PB3', 'PWM TIM2_CH2', 'SWO'], ['digital', 'interrupt', 'pwm']),
  gpio('CN9', '5', 'D4', 'D4', ['PB5'], ['digital', 'interrupt']),
  gpio('CN9', '6', 'D5', 'D5', ['PB4', 'PWM TIM3_CH1'], ['digital', 'interrupt', 'pwm']),
  gpio('CN9', '7', 'D6', 'D6', ['PB10', 'PWM TIM2_CH3'], ['digital', 'interrupt', 'pwm']),
  gpio('CN9', '8', 'D7', 'D7', ['PA8'], ['digital', 'interrupt']),
];

// ST morpho headers: odd pins in one column, even pins in the other. Arduino pins repeat here under their port names.
const cn7: PinRow[] = [
  gpio('CN7', '1', 'PC10', 'PC10', ['GPIO']),
  gpio('CN7', '2', 'PC11', 'PC11', ['GPIO']),
  gpio('CN7', '3', 'PC12', 'PC12', ['GPIO']),
  gpio('CN7', '4', 'PD2', 'PD2', ['GPIO']),
  power('CN7', '5', 'VDD', 'VDD', 3.3, ['MCU supply, after JP6'], 'pins.vdd'),
  power('CN7', '6', 'E5V', 'E5V', 5, ['External 5 V in (4.75-5.25 V, JP5 on 2-3)'], 'pins.e5v'),
  { header: 'CN7', pin: '7', label: 'BOOT0', functions: ['BOOT0 (low = run from flash)'], caps: ['strapping'], volts: IO, net: 'BOOT0', note: 'pins.boot0' },
  gnd('CN7', '8'),
  nc('CN7', '9', '-'),
  nc('CN7', '10', '-'),
  nc('CN7', '11', '-'),
  power('CN7', '12', 'IOREF', '3V3', 3.3, ['I/O reference (+3V3)'], 'pins.ioref'),
  gpio('CN7', '13', 'PA13', 'PA13', ['SWDIO'], ['swd'], 'pins.swd'),
  { header: 'CN7', pin: '14', label: 'RESET', functions: ['NRST (active low)'], caps: ['reset'], volts: IO, net: 'NRST', note: 'pins.nrst' },
  gpio('CN7', '15', 'PA14', 'PA14', ['SWCLK'], ['swd'], 'pins.swd'),
  power('CN7', '16', '+3.3V', '3V3', 3.3, ['+3V3 from the LD39050 (U4)'], 'pins.3v3', 500),
  gpio('CN7', '17', 'PA15', 'PA15', ['GPIO']),
  power('CN7', '18', '+5V', '5V', 5, ['+5V rail, output'], 'pins.5v'),
  gnd('CN7', '19'),
  gnd('CN7', '20'),
  gpio('CN7', '21', 'PB7', 'PB7', ['GPIO']),
  gnd('CN7', '22'),
  { header: 'CN7', pin: '23', label: 'PC13', functions: ['B1 USER', 'USER_BTN'], caps: ['digital', 'interrupt'], volts: IO, fiveVoltTolerant: true, maxCurrentMa: 3, net: 'PC13', note: 'pins.pc13' },
  power('CN7', '24', 'VIN', 'VIN', null, ['7-12 V into the LD1117 (U3)'], 'pins.vin'),
  nc('CN7', '25', 'PC14', ['LSE crystal X2'], 'pins.lse'),
  nc('CN7', '26', '-'),
  nc('CN7', '27', 'PC15', ['LSE crystal X2'], 'pins.lse'),
  adc('CN7', '28', 'PA0', 'A0', ['A0', 'ADC1_IN0']),
  gpio('CN7', '29', 'PH0', 'PH0', ['OSC_IN (8 MHz clock from the ST-LINK)'], ['clock'], 'pins.hse'),
  adc('CN7', '30', 'PA1', 'A1', ['A1', 'ADC1_IN1']),
  gpio('CN7', '31', 'PH1', 'PH1', ['OSC_OUT'], ['clock'], 'pins.hse'),
  adc('CN7', '32', 'PA4', 'A2', ['A2', 'ADC1_IN4']),
  power('CN7', '33', 'VBAT', 'VBAT', 3.3, ['RTC backup supply, tied to VDD'], 'pins.vbat'),
  adc('CN7', '34', 'PB0', 'A3', ['A3', 'ADC1_IN8']),
  gpio('CN7', '35', 'PC2', 'PC2', ['GPIO']),
  adc('CN7', '36', 'PC1', 'A4', ['A4', 'ADC1_IN11']),
  gpio('CN7', '37', 'PC3', 'PC3', ['GPIO']),
  adc('CN7', '38', 'PC0', 'A5', ['A5', 'ADC1_IN10']),
];

const cn10: PinRow[] = [
  gpio('CN10', '1', 'PC9', 'PC9', ['GPIO']),
  gpio('CN10', '2', 'PC8', 'PC8', ['GPIO']),
  gpio('CN10', '3', 'PB8', 'D15', ['D15', 'I2C1 SCL'], ['digital', 'i2c']),
  gpio('CN10', '4', 'PC6', 'PC6', ['GPIO']),
  gpio('CN10', '5', 'PB9', 'D14', ['D14', 'I2C1 SDA'], ['digital', 'i2c']),
  gpio('CN10', '6', 'PC5', 'PC5', ['GPIO']),
  power('CN10', '7', 'AVDD', 'AVDD', 3.3, ['VDDA / VREF+'], 'pins.avdd'),
  power('CN10', '8', 'U5V', 'U5V', 5, ['USB 5 V before the T2 switch'], 'pins.u5v'),
  gnd('CN10', '9'),
  nc('CN10', '10', '-'),
  gpio('CN10', '11', 'PA5', 'D13', ['D13', 'SPI1 SCK', 'LD2'], ['digital', 'spi', 'led']),
  gpio('CN10', '12', 'PA12', 'PA12', ['USB OTG FS D+'], ['digital', 'usb']),
  gpio('CN10', '13', 'PA6', 'D12', ['D12', 'SPI1 MISO'], ['digital', 'spi']),
  gpio('CN10', '14', 'PA11', 'PA11', ['USB OTG FS D-'], ['digital', 'usb']),
  gpio('CN10', '15', 'PA7', 'D11', ['D11', 'SPI1 MOSI', 'PWM TIM1_CH1N'], ['digital', 'spi', 'pwm']),
  gpio('CN10', '16', 'PB12', 'PB12', ['GPIO']),
  gpio('CN10', '17', 'PB6', 'D10', ['D10', 'PWM TIM4_CH1'], ['digital', 'pwm']),
  nc('CN10', '18', '-'),
  gpio('CN10', '19', 'PC7', 'D9', ['D9', 'PWM TIM3_CH2'], ['digital', 'pwm']),
  gnd('CN10', '20'),
  gpio('CN10', '21', 'PA9', 'D8', ['D8', 'USART1 TX'], ['digital', 'uart']),
  gpio('CN10', '22', 'PB2', 'PB2', ['BOOT1'], ['digital']),
  gpio('CN10', '23', 'PA8', 'D7', ['D7'], ['digital']),
  gpio('CN10', '24', 'PB1', 'PB1', ['GPIO']),
  gpio('CN10', '25', 'PB10', 'D6', ['D6', 'PWM TIM2_CH3'], ['digital', 'pwm']),
  gpio('CN10', '26', 'PB15', 'PB15', ['GPIO']),
  gpio('CN10', '27', 'PB4', 'D5', ['D5', 'PWM TIM3_CH1'], ['digital', 'pwm']),
  gpio('CN10', '28', 'PB14', 'PB14', ['GPIO']),
  gpio('CN10', '29', 'PB5', 'D4', ['D4'], ['digital']),
  gpio('CN10', '30', 'PB13', 'PB13', ['GPIO']),
  gpio('CN10', '31', 'PB3', 'D3', ['D3', 'PWM TIM2_CH2', 'SWO'], ['digital', 'pwm']),
  gnd('CN10', '32', 'AGND'),
  gpio('CN10', '33', 'PA10', 'D2', ['D2', 'USART1 RX'], ['digital', 'uart']),
  gpio('CN10', '34', 'PC4', 'PC4', ['GPIO']),
  nc('CN10', '35', 'PA2', ['USART2 TX'], 'pins.d0d1'),
  nc('CN10', '36', '-'),
  nc('CN10', '37', 'PA3', ['USART2 RX'], 'pins.d0d1'),
  nc('CN10', '38', '-'),
];

// The ST-LINK's own SWD output, for programming another board once the CN2 caps are off
const cn4: PinRow[] = [
  { header: 'CN4', pin: '1', label: 'VDD_TARGET', functions: ['target voltage sense'], caps: ['swd'], volts: IO, net: 'VDD_TARGET', note: 'pins.cn4' },
  { header: 'CN4', pin: '2', label: 'SWCLK', functions: ['SWD clock out'], caps: ['swd'], volts: IO, net: 'SWCLK_EXT', note: 'pins.cn4' },
  gnd('CN4', '3'),
  { header: 'CN4', pin: '4', label: 'SWDIO', functions: ['SWD data'], caps: ['swd'], volts: IO, net: 'SWDIO_EXT', note: 'pins.cn4' },
  { header: 'CN4', pin: '5', label: 'NRST', functions: ['target reset out'], caps: ['swd', 'reset'], volts: IO, net: 'NRST_EXT', note: 'pins.cn4' },
  { header: 'CN4', pin: '6', label: 'SWO', functions: ['trace in'], caps: ['swd'], volts: IO, net: 'SWO', note: 'pins.cn4' },
];

const quiz = (lesson: string, answers: [number, number, number]): Quiz => ({
  id: `${lesson}-quiz`,
  afterStep: null,
  questions: answers.map((answer, i) => {
    const key = `lessons.${lesson}.quiz.q${i + 1}`;
    return { id: `q${i + 1}`, q: `${key}.q`, options: [`${key}.options.1`, `${key}.options.2`, `${key}.options.3`], answer, why: `${key}.why` };
  }),
});

/** title/symptom/explanation/fix keys of one failure */
const failText = (id: string) => ({
  title: `failures.${id}.title`, symptom: `failures.${id}.symptom`, explanation: `failures.${id}.explanation`, fix: `failures.${id}.fix`,
});
const stepText = (id: string, refusal = false) => ({
  title: `assembly.${id}.title`, body: `assembly.${id}.body`, ...(refusal ? { refusal: `assembly.${id}.refusal` } : {}),
});
const lessonText = (id: string, steps: number, hints: number) => ({
  title: `lessons.${id}.title`, lede: `lessons.${id}.lede`,
  steps: Array.from({ length: steps }, (_, i) => `lessons.${id}.steps.${i + 1}`),
  hints: Array.from({ length: hints }, (_, i) => `lessons.${id}.hints.${i + 1}`),
});
const specs = (id: string, n: number) => Array.from({ length: n }, (_, i) => ({ label: `lessons.${id}.specs.${i + 1}.label`, value: `lessons.${id}.specs.${i + 1}.value` }));
const part = (id: string, short: string, role: PartRole) => ({ id, short, role, name: `parts.${id}.name`, what: `parts.${id}.what` });

const nucleo: BoardContent = {
  lab: 'board',
  id: 'nucleo-f401re',
  maker: 'STMicroelectronics',
  variants: [],
  mcu: {
    part: 'STM32F401RET6',
    core: 'Arm Cortex-M4F',
    cores: 1,
    clockHz: 84_000_000,
    flashBytes: 524_288,
    ramBytes: 98_304,
    target: 'stm32f4',
    adcBits: 12,
    wireless: [],
    companions: [{ part: 'STM32F103CBT6', role: 'mcu.stlink' }],
  },
  logicVolts: IO,
  power: {
    inputs: [
      { id: 'usb', connector: 'mini-usb', part: 'CN1', volts: { min: 4.75, max: 5.25 }, maxCurrentMa: 300, reverseProtected: true, protection: 'power.usb.protection' },
      { id: 'vin', connector: 'header-pin', part: 'CN6', volts: { min: 7, max: 15, recommended: [7, 12] }, maxCurrentMa: 800, reverseProtected: false, protection: 'power.vin.protection' },
      { id: 'e5v', connector: 'header-pin', part: 'CN7', volts: { min: 4.75, max: 5.25 }, maxCurrentMa: 500, reverseProtected: false, protection: 'power.e5v.protection' },
    ],
    rails: [
      { name: 'U5V', volts: 5, from: 'CN1', note: 'power.rails.u5v' },
      { name: 'E5V', volts: 5, from: 'D4', note: 'power.rails.e5v' },
      { name: '5V', volts: 5, from: 'JP5', note: 'power.rails.5v' },
      { name: '3V3', volts: 3.3, maxCurrentMa: 500, from: 'U4', note: 'power.rails.3v3' },
      { name: 'VDD', volts: 3.3, from: 'JP6', note: 'power.rails.vdd' },
      { name: '3V3_ST', volts: 3.3, maxCurrentMa: 150, from: 'U1', note: 'power.rails.3v3st' },
    ],
    io: { perPinMa: 20, absMaxPerPinMa: 25, totalMa: 120, note: 'power.io' },
    brownoutVolts: 1.7,
    idleMa: 45,
  },
  pinout: [...cn6, ...cn8, ...cn5, ...cn9, ...cn7, ...cn10, ...cn4],
  leds: [
    { id: 'LD2', label: 'LD2', color: 'green', drivenBy: 'D13', activeLow: false, note: 'leds.LD2' },
    { id: 'LD3', label: 'PWR', color: 'red', drivenBy: 'power', activeLow: false, note: 'leds.LD3' },
    { id: 'LD1', label: 'COM', color: 'red', drivenBy: 'status', activeLow: false, note: 'leds.LD1' },
  ],
  controls: [
    { id: 'B1', label: 'USER', kind: 'user-button', pin: 'PC13', activeLow: true, act: 'ctl-b1', effect: 'controls.B1' },
    { id: 'B2', label: 'RESET', kind: 'reset', pin: 'NRST', activeLow: true, act: 'ctl-b2', effect: 'controls.B2' },
  ],
  displays: [],
  figure: {
    page: '/figures/boards/nucleo-f401re.html',
    sheets: ['board', 'breadboard', 'schematic', 'power'],
    parts: [
      part('U5', 'MCU', 'mcu'),
      part('U2', 'ST-LINK', 'debugger'),
      part('X1', '8 MHz', 'crystal'),
      part('X2', '32 kHz', 'crystal'),
      part('X3', 'X3', 'crystal'),
      part('CN1', 'USB', 'connector'),
      part('T2', 'USB SWITCH', 'switch'),
      part('T1', 'T1', 'other'),
      part('U1', 'ST 3V3', 'regulator'),
      part('D2', 'D2', 'protection'),
      part('D3', 'D3', 'protection'),
      part('U3', '5V REG', 'regulator'),
      part('D4', 'SCHOTTKY', 'protection'),
      part('C16', 'C16', 'passive'),
      part('C17', 'C17', 'passive'),
      part('U4', '3V3 REG', 'regulator'),
      part('SB2', 'SB2', 'jumper'),
      part('JP5', 'JP5', 'jumper'),
      part('JP5_CAP', 'JP5 CAP', 'jumper'),
      part('JP6', 'JP6 IDD', 'jumper'),
      part('JP6_CAP', 'JP6 CAP', 'jumper'),
      part('CN2', 'CN2', 'jumper'),
      part('CN2_CAPS', 'CN2 CAPS', 'jumper'),
      part('JP1', 'JP1', 'jumper'),
      part('LD1', 'LD1 COM', 'led'),
      part('LD2', 'LD2', 'led'),
      part('R31', 'R31', 'passive'),
      part('LD3', 'LD3 PWR', 'led'),
      part('R32', 'R32', 'passive'),
      part('B1', 'B1 USER', 'button'),
      part('R30', 'R30', 'passive'),
      part('R29', 'R29', 'passive'),
      part('C15', 'C15', 'passive'),
      part('B2', 'B2 RESET', 'button'),
      part('C14', 'C14', 'passive'),
      part('L1', 'L1', 'passive'),
      part('CN5', 'D8-D15', 'header'),
      part('CN6', 'POWER', 'header'),
      part('CN8', 'A0-A5', 'header'),
      part('CN9', 'D0-D7', 'header'),
      part('CN7', 'CN7', 'header'),
      part('CN10', 'CN10', 'header'),
      part('CN4', 'SWD', 'header'),
      part('CN3', 'CN3', 'header'),
      part('SLOTS', 'SLOTS', 'mechanical'),
      part('PASSIVES', '0603', 'passive'),
      part('SB', 'SB', 'jumper'),
    ],
  },
  wireables: [
    { part: 'led', supplyVolts: IO, note: 'wireables.led.note', caution: 'wireables.led.caution',
      connections: [{ from: 'A', to: 'D9', color: 'orange' }, { from: 'K', to: 'GND', color: 'black' }] },
    { part: 'push-button', supplyVolts: IO, note: 'wireables.push-button.note',
      connections: [{ from: '1', to: 'D2', color: 'blue' }, { from: '3', to: 'GND', color: 'black' }] },
    { part: 'potentiometer', supplyVolts: IO, note: 'wireables.potentiometer.note', caution: 'wireables.potentiometer.caution',
      connections: [{ from: '1', to: 'GND', color: 'black' }, { from: 'W', to: 'A0', color: 'yellow' }, { from: '3', to: '3V3', color: 'red' }] },
    { part: 'tmp36', supplyVolts: IO, note: 'wireables.tmp36.note',
      connections: [{ from: '+Vs', to: '3V3', color: 'red' }, { from: 'Vout', to: 'A1', color: 'yellow' }, { from: 'GND', to: 'GND', color: 'black' }] },
    { part: 'servo-sg90', supplyVolts: 5, note: 'wireables.servo-sg90.note', caution: 'wireables.servo-sg90.caution',
      connections: [{ from: 'SIG', to: 'D9', color: 'orange' }, { from: 'GND', to: 'GND', color: 'brown' }] },
    { part: 'hc-sr04', supplyVolts: 5, note: 'wireables.hc-sr04.note', caution: 'wireables.hc-sr04.caution',
      connections: [{ from: 'VCC', to: '5V', color: 'red' }, { from: 'TRIG', to: 'D7', color: 'yellow' }, { from: 'ECHO', to: 'D8', color: 'green' }, { from: 'GND', to: 'GND', color: 'black' }] },
    { part: 'mpu6050', supplyVolts: IO, note: 'wireables.mpu6050.note',
      connections: [{ from: 'VCC', to: '3V3', color: 'red' }, { from: 'GND', to: 'GND', color: 'black' }, { from: 'SCL', to: 'D15', color: 'yellow' }, { from: 'SDA', to: 'D14', color: 'blue' }] },
    { part: 'ssd1306', supplyVolts: IO, note: 'wireables.ssd1306.note',
      connections: [{ from: 'GND', to: 'GND', color: 'black' }, { from: 'VCC', to: '3V3', color: 'red' }, { from: 'SCL', to: 'D15', color: 'yellow' }, { from: 'SDA', to: 'D14', color: 'blue' }] },
  ],
  failures: [
    { id: 'reverse-vin', kind: 'reverse-polarity', trigger: { by: 'reverse', input: 'vin' },
      figure: { type: 'set', state: { power: 'vin', fault: 'reverse-polarity:vin' } },
      effect: { power: 'off', halts: true, damages: ['U3'] }, ...failText('reverse-vin') },
    { id: 'vin-overvoltage', kind: 'wrong-voltage', trigger: { by: 'power-input', input: 'vin', volts: 20 },
      figure: { type: 'set', state: { power: 'vin', fault: 'wrong-voltage:vin:20' } },
      effect: { power: 'off', halts: true, damages: ['U3'] }, ...failText('vin-overvoltage') },
    { id: 'reverse-e5v', kind: 'reverse-polarity', trigger: { by: 'reverse', input: 'e5v' },
      figure: { type: 'set', state: { power: 'e5v', fault: 'reverse-polarity:e5v' } },
      effect: { power: 'off', halts: true, damages: ['U4'] }, ...failText('reverse-e5v') },
    { id: 'e5v-overvoltage', kind: 'wrong-voltage', trigger: { by: 'power-input', input: 'e5v', volts: 9 },
      figure: { type: 'set', state: { power: 'e5v', fault: 'wrong-voltage:e5v:9' } },
      effect: { power: 'off', halts: true, damages: ['U4'] }, ...failText('e5v-overvoltage') },
    { id: 'short-5v', kind: 'short', trigger: { by: 'short', nets: ['5V', 'GND'] },
      figure: { type: 'set', state: { power: 'usb', fault: 'short:5V:GND' } },
      effect: { power: 'off', halts: true }, ...failText('short-5v') },
    { id: 'short-3v3', kind: 'short', trigger: { by: 'short', nets: ['3V3', 'GND'] },
      figure: { type: 'set', state: { power: 'usb', fault: 'short:3V3:GND' } },
      effect: { power: 'off', halts: true }, ...failText('short-3v3') },
    { id: 'jp6-off', kind: 'missing-part', trigger: { by: 'remove-part', part: 'JP6_CAP' },
      figure: { type: 'set', state: { power: 'usb', fault: 'missing:JP6_CAP' } },
      effect: { power: 'off', halts: true }, ...failText('jp6-off') },
    { id: 'jp5-off', kind: 'missing-part', trigger: { by: 'remove-part', part: 'JP5_CAP' },
      figure: { type: 'set', state: { power: 'usb', fault: 'missing:JP5_CAP' } },
      effect: { power: 'off', halts: true }, ...failText('jp5-off') },
    { id: 'cn2-off', kind: 'missing-part', trigger: { by: 'remove-part', part: 'CN2_CAPS' },
      figure: { type: 'set', state: { power: 'usb', fault: 'missing:CN2_CAPS' } },
      effect: { power: 'on', halts: false }, ...failText('cn2-off') },
    { id: 'reversed-d4', kind: 'reversed-part', trigger: { by: 'reverse-part', part: 'D4' },
      figure: { type: 'set', state: { power: 'vin', fault: 'reversed:D4' } },
      effect: { power: 'off', halts: true }, ...failText('reversed-d4') },
    { id: 'reversed-c16', kind: 'reversed-part', trigger: { by: 'reverse-part', part: 'C16' },
      figure: { type: 'set', state: { power: 'vin', fault: 'reversed:C16' } },
      effect: { power: 'off', halts: true, damages: ['C16'] }, ...failText('reversed-c16') },
    { id: 'brownout', kind: 'brownout', trigger: { by: 'load', rail: '5V', ma: 700, part: 'servo-sg90' },
      figure: { type: 'set', state: { power: 'usb', fault: 'brownout' } },
      effect: { power: 'resetting', halts: true }, ...failText('brownout') },
    { id: 'cold-usb', kind: 'cold-solder', trigger: { by: 'cold-joint', part: 'CN1' },
      figure: { type: 'set', state: { power: 'usb', fault: 'cold:CN1' } },
      effect: { power: 'resetting', halts: true }, ...failText('cold-usb') },
    { id: 'cold-d13', kind: 'cold-solder', trigger: { by: 'cold-joint', part: 'CN5', pin: 'CN5.6' },
      figure: { type: 'set', state: { power: 'usb', circuit: 'blink', fault: 'cold:CN5.6' } },
      effect: { power: 'on', halts: false, pins: { D13: 'noisy' } }, ...failText('cold-d13') },
  ],
  assembly: [
    { id: 'unplug', kind: 'build', action: { type: 'set', state: { power: null } }, done: { power: null }, major: false, ...stepText('unplug') },
    { id: 'strip', kind: 'build', action: { type: 'press', id: 'strip' }, done: { build: 'bare' }, major: false, ...stepText('strip', true) },
    { id: 'reflow', kind: 'build', action: { type: 'press', id: 'pnp' }, done: { build: 'reflowed' }, major: false, ...stepText('reflow', true) },
    { id: 'low', kind: 'build', action: { type: 'press', id: 'place', choice: 'group-low' }, done: { build: 'tht' }, major: false, ...stepText('low', true) },
    { id: 'sockets', kind: 'build', action: { type: 'press', id: 'place', choice: 'group-tall' }, done: { 'missing.length': 3 }, major: false, ...stepText('sockets', true) },
    { id: 'solder', kind: 'build', action: { type: 'press', id: 'solder' }, done: { build: 'soldered' }, major: false, ...stepText('solder', true) },
    { id: 'jumpers', kind: 'build', action: { type: 'press', id: 'place', choice: 'group-last' }, done: { build: 'assembled' }, major: false, ...stepText('jumpers', true) },
    { id: 'power-up', kind: 'test', action: { type: 'set', state: { power: 'usb' } }, done: { status: 'running', 'leds.LD3': 1, 'leds.LD1': 1 }, major: true, ...stepText('power-up') },
    { id: 'rails', kind: 'test', action: null, done: { 'rails.5V': 5, 'rails.3V3': 3.3, 'rails.VDD': 3.3 }, major: false, ...stepText('rails') },
    { id: 'upload-hello', kind: 'test', action: { type: 'press', id: 'upload', choice: 'hello' }, done: { status: 'running', mode: 'hello' }, major: false, ...stepText('upload-hello', true) },
    { id: 'reset', kind: 'test', action: { type: 'press', id: 'ctl-b2' }, done: { 'controls.B2': 0, status: 'running' }, major: false, ...stepText('reset') },
  ],
  lessons: [
    {
      id: 'blink', n: 1, level: 'io', language: 'arduino-cpp',
      code: {
        libraries: [],
        source: `// {{t:lessons.blink.code.intro}}
// {{t:lessons.blink.code.resistor}} {{p:resistor}}
const int LED_PIN = LED_BUILTIN;  // D13 = PA5, {{t:lessons.blink.code.pin}}

void setup() {
  pinMode(LED_PIN, OUTPUT);
}

void loop() {
  digitalWrite(LED_PIN, HIGH);  // 3.3 V
  delay({{p:on}});
  digitalWrite(LED_PIN, LOW);   // 0 V
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
      serial: { baud: 115200, sample: [] },
      runMs: 9000,
      checks: [
        { kind: 'runs', minMs: 9000, label: 'lessons.blink.checks.1' },
        { kind: 'pin-toggles', pin: 'D13', periodMs: [100, 4100], minCycles: 1, label: 'lessons.blink.checks.2' },
        { kind: 'code', must: ['pinMode', 'digitalWrite', 'delay'], mustNot: [], label: 'lessons.blink.checks.3' },
      ],
      variants: [],
      pins: [
        { pin: 'D13', to: 'lessons.blink.pins.D13.to', role: 'lessons.blink.pins.D13.role', color: 'orange' },
        { pin: 'GND', to: 'lessons.blink.pins.GND.to', role: 'lessons.blink.pins.GND.role', color: 'black' },
      ],
      callouts: [
        { part: 'LD2', text: 'lessons.blink.callouts.LD2' },
        { part: 'R1', text: 'lessons.blink.callouts.R1' },
        { part: 'LED1', text: 'lessons.blink.callouts.LED1' },
      ],
      specs: specs('blink', 4),
      features: [
        { icon: 'board', text: 'lessons.blink.features.1' },
        { icon: 'tip', text: 'lessons.blink.features.2' },
        { icon: 'play', text: 'lessons.blink.features.3' },
      ],
      ...lessonText('blink', 3, 2),
      quiz: quiz('blink', [1, 0, 2]),
    },
    {
      id: 'user-button', n: 2, level: 'input', language: 'arduino-cpp',
      code: {
        libraries: [],
        source: `// {{t:lessons.user-button.code.intro}}
const int KNOB_PIN = A0;              // PA0
const int BITS = {{p:bits}};          // {{t:lessons.user-button.code.bits}}
const int FULL = (1 << BITS) - 1;     // {{t:lessons.user-button.code.full}}

void setup() {
  pinMode(USER_BTN, INPUT);           // PC13, {{t:lessons.user-button.code.pullup}}
  pinMode(LED_BUILTIN, OUTPUT);
  analogReadResolution(BITS);
  Serial.begin(115200);               // {{t:lessons.user-button.code.vcp}}
}

void loop() {
  bool pressed = digitalRead(USER_BTN) == LOW;  // {{t:lessons.user-button.code.low}}
  digitalWrite(LED_BUILTIN, pressed ? HIGH : LOW);

  int raw = analogRead(KNOB_PIN);
  float volts = raw * 3.3 / FULL;
  Serial.print("A0=");
  Serial.print(raw);
  Serial.print(" (");
  Serial.print(volts, 2);
  Serial.print(" V) B1=");
  Serial.println(pressed ? "DOWN" : "UP");
  delay({{p:period}});
}
`,
      },
      params: [
        { id: 'bits', kind: 'choice', label: 'lessons.user-button.params.bits.label', default: '12',
          options: [
            { value: '12', code: '12', label: 'lessons.user-button.params.bits.12', note: 'lessons.user-button.params.bits.12-note' },
            { value: '10', code: '10', label: 'lessons.user-button.params.bits.10', note: 'lessons.user-button.params.bits.10-note' },
          ] },
        { id: 'period', kind: 'number', label: 'lessons.user-button.params.period.label', default: 250, min: 50, max: 1000, step: 50, unit: 'ms' },
      ],
      circuit: 'user-button',
      world: {
        inputs: [
          { id: 'button', quantity: 'button', device: { kind: 'button', pull: 'external-up', bounceMs: 1 }, pins: ['PC13'], part: 'B1',
            min: 0, max: 1, step: 1, default: 0, gesture: 'press', label: 'lessons.user-button.world.button' },
          { id: 'knob', quantity: 'angle-deg', device: { kind: 'pot', ohms: 10000 }, pins: ['A0'], part: 'RV1',
            min: 0, max: 300, step: 1, default: 150, unit: '°', gesture: 'knob', label: 'lessons.user-button.world.knob' },
        ],
        script: [
          { t: 0, input: 'knob', value: 150 },
          { t: 1200, input: 'button', value: 1 },
          { t: 2200, input: 'button', value: 0 },
          { t: 2600, input: 'knob', value: 300 },
        ],
      },
      serial: { baud: 115200, sample: ['A0=2048 (1.65 V) B1=UP', 'A0=2048 (1.65 V) B1=DOWN', 'A0=4095 (3.30 V) B1=UP'] },
      runMs: 4000,
      checks: [
        { kind: 'runs', minMs: 4000, label: 'lessons.user-button.checks.1' },
        { kind: 'serial', match: 'A0=\\d+ \\(\\d\\.\\d\\d V\\) B1=UP', regex: true, minCount: 3, label: 'lessons.user-button.checks.2' },
        { kind: 'responds', after: { t: 1200, input: 'button', value: 1 }, pin: 'D13', withinMs: 1100, mode: 'out', v: [1, 1], label: 'lessons.user-button.checks.3' },
        { kind: 'serial', match: 'B1=DOWN', regex: false, minCount: 1, byMs: 2300, label: 'lessons.user-button.checks.4' },
        { kind: 'serial', match: 'A0=\\d+ \\(3\\.30 V\\)', regex: true, minCount: 1, label: 'lessons.user-button.checks.5' },
      ],
      variants: [],
      pins: [
        { pin: 'PC13', to: 'lessons.user-button.pins.PC13.to', role: 'lessons.user-button.pins.PC13.role', color: 'blue' },
        { pin: 'A0', to: 'lessons.user-button.pins.A0.to', role: 'lessons.user-button.pins.A0.role', color: 'yellow' },
        { pin: '3V3', to: 'lessons.user-button.pins.3V3.to', role: 'lessons.user-button.pins.3V3.role', color: 'red' },
        { pin: 'GND', to: 'lessons.user-button.pins.GND.to', role: 'lessons.user-button.pins.GND.role', color: 'black' },
      ],
      callouts: [
        { part: 'B1', text: 'lessons.user-button.callouts.B1' },
        { part: 'RV1', text: 'lessons.user-button.callouts.RV1' },
        { part: 'LD2', text: 'lessons.user-button.callouts.LD2' },
      ],
      specs: specs('user-button', 4),
      features: [
        { icon: 'play', text: 'lessons.user-button.features.1' },
        { icon: 'board', text: 'lessons.user-button.features.2' },
        { icon: 'warn', text: 'lessons.user-button.features.3' },
      ],
      ...lessonText('user-button', 3, 3),
      quiz: quiz('user-button', [2, 0, 1]),
    },
    {
      id: 'pwm-dimmer', n: 3, level: 'analog', language: 'arduino-cpp',
      code: {
        libraries: [],
        source: `// {{t:lessons.pwm-dimmer.code.intro}}
const int LED_PIN = 9;     // D9 = PC7, {{t:lessons.pwm-dimmer.code.pin}}
const int KNOB_PIN = A0;

void setup() {
  pinMode(LED_PIN, OUTPUT);
  analogReadResolution(12);  // 0..4095
  Serial.begin(115200);
}

void loop() {
  int raw = analogRead(KNOB_PIN);
  int duty = map(raw, 0, 4095, 0, 255);  // {{t:lessons.pwm-dimmer.code.map}}
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
        { id: 'period', kind: 'number', label: 'lessons.pwm-dimmer.params.period.label', default: 200, min: 20, max: 500, step: 10, unit: 'ms' },
      ],
      circuit: 'pwm-dimmer',
      world: {
        inputs: [
          { id: 'knob', quantity: 'angle-deg', device: { kind: 'pot', ohms: 10000 }, pins: ['A0'], part: 'RV1',
            min: 0, max: 300, step: 1, default: 75, unit: '°', gesture: 'knob', label: 'lessons.pwm-dimmer.world.knob' },
        ],
        script: [
          { t: 0, input: 'knob', value: 75 },
          { t: 1500, input: 'knob', value: 300 },
          { t: 3000, input: 'knob', value: 0 },
        ],
      },
      serial: { baud: 115200, sample: ['raw=1024 duty=63', 'raw=4095 duty=255', 'raw=0 duty=0'] },
      runMs: 4500,
      checks: [
        { kind: 'runs', minMs: 4500, label: 'lessons.pwm-dimmer.checks.1' },
        { kind: 'pwm', pin: 'D9', duty: [0.2, 0.3], atMs: 1000, label: 'lessons.pwm-dimmer.checks.2' },
        { kind: 'pwm', pin: 'D9', duty: [0.95, 1], atMs: 2500, label: 'lessons.pwm-dimmer.checks.3' },
        { kind: 'serial', match: 'raw=0 duty=0', regex: false, minCount: 1, label: 'lessons.pwm-dimmer.checks.4' },
      ],
      variants: [],
      pins: [
        { pin: 'D9', to: 'lessons.pwm-dimmer.pins.D9.to', role: 'lessons.pwm-dimmer.pins.D9.role', color: 'orange' },
        { pin: 'A0', to: 'lessons.pwm-dimmer.pins.A0.to', role: 'lessons.pwm-dimmer.pins.A0.role', color: 'yellow' },
        { pin: '3V3', to: 'lessons.pwm-dimmer.pins.3V3.to', role: 'lessons.pwm-dimmer.pins.3V3.role', color: 'red' },
        { pin: 'GND', to: 'lessons.pwm-dimmer.pins.GND.to', role: 'lessons.pwm-dimmer.pins.GND.role', color: 'black' },
      ],
      callouts: [
        { part: 'LED1', text: 'lessons.pwm-dimmer.callouts.LED1' },
        { part: 'RV1', text: 'lessons.pwm-dimmer.callouts.RV1' },
        { part: 'R1', text: 'lessons.pwm-dimmer.callouts.R1' },
      ],
      specs: specs('pwm-dimmer', 3),
      features: [
        { icon: 'play', text: 'lessons.pwm-dimmer.features.1' },
        { icon: 'tip', text: 'lessons.pwm-dimmer.features.2' },
        { icon: 'warn', text: 'lessons.pwm-dimmer.features.3' },
      ],
      ...lessonText('pwm-dimmer', 3, 2),
      quiz: quiz('pwm-dimmer', [0, 2, 1]),
    },
    {
      id: 'i2c-scan', n: 4, level: 'protocol', language: 'arduino-cpp',
      code: {
        libraries: ['Wire'],
        source: `// {{t:lessons.i2c-scan.code.intro}}
#include <Wire.h>

const byte MPU_ADDR = 0x68;   // {{t:lessons.i2c-scan.code.addr}}
const byte WHO_AM_I = 0x75;

void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
  Serial.begin(115200);
  Wire.begin();               // {{t:lessons.i2c-scan.code.pins}}
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
  Wire.endTransmission(false);  // {{t:lessons.i2c-scan.code.restart}}
  Wire.requestFrom(MPU_ADDR, (byte)1);
  if (Wire.available()) {
    Serial.print("WHO_AM_I = 0x");
    Serial.println(Wire.read(), HEX);
  }
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);  // {{t:lessons.i2c-scan.code.alive}}
  delay({{p:blink}});
  digitalWrite(LED_BUILTIN, LOW);
  delay({{p:blink}});
}
`,
      },
      params: [
        { id: 'blink', kind: 'number', label: 'lessons.i2c-scan.params.blink.label', default: 500, min: 100, max: 1000, step: 100, unit: 'ms' },
      ],
      circuit: 'i2c-scan',
      world: {
        inputs: [
          { id: 'imu', quantity: 'tilt-deg', device: { kind: 'mpu6050', address: 0x68 }, pins: ['D14', 'D15'], part: 'MPU1',
            min: -90, max: 90, step: 1, default: 0, unit: '°', gesture: 'tilt', label: 'lessons.i2c-scan.world.imu' },
        ],
        script: [],
      },
      serial: { baud: 115200, sample: ['Found device at 0x68', 'Devices: 1', 'WHO_AM_I = 0x68'] },
      runMs: 3000,
      checks: [
        { kind: 'runs', minMs: 3000, label: 'lessons.i2c-scan.checks.1' },
        { kind: 'serial', match: 'Found device at 0x68', regex: false, minCount: 1, label: 'lessons.i2c-scan.checks.2' },
        { kind: 'serial', match: 'WHO_AM_I = 0x68', regex: false, minCount: 1, label: 'lessons.i2c-scan.checks.3' },
        { kind: 'code', must: ['Wire.begin', 'Wire.beginTransmission', 'Wire.endTransmission'], mustNot: [], label: 'lessons.i2c-scan.checks.4' },
      ],
      variants: [],
      pins: [
        { pin: 'D14', to: 'lessons.i2c-scan.pins.D14.to', role: 'lessons.i2c-scan.pins.D14.role', color: 'blue' },
        { pin: 'D15', to: 'lessons.i2c-scan.pins.D15.to', role: 'lessons.i2c-scan.pins.D15.role', color: 'yellow' },
        { pin: '3V3', to: 'lessons.i2c-scan.pins.3V3.to', role: 'lessons.i2c-scan.pins.3V3.role', color: 'red' },
        { pin: 'GND', to: 'lessons.i2c-scan.pins.GND.to', role: 'lessons.i2c-scan.pins.GND.role', color: 'black' },
      ],
      callouts: [
        { part: 'MPU1', text: 'lessons.i2c-scan.callouts.MPU1' },
        { part: 'U5', text: 'lessons.i2c-scan.callouts.U5' },
        { part: 'CN5', text: 'lessons.i2c-scan.callouts.CN5' },
      ],
      specs: specs('i2c-scan', 4),
      features: [
        { icon: 'play', text: 'lessons.i2c-scan.features.1' },
        { icon: 'board', text: 'lessons.i2c-scan.features.2' },
        { icon: 'tip', text: 'lessons.i2c-scan.features.3' },
      ],
      ...lessonText('i2c-scan', 3, 3),
      quiz: quiz('i2c-scan', [1, 2, 0]),
    },
    {
      id: 'sonar', n: 5, level: 'project', language: 'arduino-cpp',
      code: {
        libraries: [],
        source: `// {{t:lessons.sonar.code.intro}}
const int TRIG_PIN = 7;            // D7 = PA8
const int ECHO_PIN = 8;            // D8 = PA9, {{t:lessons.sonar.code.ft}}
const long NEAR_CM = {{p:near}};   // {{t:lessons.sonar.code.near}}

void setup() {
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(LED_BUILTIN, OUTPUT);
  Serial.begin(115200);
}

void loop() {
  digitalWrite(TRIG_PIN, HIGH);    // {{t:lessons.sonar.code.ping}}
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  // {{t:lessons.sonar.code.echo}}
  long cm = pulseIn(ECHO_PIN, HIGH, 30000) / 58;
  bool near = cm > 0 && cm < NEAR_CM;
  digitalWrite(LED_BUILTIN, near ? HIGH : LOW);
  Serial.print(cm);
  Serial.println(near ? " cm NEAR" : " cm");
  delay({{p:every}});
}
`,
      },
      params: [
        { id: 'near', kind: 'number', label: 'lessons.sonar.params.near.label', default: 20, min: 5, max: 100, step: 5, unit: 'cm' },
        { id: 'every', kind: 'number', label: 'lessons.sonar.params.every.label', default: 100, min: 50, max: 1000, step: 50, unit: 'ms' },
      ],
      circuit: 'sonar',
      world: {
        inputs: [
          { id: 'distance', quantity: 'distance-cm', device: { kind: 'hc-sr04' }, pins: ['D7', 'D8'], part: 'US1',
            min: 2, max: 400, step: 1, default: 30, unit: 'cm', gesture: 'drag', label: 'lessons.sonar.world.distance' },
        ],
        script: [
          { t: 1000, input: 'distance', value: 12 },
          { t: 2000, input: 'distance', value: 45 },
        ],
      },
      serial: { baud: 115200, sample: ['30 cm', '30 cm', '12 cm NEAR', '12 cm NEAR', '45 cm'] },
      runMs: 3000,
      checks: [
        { kind: 'serial', match: '^30 cm$', regex: true, minCount: 5, byMs: 1000, label: 'lessons.sonar.checks.1' },
        { kind: 'serial', match: '^12 cm NEAR$', regex: true, minCount: 3, label: 'lessons.sonar.checks.2' },
        { kind: 'responds', after: { t: 1000, input: 'distance', value: 12 }, pin: 'D13', withinMs: 400, mode: 'out', v: [1, 1], label: 'lessons.sonar.checks.3' },
        { kind: 'serial', match: '^45 cm$', regex: true, minCount: 3, label: 'lessons.sonar.checks.4' },
        { kind: 'code', must: ['pulseIn(ECHO_PIN, HIGH'], mustNot: [], label: 'lessons.sonar.checks.5' },
      ],
      variants: [],
      pins: [
        { pin: '5V', to: 'lessons.sonar.pins.5V.to', role: 'lessons.sonar.pins.5V.role', color: 'red' },
        { pin: 'D7', to: 'lessons.sonar.pins.D7.to', role: 'lessons.sonar.pins.D7.role', color: 'yellow' },
        { pin: 'D8', to: 'lessons.sonar.pins.D8.to', role: 'lessons.sonar.pins.D8.role', color: 'green' },
        { pin: 'GND', to: 'lessons.sonar.pins.GND.to', role: 'lessons.sonar.pins.GND.role', color: 'black' },
      ],
      callouts: [
        { part: 'US1', text: 'lessons.sonar.callouts.US1' },
        { part: 'CN5', text: 'lessons.sonar.callouts.CN5' },
        { part: 'LD2', text: 'lessons.sonar.callouts.LD2' },
      ],
      specs: specs('sonar', 4),
      features: [
        { icon: 'play', text: 'lessons.sonar.features.1' },
        { icon: 'warn', text: 'lessons.sonar.features.2' },
        { icon: 'tip', text: 'lessons.sonar.features.3' },
      ],
      ...lessonText('sonar', 3, 3),
      quiz: quiz('sonar', [2, 1, 0]),
    },
  ],
  serial: { baud: 115200, sample: ['NUCLEO-F401RE ready', 'hello from the Nucleo #1', 'hello from the Nucleo #2'] },
  sources: [
    { title: 'ST UM1724: STM32 Nucleo-64 boards (MB1136) user manual', url: 'https://www.st.com/resource/en/user_manual/um1724-stm32-nucleo64-boards-mb1136-stmicroelectronics.pdf' },
    { title: 'ST NUCLEO-F401RE product page (schematics, BOM, board design files MB1136)', url: 'https://www.st.com/en/evaluation-tools/nucleo-f401re.html' },
    { title: 'ST DS10086: STM32F401xD/xE datasheet', url: 'https://www.st.com/resource/en/datasheet/stm32f401re.pdf' },
    { title: 'ST RM0368: STM32F401xB/C and STM32F401xD/E reference manual', url: 'https://www.st.com/resource/en/reference_manual/rm0368-stm32f401xbc-and-stm32f401xde-advanced-armbased-32bit-mcus-stmicroelectronics.pdf' },
    { title: 'STM32duino Arduino_Core_STM32 (NUCLEO_F401RE variant)', url: 'https://github.com/stm32duino/Arduino_Core_STM32' },
    { title: 'ST STM32CubeProgrammer', url: 'https://www.st.com/en/development-tools/stm32cubeprog.html' },
    { title: 'ST LD1117 datasheet', url: 'https://www.st.com/resource/en/datasheet/ld1117.pdf' },
    { title: 'ST LD39050 datasheet', url: 'https://www.st.com/resource/en/datasheet/ld39050.pdf' },
  ],
  title: 'title',
  tagline: 'tagline',
  overview: 'overview',
};

export default nucleo;
