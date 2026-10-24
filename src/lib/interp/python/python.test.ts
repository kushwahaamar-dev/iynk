import { describe, expect, it } from 'vitest';
import { createRun, check, type RunOptions } from '../run';
import type { RosMessage } from './modules';

function boot(source: string, board: RunOptions['board'], extra: Partial<RunOptions> = {}) {
  const run = createRun({ board, source, language: 'python', ...extra });
  let serial = '';
  const errors: string[] = [];
  const ros: RosMessage[] = [];
  run.on('serial', (t) => (serial += t));
  run.on('error', (e) => errors.push(e.format()));
  run.on('ros', (m) => ros.push(m));
  run.start();
  return { run, out: () => serial, errors, ros };
}

function advance(run: ReturnType<typeof createRun>, ms: number) {
  for (let t = 0; t < ms; t += 16) run.step(Math.min(16, ms - t));
}

describe('MicroPython golden programs', () => {
  it('Pico blink with toggle and time.sleep', () => {
    const { run, errors } = boot(`from machine import Pin
import time

led = Pin(25, Pin.OUT)
while True:
    led.toggle()
    time.sleep(0.5)
`, 'pico');
    advance(run, 2100);
    expect(errors).toEqual([]);
    const edges = run.world.trace.filter((e) => e[1] === 25).map((e) => [Math.round(e[0] / 1000), e[2]]);
    expect(edges).toEqual([[0, 1], [500, 0], [1000, 1], [1500, 0], [2000, 1]]);
    expect(run.snapshot().leds.LED).toBe(1);
  });

  it('Pico W onboard LED is Pin("LED") on the wireless chip', () => {
    const { run, errors } = boot(`from machine import Pin
led = Pin("LED", Pin.OUT)
led.on()
`, 'pico', { variant: 'pico-w' });
    advance(run, 20);
    expect(errors).toEqual([]);
    expect(run.snapshot().leds.LED).toBe(1);
  });

  it('Pico button with pull-up and an IRQ counter', () => {
    const { run, out } = boot(`from machine import Pin
import time

led = Pin(15, Pin.OUT)
button = Pin(14, Pin.IN, Pin.PULL_UP)
presses = 0

def pressed(pin):
    global presses
    presses += 1

button.irq(trigger=Pin.IRQ_FALLING, handler=pressed)
while True:
    led.value(not button.value())
    if presses:
        print("presses:", presses)
        presses = 0
    time.sleep_ms(10)
`, 'pico');
    advance(run, 50);
    expect(run.snapshot().pins[15].level).toBe(0);
    run.input('GP14', 0);
    advance(run, 50);
    expect(run.snapshot().pins[15].level).toBe(1);
    expect(out()).toBe('presses: 1\n');
    run.input('GP14', null);
    advance(run, 50);
    expect(run.snapshot().pins[15].level).toBe(0);
  });

  it('Pico ADC and PWM fade', () => {
    const { run, out } = boot(`from machine import ADC, Pin, PWM
import time
pot = ADC(26)
led = PWM(Pin(16))
led.freq(1000)
for i in range(3):
    raw = pot.read_u16()
    led.duty_u16(raw)
    print(raw >> 4, f"{raw * 3.3 / 65535:.2f} V")
    time.sleep(0.1)
`, 'pico');
    run.analog('GP26', 1.65);
    advance(run, 400);
    expect(out().split('\n')[0]).toBe('2048 1.65 V');
    expect(run.snapshot().pins[16].duty).toBeCloseTo(0.5, 2);
    expect(run.status.state).toBe('done');
  });

  it('micro:bit display and buttons', () => {
    const { run, errors } = boot(`from microbit import *
while True:
    if button_a.is_pressed():
        display.show(Image.HAPPY)
    elif button_b.is_pressed():
        display.show(3)
    else:
        display.clear()
    sleep(20)
`, 'microbit-v2');
    advance(run, 60);
    expect(errors).toEqual([]);
    expect(run.snapshot().matrix?.px.every((v) => v === 0)).toBe(true);
    run.input('A', 0);
    advance(run, 60);
    // HAPPY: 00000:09090:00000:90009:09990
    const px = run.snapshot().matrix!.px.map((v) => (v > 0 ? 1 : 0)).join('');
    expect(px).toBe('0000001010000001000101110');
    run.input('A', null);
    run.input('B', 0);
    advance(run, 60);
    expect(run.snapshot().matrix!.px.some((v) => v > 0)).toBe(true);
  });

  it('micro:bit was_pressed counts presses between polls', () => {
    const { run, out } = boot(`from microbit import *
count = 0
while True:
    if button_a.was_pressed():
        count += 1
        print(count)
    sleep(500)
`, 'microbit-v2');
    advance(run, 100);
    run.input('A', 0);
    advance(run, 30);
    run.input('A', null);
    advance(run, 600);
    expect(out()).toBe('1\n');
  });
});

describe('Raspberry Pi Python', () => {
  it('gpiozero LED follows a Button through callbacks', () => {
    const { run, errors } = boot(`from gpiozero import LED, Button
from signal import pause

led = LED(17)
button = Button(2)
button.when_pressed = led.on
button.when_released = led.off
pause()
`, 'pi4-pi5');
    advance(run, 20);
    expect(errors).toEqual([]);
    expect(run.snapshot().pins[17].level).toBe(0);
    run.input('GPIO2', 0);
    advance(run, 20);
    expect(run.snapshot().pins[17].level).toBe(1);
    run.input('GPIO2', null);
    advance(run, 20);
    expect(run.snapshot().pins[17].level).toBe(0);
  });

  it('gpiozero blink() runs in the background', () => {
    const { run } = boot(`from gpiozero import LED
from time import sleep
led = LED(18)
led.blink(on_time=0.25, off_time=0.25)
sleep(10)
`, 'pi4-pi5');
    advance(run, 1100);
    const edges = run.world.trace.filter((e) => e[1] === 18).map((e) => Math.round(e[0] / 1000));
    expect(edges).toEqual([0, 250, 500, 750, 1000]);
  });

  it('rclpy teleop node publishes Twist on a 10 Hz timer', () => {
    const { run, out, ros, errors } = boot(`import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Twist


class Drive(Node):
    def __init__(self):
        super().__init__('drive')
        self.pub = self.create_publisher(Twist, 'cmd_vel', 10)
        self.timer = self.create_timer(0.1, self.tick)
        self.count = 0

    def tick(self):
        msg = Twist()
        msg.linear.x = 0.2
        msg.angular.z = 0.5
        self.pub.publish(msg)
        self.count += 1
        if self.count % 10 == 0:
            self.get_logger().info(f'sent {self.count} commands')


def main():
    rclpy.init()
    node = Drive()
    rclpy.spin(node)
    node.destroy_node()
    rclpy.shutdown()


if __name__ == '__main__':
    main()
`, 'pi4-pi5');
    advance(run, 1050);
    expect(errors).toEqual([]);
    expect(ros).toHaveLength(10);
    expect(ros[0]).toMatchObject({ topic: '/cmd_vel', type: 'geometry_msgs/msg/Twist' });
    expect(ros[0].data).toEqual({ linear: { x: 0.2, y: 0, z: 0 }, angular: { x: 0, y: 0, z: 0.5 } });
    expect(Math.round(ros[0].t)).toBe(100);
    // ROS 2 stamps log lines with epoch seconds and nanoseconds.
    expect(out()).toBe('[INFO] [drive]: sent 10 commands\n');
  });

  it('RPi.GPIO is refused on a Pi 5 with a pointer to gpiozero', () => {
    const { run, errors } = boot('import RPi.GPIO as GPIO\nGPIO.setmode(GPIO.BCM)\n', 'pi4-pi5', { variant: 'pi5' });
    run.step(5);
    expect(errors[0]).toMatch(/gpiozero/);
  });
});

describe('Python language subset', () => {
  it('classes, comprehensions, formatting and exceptions', () => {
    const { run, out, errors } = boot(`class Counter:
    def __init__(self, start=0):
        self.n = start
    def bump(self, by=1):
        self.n += by
        return self

c = Counter(5).bump().bump(by=3)
squares = [x * x for x in range(6) if x % 2 == 0]
print(c.n, squares, {k: v for k, v in zip("ab", (1, 2))})
print("%d-%s" % (7, "x"), "{:>5.1f}|".format(3.14159), f"{255:#06x}")
try:
    [1, 2][5]
except IndexError as e:
    print("caught", e)
print(7 // -2, -7 % 3, 2 ** 70, round(2.5), 1 / 3)
`, 'pico');
    advance(run, 50);
    expect(errors).toEqual([]);
    expect(out()).toBe([
      "9 [0, 4, 16] {'a': 1, 'b': 2}",
      '7-x   3.1| 0x00ff',
      'caught list index out of range',
      '-4 2 1180591620717411303424 2 0.3333333333333333',
      '',
    ].join('\n'));
  });

  it('friendly errors with line and column', () => {
    const d1 = check({ board: 'pico', language: 'python', source: 'from machine import Pin\nif True\n    pass\n' });
    expect(d1[0]).toMatchObject({ kind: 'syntax', line: 2, col: 8, message: "expected ':'" });
    const r1 = boot('from machine import Pin\nif True\n    pass\n', 'pico');
    expect(r1.errors[0]).toMatch(/^2:8 syntax error: expected ':'/);
    const r2 = boot('import time\nled = Pin(25, Pin.OUT)\n', 'pico');
    r2.run.step(5);
    expect(r2.errors[0]).toMatch(/^2:7 runtime error: NameError: name 'Pin' isn't defined/);
    expect(r2.errors[0]).toMatch(/from machine import Pin/);
    const r3 = boot('print "hello"\n', 'pico');
    expect(r3.errors[0]).toMatch(/^1:1 syntax error: print is a function in Python 3/);
    const r4 = boot('def f():\n    return 1\n  x = 2\n', 'pico');
    expect(r4.errors[0]).toMatch(/^3:3 syntax error: this line is not lined up/);
  });

  it('an endless loop without sleep cannot freeze the page', () => {
    // A Pi runs ~20 statements per simulated µs, far more than the per-frame budget.
    const { run } = boot('n = 0\nwhile True:\n    n += 1\n', 'pi4-pi5', { budget: 50_000 });
    const t0 = performance.now();
    run.step(16);
    expect(performance.now() - t0).toBeLessThan(200);
    expect(run.status.throttled).toBe(true);
    expect(run.status.state).toBe('running');
  });

  it('urequests on a Pico W after joining Wi-Fi', () => {
    const { run, out, errors } = boot(`import network, time, urequests
wlan = network.WLAN(network.STA_IF)
wlan.active(True)
wlan.connect("bench-lab", "robotics")
while not wlan.isconnected():
    time.sleep(0.2)
print(wlan.ifconfig()[0])
r = urequests.get("http://simlab.local/hello")
print(r.status_code)
r.close()
`, 'pico', { variant: 'pico-w' });
    advance(run, 2000);
    expect(errors).toEqual([]);
    expect(out()).toMatch(/^192\.168\.4\.\d+\n\d{3}\n$/);
  });
});
