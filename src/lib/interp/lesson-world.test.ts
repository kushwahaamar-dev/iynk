import { describe, expect, it } from 'vitest';
import type { DeviceModel, WorldEvent, WorldInput } from '@/content/schema';
import { runHeadless } from './headless';

type Sensor = Extract<DeviceModel, { kind: 'onboard' }>['sensor'];

const onboard = (id: string, sensor: Sensor, value: number): WorldInput => ({
  id, quantity: 'level', device: { kind: 'onboard', sensor }, pins: [], part: 'U1',
  min: -100, max: 360, step: 1, default: value, gesture: 'slide', label: id,
});

const lines = (trace: ReturnType<typeof runHeadless>) => trace.serial.map((l) => l.text);

describe('onboard sensor inputs reach the program', () => {
  const PICO_TEMP = `from machine import ADC
import time
sensor = ADC(4)
while True:
    print(27 - (sensor.read_u16() * 3.3 / 65535 - 0.706) / 0.001721)
    time.sleep_ms(100)
`;
  const pico = (inputs: WorldInput[], script: WorldEvent[] = []) =>
    runHeadless({ board: 'pico', language: 'micropython', source: PICO_TEMP, world: { inputs, script }, runMs: 450 });

  it("the Pico's ADC(4) reads the chip temperature its world input sets", () => {
    const trace = pico([onboard('chip', 'temperature', 40)]);
    expect(trace.error).toBeNull();
    expect(Number(lines(trace)[0])).toBeCloseTo(40, 0);
  });

  it('follows the input when the script moves it, and reads 24 °C with no input', () => {
    const moved = pico([onboard('chip', 'temperature', 40)], [{ t: 250, input: 'chip', value: -10 }]);
    const temps = lines(moved).map(Number);
    expect(Math.abs(temps[0] - 40)).toBeLessThan(1);
    expect(Math.abs(temps.at(-1)! + 10)).toBeLessThan(1);
    expect(Math.abs(Number(lines(pico([]))[0]) - 24)).toBeLessThan(1);
  });

  it("the micro:bit's temperature, compass, microphone, light sensor and logo read their inputs", () => {
    const source = `from microbit import *
print(temperature(), compass.heading(), microphone.sound_level(), display.read_light_level(), pin_logo.is_touched())
sleep(200)
print(temperature(), compass.heading(), microphone.sound_level(), display.read_light_level(), pin_logo.is_touched())
`;
    const world = {
      inputs: [onboard('t', 'temperature', 31), onboard('c', 'compass', 270), onboard('m', 'microphone', 180), onboard('l', 'light', 40), onboard('touch', 'touch', 0)],
      script: [{ t: 100, input: 't', value: 18.4 }, { t: 100, input: 'c', value: 360 }, { t: 100, input: 'm', value: 300 }, { t: 100, input: 'touch', value: 1 }],
    };
    const trace = runHeadless({ board: 'microbit-v2', language: 'micropython', source, world, runMs: 400 });
    expect(trace.error).toBeNull();
    // heading wraps at 360, the sound level stops at 255
    expect(lines(trace)).toEqual(['31 270 180 40 False', '18 0 255 40 True']);
  });

  it("the ESP32's temperatureRead() reads its input, and the value survives a deep sleep", () => {
    const source = `RTC_DATA_ATTR int boots = 0;
void setup() {
  Serial.begin(115200);
  boots++;
  Serial.print(boots);
  Serial.print(" ");
  Serial.println(temperatureRead(), 1);
  if (boots < 2) {
    esp_sleep_enable_timer_wakeup(100000);
    esp_deep_sleep_start();
  }
}
void loop() {}
`;
    const world = { inputs: [onboard('die', 'temperature', 55.5)], script: [] };
    const trace = runHeadless({ board: 'esp32-devkitc', language: 'arduino-cpp', source, world, runMs: 400 });
    expect(trace.error).toBeNull();
    expect(lines(trace)).toEqual(['1 55.5', '2 55.5']);
  });
});
