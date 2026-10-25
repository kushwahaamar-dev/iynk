// Every item id in iynk, with the small metadata index pages need.
// Titles and taglines are the "title" / "tagline" keys of each item's content JSON
// (src/i18n/content/<lang>/<lab>/<id>.json); tag labels are "tags.<tag>" in the lab's UI namespace.
// Lists are in figure order. Additive changes only; log them in docs/ARCHITECTURE.md.

import type { ItemMeta, Language } from './schema';

export const BOARD_IDS = [
  'uno-r3',
  'nano',
  'uno-r4',
  'esp32-devkitc',
  'esp32-s3-devkitc-1',
  'nodemcu',
  'pico',
  'nucleo-f401re',
  'microbit-v2',
  'pi4-pi5',
  'basys3',
  'de10-lite',
] as const;
export type BoardId = (typeof BOARD_IDS)[number];

export const ROBOTICS_IDS = [
  'uno-r3-build',
  'led-resistor',
  'transistor-switch',
  'esp32-s3-build',
  'tb6612fng',
  'l298n',
  'a4988',
  'pca9685',
  'mpu6050',
  'hc-sr04',
  'qtr-8rc',
  'lm2596',
  'pi5-ros2',
] as const;
export type RoboticsId = (typeof ROBOTICS_IDS)[number];

export const DRONE_IDS = [
  'quad5',
  'whoop',
  'cinewhoop',
  'longrange',
  'racer',
  'gpscam',
  'delivery',
  'agrihex',
  'wing',
  'vtol',
  'swarm',
  'tricopter',
  'octo',
] as const;
export type DroneId = (typeof DRONE_IDS)[number];

/** Breakout modules: drawn by figures/modules/<id>.js, wired in Board Lab lessons and built on robotics benches. */
export const MODULE_IDS = [
  'tb6612fng',
  'l298n',
  'a4988',
  'pca9685',
  'mpu6050',
  'hc-sr04',
  'qtr-8rc',
  'lm2596',
  'uln2003',
  'ssd1306',
  'traffic-light',
  'soil-moisture',
] as const;
export type ModuleId = (typeof MODULE_IDS)[number];

/** Components and things on the mat: drawn by figures/parts/<id>.js (breadboard components and peripherals). */
export const PART_IDS = [
  'led',
  'rgb-led',
  'resistor',
  'push-button',
  'potentiometer',
  'ldr',
  'piezo-buzzer',
  'tip120',
  'npn-2n2222',
  'diode-1n4007',
  'dc-motor',
  'fan',
  'tmp36',
  'fsr402',
  'servo-sg90',
  'stepper-28byj48',
  'nema17',
  'tt-motor',
  'lipo-2s',
  'aa-holder-4',
  'multimeter',
] as const;
export type PartId = (typeof PART_IDS)[number];

export interface BoardMeta extends ItemMeta {
  /** Languages its lessons use, first = the default editor language. */
  languages: Language[];
}

export interface RoboticsMeta extends ItemMeta {
  /** Controller on the mat; null when the bench is powered on its own (5 V supply, battery). */
  board: BoardId | null;
  /** Variant of that board, when it has variants. */
  boardVariant?: string;
  modules: ModuleId[];
  parts: PartId[];
}

export interface DroneMeta extends ItemMeta {
  firmware: 'betaflight' | 'ardupilot-copter' | 'ardupilot-plane' | 'inav' | 'crazyflie';
  motors: number;
}

export const BOARDS: Record<BoardId, BoardMeta> = {
  'uno-r3': { fig: 1, palette: 'cobalt', tags: ['arduino', 'avr', 'beginner'], languages: ['arduino-cpp'] },
  nano: { fig: 2, palette: 'cobalt', tags: ['arduino', 'avr', 'breadboard'], languages: ['arduino-cpp'] },
  'uno-r4': { fig: 3, palette: 'mint', tags: ['arduino', 'arm', 'wifi', 'ble'], languages: ['arduino-cpp'] },
  'esp32-devkitc': { fig: 4, palette: 'mustard', tags: ['esp32', 'wifi', 'ble', 'dual-core'], languages: ['arduino-cpp', 'micropython'] },
  'esp32-s3-devkitc-1': { fig: 5, palette: 'mustard', tags: ['esp32', 'wifi', 'ble', 'usb'], languages: ['arduino-cpp', 'micropython'] },
  nodemcu: { fig: 6, palette: 'blush', tags: ['esp8266', 'wifi'], languages: ['arduino-cpp', 'micropython'] },
  pico: { fig: 7, palette: 'mint', tags: ['rp2040', 'rp2350', 'pio', 'wifi'], languages: ['micropython', 'arduino-cpp'] },
  'nucleo-f401re': { fig: 8, palette: 'tomato', tags: ['stm32', 'arm', 'debugger'], languages: ['arduino-cpp'] },
  'microbit-v2': { fig: 9, palette: 'blush', tags: ['nrf52', 'ble', 'sensors', 'beginner'], languages: ['micropython'] },
  'pi4-pi5': { fig: 10, palette: 'mint', tags: ['linux', 'gpio', 'ros2'], languages: ['python'] },
  basys3: { fig: 11, palette: 'cobalt', tags: ['fpga', 'artix-7', 'verilog'], languages: ['verilog'] },
  'de10-lite': { fig: 12, palette: 'tomato', tags: ['fpga', 'max10', 'verilog'], languages: ['verilog'] },
};

export const ROBOTICS: Record<RoboticsId, RoboticsMeta> = {
  'uno-r3-build': { fig: 1, palette: 'cobalt', tags: ['build', 'smd', 'tht'], board: 'uno-r3', modules: [], parts: ['led'] },
  'led-resistor': { fig: 2, palette: 'mint', tags: ['ohms-law', 'meter'], board: null, modules: [], parts: ['led', 'resistor', 'multimeter'] },
  'transistor-switch': { fig: 3, palette: 'mustard', tags: ['transistor', 'motor'], board: 'nano', modules: [], parts: ['tip120', 'diode-1n4007', 'tt-motor', 'aa-holder-4'] },
  'esp32-s3-build': { fig: 4, palette: 'blush', tags: ['wifi', 'rgb-led', 'smd'], board: 'esp32-s3-devkitc-1', modules: [], parts: [] },
  tb6612fng: { fig: 5, palette: 'cobalt', tags: ['motor-driver', 'pwm'], board: 'nano', modules: ['tb6612fng'], parts: ['tt-motor', 'lipo-2s'] },
  l298n: { fig: 6, palette: 'tomato', tags: ['motor-driver', 'heat'], board: 'nano', modules: ['l298n'], parts: ['tt-motor', 'lipo-2s'] },
  a4988: { fig: 7, palette: 'mint', tags: ['stepper', 'microstepping'], board: 'nano', modules: ['a4988'], parts: ['nema17', 'lipo-2s', 'multimeter'] },
  pca9685: { fig: 8, palette: 'blush', tags: ['i2c', 'servo', 'pwm'], board: 'nano', modules: ['pca9685'], parts: ['servo-sg90', 'aa-holder-4'] },
  mpu6050: { fig: 9, palette: 'mustard', tags: ['i2c', 'imu', 'filters'], board: 'nano', modules: ['mpu6050'], parts: ['piezo-buzzer'] },
  'hc-sr04': { fig: 10, palette: 'cobalt', tags: ['ultrasonic', 'timing'], board: 'nano', modules: ['hc-sr04'], parts: ['piezo-buzzer'] },
  'qtr-8rc': { fig: 11, palette: 'tomato', tags: ['line-sensor', 'rc-timing'], board: 'nano', modules: ['qtr-8rc', 'tb6612fng'], parts: ['tt-motor', 'lipo-2s'] },
  lm2596: { fig: 12, palette: 'cobalt', tags: ['power', 'buck', 'brownout'], board: null, modules: ['lm2596'], parts: ['lipo-2s', 'tt-motor', 'multimeter'] },
  'pi5-ros2': { fig: 13, palette: 'mint', tags: ['linux', 'ros2', 'power'], board: 'pi4-pi5', boardVariant: 'pi5', modules: [], parts: [] },
};

export const DRONES: Record<DroneId, DroneMeta> = {
  quad5: { fig: 1, palette: 'tomato', tags: ['freestyle', '5-inch'], firmware: 'betaflight', motors: 4 },
  whoop: { fig: 2, palette: 'mint', tags: ['whoop', 'indoor', '1s'], firmware: 'betaflight', motors: 4 },
  cinewhoop: { fig: 3, palette: 'mint', tags: ['cinewhoop', 'ducted', '3-inch'], firmware: 'betaflight', motors: 4 },
  longrange: { fig: 4, palette: 'mint', tags: ['long-range', 'gps-rescue', '7-inch'], firmware: 'betaflight', motors: 4 },
  racer: { fig: 5, palette: 'mustard', tags: ['racing', '5-inch'], firmware: 'betaflight', motors: 4 },
  gpscam: { fig: 6, palette: 'cobalt', tags: ['gps', 'camera', 'gimbal'], firmware: 'ardupilot-copter', motors: 4 },
  delivery: { fig: 7, palette: 'mustard', tags: ['delivery', 'companion', 'winch'], firmware: 'ardupilot-copter', motors: 4 },
  agrihex: { fig: 8, palette: 'mint', tags: ['hexacopter', 'spray'], firmware: 'ardupilot-copter', motors: 6 },
  wing: { fig: 9, palette: 'blush', tags: ['fixed-wing', 'elevons'], firmware: 'inav', motors: 1 },
  vtol: { fig: 10, palette: 'cobalt', tags: ['vtol', 'tiltrotor', 'quadplane'], firmware: 'ardupilot-plane', motors: 3 },
  swarm: { fig: 11, palette: 'mint', tags: ['nano', 'swarm', 'python'], firmware: 'crazyflie', motors: 4 },
  tricopter: { fig: 12, palette: 'mint', tags: ['tricopter', 'servo-yaw'], firmware: 'betaflight', motors: 3 },
  octo: { fig: 13, palette: 'cobalt', tags: ['octocopter', 'heavy-lift', 'redundancy'], firmware: 'ardupilot-copter', motors: 8 },
};

export const isBoardId = (s: string): s is BoardId => (BOARD_IDS as readonly string[]).includes(s);
export const isRoboticsId = (s: string): s is RoboticsId => (ROBOTICS_IDS as readonly string[]).includes(s);
export const isDroneId = (s: string): s is DroneId => (DRONE_IDS as readonly string[]).includes(s);
