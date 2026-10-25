// Robotics Bench Fig. 13: the Raspberry Pi 5 as the ROS 2 brain of a robot.
// Facts: docs/facts/pi4-pi5.md (Pi 5 power tree, throttling, get_throttled bits, ROS 2 Lyrical) and
// docs/research/robotics-bench-b.md §8 (the original figure, its quiz and its defects, all fixed here).
// The figure (figures/robotics/pi5-ros2.js) owns geometry, build groups and the power tree; this module owns
// the text, the programs, the steps, the checks and the current model. Part ids, mode ids, supply keys and
// fault ids are shared with the figure and must match it exactly.

import type { RoboticsContent } from '@/content/schema';

const BOOT_CHECK = `# {{t:modes.boot.code.what}}
# {{t:modes.boot.code.first}}
#   sudo apt update && sudo apt full-upgrade
from pathlib import Path
import subprocess


def vcgencmd(*args):
    out = subprocess.run(['vcgencmd', *args], capture_output=True, text=True, check=True)
    return out.stdout.strip()


model = Path('/proc/device-tree/model').read_text().rstrip('\\x00')
print(model)                             # Raspberry Pi 5 Model B Rev 1.0
print(vcgencmd('get_throttled'))         # {{t:modes.boot.code.throttled}}
print(vcgencmd('measure_temp'))          # {{t:modes.boot.code.temp}}
print(vcgencmd('measure_clock', 'arm'))  # {{t:modes.boot.code.clock}}
`;

const DRIVE = `# {{t:modes.teleop.code.what}}
from pathlib import Path

import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Twist

TEMP = Path('/sys/class/thermal/thermal_zone0/temp')


class Drive(Node):
    def __init__(self):
        super().__init__('drive')
        self.pub = self.create_publisher(Twist, 'cmd_vel', 10)
        self.create_timer(0.1, self.tick)        # {{t:modes.teleop.code.rate}}
        self.create_timer(5.0, self.check_heat)  # {{t:modes.teleop.code.heat}}
        self.get_logger().info('publishing /cmd_vel at 10 Hz')

    def tick(self):
        msg = Twist()
        msg.linear.x = 0.2      # {{t:modes.teleop.code.linear}}
        msg.angular.z = 0.5     # {{t:modes.teleop.code.angular}}
        self.pub.publish(msg)   # {{t:modes.teleop.code.publish}}

    def check_heat(self):
        milli_c = int(TEMP.read_text())
        if milli_c >= 80000:
            self.get_logger().warn(f'CPU at {milli_c / 1000:.1f} C: the firmware is throttling the clock')


def main():
    rclpy.init()
    node = Drive()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.try_shutdown()


if __name__ == '__main__':
    main()
`;

const HEALTH = `# {{t:modes.health.code.what}}
import subprocess

FLAGS = {
    0: 'under-voltage now',
    1: 'Arm frequency capped now',
    2: 'throttled now',
    3: 'soft temperature limit now',
    16: 'under-voltage has happened since boot',
    17: 'Arm frequency capping has happened',
    18: 'throttling has happened',
    19: 'soft temperature limit has happened',
}

line = subprocess.run(['vcgencmd', 'get_throttled'], capture_output=True, text=True).stdout.strip()
value = int(line.split('=')[1], 16)      # throttled=0x50005 -> 0x50005
print(line)
for bit, meaning in FLAGS.items():
    if value & (1 << bit):
        print(f'  bit {bit:2}  {meaning}')
if value == 0:
    print('  no flags: the supply and the temperature are fine')
# {{t:modes.health.code.charger}}
# {{t:modes.health.code.fix}}
`;

/* ---------- practice tasks: rclpy nodes that run headless in src/lib/interp (target linux) ---------- */

const T1_STARTER = `# {{t:tasks.cmd-vel-10hz.code.goal}}
import time

import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Twist


class Drive(Node):
    def __init__(self):
        super().__init__('drive')
        self.pub = self.create_publisher(Twist, 'cmd_vel', 10)

    def run(self):
        # {{t:tasks.cmd-vel-10hz.code.loop}}
        while True:
            msg = Twist()
            msg.linear.x = 0.2
            msg.angular.z = 0.5
            self.pub.publish(msg)
            time.sleep(0.1)


rclpy.init()
Drive().run()
`;

const T1_SOLUTION = `import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Twist


class Drive(Node):
    def __init__(self):
        super().__init__('drive')
        self.pub = self.create_publisher(Twist, 'cmd_vel', 10)
        self.create_timer(0.1, self.tick)        # {{t:tasks.cmd-vel-10hz.code.timer}}

    def tick(self):
        msg = Twist()
        msg.linear.x = 0.2
        msg.angular.z = 0.5
        self.pub.publish(msg)
        self.get_logger().info(f'linear.x={msg.linear.x:.2f} angular.z={msg.angular.z:.2f}')


rclpy.init()
node = Drive()
rclpy.spin(node)
node.destroy_node()
rclpy.try_shutdown()
`;

const T2_STARTER = `# {{t:tasks.diff-drive.code.goal}}
import rclpy
from rclpy.node import Node
from rclpy.executors import SingleThreadedExecutor
from geometry_msgs.msg import Twist


class Teleop(Node):
    def __init__(self):
        super().__init__('teleop')
        self.pub = self.create_publisher(Twist, 'cmd_vel', 10)
        self.create_timer(0.1, self.tick)

    def tick(self):
        msg = Twist()
        msg.linear.x = 0.2
        msg.angular.z = 0.5
        self.pub.publish(msg)


class Base(Node):
    def __init__(self):
        super().__init__('base')
        # {{t:tasks.diff-drive.code.param}}
        # {{t:tasks.diff-drive.code.sub}}

    def on_cmd(self, msg):
        # {{t:tasks.diff-drive.code.math}}
        pass


rclpy.init()
executor = SingleThreadedExecutor()
executor.add_node(Teleop())
executor.add_node(Base())
executor.spin()
`;

const T2_SOLUTION = `import rclpy
from rclpy.node import Node
from rclpy.executors import SingleThreadedExecutor
from geometry_msgs.msg import Twist


class Teleop(Node):
    def __init__(self):
        super().__init__('teleop')
        self.pub = self.create_publisher(Twist, 'cmd_vel', 10)
        self.create_timer(0.1, self.tick)

    def tick(self):
        msg = Twist()
        msg.linear.x = 0.2
        msg.angular.z = 0.5
        self.pub.publish(msg)


class Base(Node):
    def __init__(self):
        super().__init__('base')
        self.declare_parameter('wheel_base', 0.16)   # {{t:tasks.diff-drive.code.metres}}
        self.create_subscription(Twist, 'cmd_vel', self.on_cmd, 10)

    def on_cmd(self, msg):
        b = self.get_parameter('wheel_base').value
        left = msg.linear.x - msg.angular.z * b / 2
        right = msg.linear.x + msg.angular.z * b / 2
        self.get_logger().info(f'left={left:.2f} right={right:.2f} m/s')


rclpy.init()
executor = SingleThreadedExecutor()
executor.add_node(Teleop())
executor.add_node(Base())
executor.spin()
`;

const T3_STARTER = `# {{t:tasks.range-pipeline.code.goal}}
import rclpy
from rclpy.node import Node
from rclpy.executors import SingleThreadedExecutor
from std_msgs.msg import Float32
from geometry_msgs.msg import Twist


class Sensor(Node):
    def __init__(self):
        super().__init__('sensor')
        self.pub = self.create_publisher(Float32, 'range', 10)
        self.k = 0
        self.create_timer(0.1, self.tick)

    def tick(self):
        # {{t:tasks.range-pipeline.code.approach}}
        msg = Float32()
        msg.data = max(0.2, 2.0 - 0.1 * self.k)
        self.k += 1
        self.pub.publish(msg)


class Filter(Node):
    def __init__(self):
        super().__init__('filter')
        # {{t:tasks.range-pipeline.code.filter}}


class Safety(Node):
    def __init__(self):
        super().__init__('safety')
        # {{t:tasks.range-pipeline.code.safety}}


rclpy.init()
executor = SingleThreadedExecutor()
for node in (Sensor(), Filter(), Safety()):
    executor.add_node(node)
executor.spin()
`;

const T3_SOLUTION = `import rclpy
from rclpy.node import Node
from rclpy.executors import SingleThreadedExecutor
from std_msgs.msg import Float32
from geometry_msgs.msg import Twist


class Sensor(Node):
    def __init__(self):
        super().__init__('sensor')
        self.pub = self.create_publisher(Float32, 'range', 10)
        self.k = 0
        self.create_timer(0.1, self.tick)

    def tick(self):
        msg = Float32()
        msg.data = max(0.2, 2.0 - 0.1 * self.k)
        self.k += 1
        self.pub.publish(msg)


class Filter(Node):
    def __init__(self):
        super().__init__('filter')
        self.declare_parameter('window', 4)
        self.samples = []
        self.pub = self.create_publisher(Float32, 'range_avg', 10)
        self.create_subscription(Float32, 'range', self.on_range, 10)

    def on_range(self, msg):
        self.samples.append(msg.data)
        if len(self.samples) > self.get_parameter('window').value:
            self.samples.pop(0)
        out = Float32()
        out.data = sum(self.samples) / len(self.samples)
        self.pub.publish(out)
        self.get_logger().info(f'avg={out.data:.2f} m')


class Safety(Node):
    def __init__(self):
        super().__init__('safety')
        self.declare_parameter('stop_m', 0.5)
        self.stopped = False
        self.cmd = self.create_publisher(Twist, 'cmd_vel', 10)
        self.create_subscription(Float32, 'range_avg', self.on_avg, 10)

    def on_avg(self, msg):
        if not self.stopped and msg.data < self.get_parameter('stop_m').value:
            self.stopped = True
            self.cmd.publish(Twist())
            self.get_logger().warn(f'obstacle at {msg.data:.2f} m: stop')


rclpy.init()
executor = SingleThreadedExecutor()
for node in (Sensor(), Filter(), Safety()):
    executor.add_node(node)
executor.spin()
`;

const NO_WORLD = { inputs: [], script: [] };

const bench = {
  lab: 'robotics',
  id: 'pi5-ros2',
  fig: 13,
  board: 'pi4-pi5',
  modules: [],
  parts: [],
  figure: {
    page: '/figures/robotics/pi5-ros2.html',
    parts: [
      { id: 'U1', short: 'SOC', role: 'soc', name: 'parts.U1.name', what: 'parts.U1.what' },
      { id: 'U2', short: 'RAM', role: 'memory', name: 'parts.U2.name', what: 'parts.U2.what' },
      { id: 'U3', short: 'RP1', role: 'other', name: 'parts.U3.name', what: 'parts.U3.what' },
      { id: 'U4', short: 'PMIC', role: 'regulator', name: 'parts.U4.name', what: 'parts.U4.what' },
      { id: 'U5', short: 'WI-FI', role: 'radio', name: 'parts.U5.name', what: 'parts.U5.what' },
      { id: 'U6', short: 'ETH PHY', role: 'other', name: 'parts.U6.name', what: 'parts.U6.what' },
      { id: 'L1', short: 'INDUCTORS', role: 'passive', name: 'parts.L1.name', what: 'parts.L1.what' },
      { id: 'RC', short: 'PASSIVES', role: 'passive', name: 'parts.RC.name', what: 'parts.RC.what' },
      { id: 'LED1', short: 'LED', role: 'led', name: 'parts.LED1.name', what: 'parts.LED1.what' },
      { id: 'SW1', short: 'POWER', role: 'button', name: 'parts.SW1.name', what: 'parts.SW1.what' },
      { id: 'J1', short: 'USB-C', role: 'connector', name: 'parts.J1.name', what: 'parts.J1.what' },
      { id: 'J20', short: 'PCIE', role: 'connector', name: 'parts.J20.name', what: 'parts.J20.what' },
      { id: 'J3', short: 'CAM/DISP 0', role: 'connector', name: 'parts.J3.name', what: 'parts.J3.what' },
      { id: 'J4', short: 'CAM/DISP 1', role: 'connector', name: 'parts.J4.name', what: 'parts.J4.what' },
      { id: 'J5', short: 'BAT', role: 'connector', name: 'parts.J5.name', what: 'parts.J5.what' },
      { id: 'UART', short: 'UART', role: 'connector', name: 'parts.UART.name', what: 'parts.UART.what' },
      { id: 'FAN', short: 'FAN', role: 'connector', name: 'parts.FAN.name', what: 'parts.FAN.what' },
      { id: 'MICROSD', short: 'MICROSD', role: 'socket', name: 'parts.MICROSD.name', what: 'parts.MICROSD.what' },
      { id: 'J6', short: 'HDMI0', role: 'connector', name: 'parts.J6.name', what: 'parts.J6.what' },
      { id: 'J13', short: 'HDMI1', role: 'connector', name: 'parts.J13.name', what: 'parts.J13.what' },
      { id: 'J8', short: 'GPIO', role: 'header', name: 'parts.J8.name', what: 'parts.J8.what' },
      { id: 'J14', short: 'POE+', role: 'header', name: 'parts.J14.name', what: 'parts.J14.what' },
      { id: 'J10', short: 'ETHERNET', role: 'connector', name: 'parts.J10.name', what: 'parts.J10.what' },
      { id: 'J12', short: 'USB 3', role: 'connector', name: 'parts.J12.name', what: 'parts.J12.what' },
      { id: 'J11', short: 'USB 2', role: 'connector', name: 'parts.J11.name', what: 'parts.J11.what' },
      { id: 'CARD', short: 'SD CARD', role: 'memory', name: 'parts.CARD.name', what: 'parts.CARD.what' },
      { id: 'COOLER', short: 'COOLER', role: 'mechanical', name: 'parts.COOLER.name', what: 'parts.COOLER.what' },
    ],
    sheets: ['board', 'power'],
  },
  power: { source: 'usb', label: 'power.label', ok: 'power.ok' },
  modes: [
    {
      id: 'boot',
      instant: true,
      language: 'python',
      code: { source: BOOT_CHECK, libraries: [] },
      bytes: BOOT_CHECK.length,
      serial: [
        '[    0.000000] Booting Linux on physical CPU 0x0000000000 [0x414fd0b1]',
        '[    0.000000] Machine model: Raspberry Pi 5 Model B Rev 1.0',
        '[    0.912482] brcm-pcie 1000120000.pcie: link up, 5.0 GT/s PCIe x4 (!SSC)',
        '[    2.981230] systemd[1]: Reached target multi-user.target - Multi-User System.',
        'robot@pi5:~ $ python3 boot_check.py',
        'Raspberry Pi 5 Model B Rev 1.0',
        'throttled=0x0',
        "temp=51.6'C",
        'frequency(0)=2400000000',
      ],
      title: 'modes.boot.title',
    },
    {
      id: 'teleop',
      instant: true,
      language: 'python',
      code: { source: DRIVE, libraries: ['rclpy'] },
      bytes: DRIVE.length,
      serial: [
        'robot@pi5:~ $ source /opt/ros/lyrical/setup.bash',
        'robot@pi5:~ $ ros2 run my_robot drive &',
        '[INFO] [drive]: publishing /cmd_vel at 10 Hz',
        'robot@pi5:~ $ ros2 topic hz /cmd_vel',
        'average rate: 10.000',
        '\tmin: 0.100s max: 0.100s std dev: 0.00012s window: 12',
        'robot@pi5:~ $ ros2 topic echo /cmd_vel --field linear.x',
        '0.2',
        '[WARN] [drive]: CPU at 85.0 C: the firmware is throttling the clock',
      ],
      title: 'modes.teleop.title',
    },
    {
      id: 'health',
      instant: true,
      language: 'python',
      code: { source: HEALTH, libraries: [] },
      bytes: HEALTH.length,
      serial: [
        'robot@pi5:~ $ python3 health.py',
        'throttled=0x50005',
        '  bit  0  under-voltage now',
        '  bit  2  throttled now',
        '  bit 16  under-voltage has happened since boot',
        '  bit 18  throttling has happened',
        'hwmon hwmon1: Undervoltage detected!',
      ],
      title: 'modes.health.title',
    },
  ],
  defaultMode: 'boot',
  steps: [
    { id: 'strip', kind: 'build', action: { type: 'set', state: { power: null, build: 'bare' } }, done: { build: 'bare' }, major: false,
      title: 'steps.strip.title', body: 'steps.strip.body', refusal: 'steps.strip.refusal' },
    { id: 'smd', kind: 'build', action: { type: 'press', id: 'pnp' }, done: { build: 'reflowed' }, major: true,
      title: 'steps.smd.title', body: 'steps.smd.body', refusal: 'steps.smd.refusal' },
    { id: 'low', kind: 'build', action: { type: 'press', id: 'place', choice: 'group-low' }, done: { 'tasks.low-in': true }, major: false,
      title: 'steps.low.title', body: 'steps.low.body', refusal: 'steps.low.refusal' },
    { id: 'tall', kind: 'build', action: { type: 'press', id: 'place', choice: 'group-tall' }, done: { 'tasks.tall-in': true }, major: false,
      title: 'steps.tall.title', body: 'steps.tall.body', refusal: 'steps.tall.refusal' },
    { id: 'solder', kind: 'build', action: { type: 'press', id: 'solder' }, done: { build: 'soldered' }, major: true,
      title: 'steps.solder.title', body: 'steps.solder.body', refusal: 'steps.solder.refusal' },
    { id: 'card', kind: 'build', action: { type: 'press', id: 'place', choice: 'card' }, done: { 'tasks.card-in': true }, major: false,
      title: 'steps.card.title', body: 'steps.card.body', refusal: 'steps.card.refusal' },
    { id: 'cooler', kind: 'build', action: { type: 'press', id: 'place', choice: 'cooler' }, done: { build: 'assembled' }, major: false,
      title: 'steps.cooler.title', body: 'steps.cooler.body', refusal: 'steps.cooler.refusal' },
    { id: 'plug', kind: 'build', action: { type: 'set', state: { mode: 'boot', power: 'usb' } }, done: { power: 'usb', status: 'running' }, major: true,
      title: 'steps.plug.title', body: 'steps.plug.body', refusal: 'steps.plug.refusal' },
    { id: 'teleop', kind: 'test', action: { type: 'set', state: { mode: 'teleop' } }, done: { mode: 'teleop', status: 'running' }, major: true,
      title: 'steps.teleop.title', body: 'steps.teleop.body' },
    { id: 'health', kind: 'test', action: { type: 'set', state: { mode: 'health' } }, done: { mode: 'health', status: 'running', 'meas.U4.throttled': '0x0' }, major: false,
      title: 'steps.health.title', body: 'steps.health.body' },
    { id: 'charger', kind: 'break', action: { type: 'set', state: { fault: 'wrong-voltage:charger:4.6', power: 'charger' } }, done: { power: 'usb', status: 'running' }, fault: 'undervoltage', major: true,
      title: 'steps.charger.title', body: 'steps.charger.body' },
    { id: 'no-cooler', kind: 'break', action: { type: 'set', state: { mode: 'teleop', fault: 'missing:COOLER', power: 'usb' } }, done: { power: 'usb', build: 'assembled', status: 'running' }, fault: 'no-cooler', major: true,
      title: 'steps.no-cooler.title', body: 'steps.no-cooler.body' },
    { id: 'cold-fan', kind: 'break', action: { type: 'set', state: { fault: 'cold:FAN' } }, done: { status: 'running' }, fault: 'cold-fan', major: false,
      title: 'steps.cold-fan.title', body: 'steps.cold-fan.body' },
    { id: 'motors', kind: 'break', action: { type: 'set', state: { fault: 'brownout', power: 'pin5' } }, done: { power: 'usb', status: 'running' }, fault: 'motor-brownout', major: false,
      title: 'steps.motors.title', body: 'steps.motors.body' },
    { id: 'reverse', kind: 'break', action: { type: 'set', state: { fault: 'reverse-polarity:pin5', power: 'pin5' } }, done: { power: 'usb', status: 'running' }, fault: 'reverse-gpio', major: false,
      title: 'steps.reverse.title', body: 'steps.reverse.body' },
    { id: 'overvolt', kind: 'break', action: { type: 'set', state: { fault: 'wrong-voltage:pin5:12', power: 'pin5' } }, done: { power: 'usb', status: 'running' }, fault: 'gpio-12v', major: false,
      title: 'steps.overvolt.title', body: 'steps.overvolt.body' },
    { id: 'exploded', kind: 'test', action: { type: 'set', state: { power: null, exploded: true } }, done: { exploded: true }, major: false,
      title: 'steps.exploded.title', body: 'steps.exploded.body', refusal: 'steps.exploded.refusal' },
  ],
  faults: [
    {
      id: 'undervoltage',
      kind: 'wrong-voltage',
      trigger: { by: 'power-input', input: 'charger', volts: 4.6 },
      figure: { type: 'set', state: { fault: 'wrong-voltage:charger:4.6', power: 'charger' } },
      effect: { power: 'on', halts: false, serial: ['hwmon hwmon1: Undervoltage detected!', 'throttled=0x50005'] },
      title: 'faults.undervoltage.title', symptom: 'faults.undervoltage.symptom', explanation: 'faults.undervoltage.explanation', fix: 'faults.undervoltage.fix',
    },
    {
      id: 'no-cooler',
      kind: 'thermal',
      trigger: { by: 'remove-part', part: 'COOLER' },
      figure: { type: 'set', state: { mode: 'teleop', fault: 'missing:COOLER', power: 'usb' } },
      effect: { power: 'on', halts: false, serial: ['[WARN] [drive]: CPU at 85.0 C: the firmware is throttling the clock', 'throttled=0x40004'] },
      title: 'faults.no-cooler.title', symptom: 'faults.no-cooler.symptom', explanation: 'faults.no-cooler.explanation', fix: 'faults.no-cooler.fix',
    },
    {
      id: 'cold-fan',
      kind: 'cold-solder',
      trigger: { by: 'cold-joint', part: 'FAN' },
      figure: { type: 'set', state: { fault: 'cold:FAN' } },
      effect: { power: 'on', halts: false },
      title: 'faults.cold-fan.title', symptom: 'faults.cold-fan.symptom', explanation: 'faults.cold-fan.explanation', fix: 'faults.cold-fan.fix',
    },
    {
      id: 'motor-brownout',
      kind: 'brownout',
      trigger: { by: 'load', rail: '5V', ma: 2600, part: 'tt-motor' },
      figure: { type: 'set', state: { fault: 'brownout', power: 'pin5' } },
      effect: { power: 'resetting', halts: true, extraMa: 2600, serial: ['[    0.000000] Booting Linux on physical CPU 0x0000000000 [0x414fd0b1]'] },
      title: 'faults.motor-brownout.title', symptom: 'faults.motor-brownout.symptom', explanation: 'faults.motor-brownout.explanation', fix: 'faults.motor-brownout.fix',
    },
    {
      id: 'reverse-gpio',
      kind: 'reverse-polarity',
      trigger: { by: 'reverse', input: 'pin5' },
      figure: { type: 'set', state: { fault: 'reverse-polarity:pin5', power: 'pin5' } },
      effect: { power: 'off', halts: true, damages: ['U4'] },
      title: 'faults.reverse-gpio.title', symptom: 'faults.reverse-gpio.symptom', explanation: 'faults.reverse-gpio.explanation', fix: 'faults.reverse-gpio.fix',
    },
    {
      id: 'gpio-12v',
      kind: 'wrong-voltage',
      trigger: { by: 'power-input', input: 'pin5', volts: 12 },
      figure: { type: 'set', state: { fault: 'wrong-voltage:pin5:12', power: 'pin5' } },
      effect: { power: 'off', halts: true, damages: ['U4'] },
      title: 'faults.gpio-12v.title', symptom: 'faults.gpio-12v.symptom', explanation: 'faults.gpio-12v.explanation', fix: 'faults.gpio-12v.fix',
    },
    {
      id: 'no-card',
      kind: 'missing-part',
      trigger: { by: 'remove-part', part: 'CARD' },
      figure: { type: 'set', state: { fault: 'missing:CARD' } },
      effect: { power: 'on', halts: true },
      title: 'faults.no-card.title', symptom: 'faults.no-card.symptom', explanation: 'faults.no-card.explanation', fix: 'faults.no-card.fix',
    },
    {
      id: 'no-pmic',
      kind: 'missing-part',
      trigger: { by: 'remove-part', part: 'U4' },
      figure: { type: 'set', state: { fault: 'missing:U4' } },
      effect: { power: 'off', halts: true },
      title: 'faults.no-pmic.title', symptom: 'faults.no-pmic.symptom', explanation: 'faults.no-pmic.explanation', fix: 'faults.no-pmic.fix',
    },
    {
      id: 'no-soc',
      kind: 'missing-part',
      trigger: { by: 'remove-part', part: 'U1' },
      figure: { type: 'set', state: { fault: 'missing:U1' } },
      effect: { power: 'on', halts: true },
      title: 'faults.no-soc.title', symptom: 'faults.no-soc.symptom', explanation: 'faults.no-soc.explanation', fix: 'faults.no-soc.fix',
    },
    {
      id: 'no-ram',
      kind: 'missing-part',
      trigger: { by: 'remove-part', part: 'U2' },
      figure: { type: 'set', state: { fault: 'missing:U2' } },
      effect: { power: 'on', halts: true },
      title: 'faults.no-ram.title', symptom: 'faults.no-ram.symptom', explanation: 'faults.no-ram.explanation', fix: 'faults.no-ram.fix',
    },
    {
      id: 'no-rp1',
      kind: 'missing-part',
      trigger: { by: 'remove-part', part: 'U3' },
      figure: { type: 'set', state: { fault: 'missing:U3' } },
      effect: { power: 'on', halts: true },
      title: 'faults.no-rp1.title', symptom: 'faults.no-rp1.symptom', explanation: 'faults.no-rp1.explanation', fix: 'faults.no-rp1.fix',
    },
  ],
  status: [
    { id: 'run', key: 'status', format: 'running', label: 'status.run' },
    { id: 'powered', key: 'rails.5V', format: 'on-off', label: 'status.powered' },
    { id: 'supply', key: 'rails.5V', format: 'volts', label: 'status.supply' },
    { id: 'cpu', key: 'meas.U1.c', format: 'number', label: 'status.cpu' },
    { id: 'clock', key: 'meas.U1.ghz', format: 'number', label: 'status.clock' },
    { id: 'throttled', key: 'meas.U4.throttled', format: 'text', label: 'status.throttled' },
    { id: 'fan', key: 'meas.COOLER.duty', format: 'percent', label: 'status.fan' },
    { id: 'current', key: 'currentMa', format: 'ma', label: 'status.current' },
  ],
  current: {
    supplies: [
      // The robot's 3 A buck comes first: a fault's extra current (the stalled motors) lands on the first supply.
      { id: 'pin5', volts: 5.1, limitMa: 3000, label: 'current.pin5' },
      { id: 'usb', volts: 5.1, limitMa: 5000, label: 'current.usb' },
      { id: 'charger', volts: 5.0, limitMa: 2000, label: 'current.charger' },
    ],
    loads: [
      { id: 'pi-usb', supply: 'usb', ma: 800, when: { power: 'usb', status: 'running' }, label: 'current.pi' },
      { id: 'ros-usb', supply: 'usb', ma: 600, when: { power: 'usb', status: 'running', mode: 'teleop' }, label: 'current.ros' },
      { id: 'camera-usb', supply: 'usb', ma: 700, when: { power: 'usb', status: 'running', mode: 'teleop' }, label: 'current.camera' },
      { id: 'fan-usb', supply: 'usb', ma: 0, when: { power: 'usb', status: 'running' }, perUnit: { key: 'meas.COOLER.duty', maPerUnit: 60 }, label: 'current.fan' },
      { id: 'pi-charger', supply: 'charger', ma: 800, when: { power: 'charger', status: 'running' }, label: 'current.pi' },
      { id: 'ros-charger', supply: 'charger', ma: 600, when: { power: 'charger', status: 'running', mode: 'teleop' }, label: 'current.ros' },
      { id: 'camera-charger', supply: 'charger', ma: 700, when: { power: 'charger', status: 'running', mode: 'teleop' }, label: 'current.camera' },
      { id: 'fan-charger', supply: 'charger', ma: 0, when: { power: 'charger', status: 'running' }, perUnit: { key: 'meas.COOLER.duty', maPerUnit: 60 }, label: 'current.fan' },
      { id: 'pi-pin5', supply: 'pin5', ma: 800, when: { power: 'pin5', status: 'running' }, label: 'current.pi' },
      { id: 'ros-pin5', supply: 'pin5', ma: 600, when: { power: 'pin5', status: 'running', mode: 'teleop' }, label: 'current.ros' },
      { id: 'camera-pin5', supply: 'pin5', ma: 700, when: { power: 'pin5', status: 'running', mode: 'teleop' }, label: 'current.camera' },
      { id: 'fan-pin5', supply: 'pin5', ma: 0, when: { power: 'pin5', status: 'running' }, perUnit: { key: 'meas.COOLER.duty', maPerUnit: 60 }, label: 'current.fan' },
    ],
  },
  tasks: [
    {
      id: 'cmd-vel-10hz',
      board: 'pi4-pi5',
      language: 'python',
      starter: { source: T1_STARTER, libraries: ['rclpy'] },
      solution: T1_SOLUTION,
      circuit: null,
      world: NO_WORLD,
      runMs: 2050,
      checks: [
        { kind: 'code', must: ['create_timer(0.1', 'rclpy.spin('], mustNot: ['time.sleep', 'while True'], label: 'tasks.cmd-vel-10hz.checks.1' },
        { kind: 'serial', match: '^\\[INFO\\] \\[drive\\]: linear\\.x=0\\.20 angular\\.z=0\\.50$', regex: true, minCount: 19, byMs: 2050, label: 'tasks.cmd-vel-10hz.checks.2' },
        { kind: 'runs', minMs: 2000, label: 'tasks.cmd-vel-10hz.checks.3' },
      ],
      title: 'tasks.cmd-vel-10hz.title',
      brief: 'tasks.cmd-vel-10hz.brief',
      hints: ['tasks.cmd-vel-10hz.hints.1', 'tasks.cmd-vel-10hz.hints.2', 'tasks.cmd-vel-10hz.hints.3'],
    },
    {
      id: 'diff-drive',
      board: 'pi4-pi5',
      language: 'python',
      starter: { source: T2_STARTER, libraries: ['rclpy'] },
      solution: T2_SOLUTION,
      circuit: null,
      world: NO_WORLD,
      runMs: 1550,
      checks: [
        { kind: 'code', must: ["declare_parameter('wheel_base'", 'create_subscription(Twist'], mustNot: ['time.sleep'], label: 'tasks.diff-drive.checks.1' },
        { kind: 'serial', match: '^\\[INFO\\] \\[base\\]: left=0\\.16 right=0\\.24 m/s$', regex: true, minCount: 14, byMs: 1550, label: 'tasks.diff-drive.checks.2' },
      ],
      title: 'tasks.diff-drive.title',
      brief: 'tasks.diff-drive.brief',
      hints: ['tasks.diff-drive.hints.1', 'tasks.diff-drive.hints.2', 'tasks.diff-drive.hints.3'],
    },
    {
      id: 'range-pipeline',
      board: 'pi4-pi5',
      language: 'python',
      starter: { source: T3_STARTER, libraries: ['rclpy'] },
      solution: T3_SOLUTION,
      circuit: null,
      world: NO_WORLD,
      runMs: 3000,
      checks: [
        { kind: 'code', must: ["declare_parameter('window'", "declare_parameter('stop_m'", "create_subscription(Float32, 'range'"], mustNot: ['time.sleep'], label: 'tasks.range-pipeline.checks.1' },
        { kind: 'serial', match: '^\\[INFO\\] \\[filter\\]: avg=\\d\\.\\d\\d m$', regex: true, minCount: 25, byMs: 3000, label: 'tasks.range-pipeline.checks.2' },
        { kind: 'serial', match: '^\\[WARN\\] \\[safety\\]: obstacle at 0\\.45 m: stop$', regex: true, minCount: 1, byMs: 2000, label: 'tasks.range-pipeline.checks.3' },
      ],
      title: 'tasks.range-pipeline.title',
      brief: 'tasks.range-pipeline.brief',
      hints: ['tasks.range-pipeline.hints.1', 'tasks.range-pipeline.hints.2', 'tasks.range-pipeline.hints.3', 'tasks.range-pipeline.hints.4'],
    },
  ],
  quizzes: [
    {
      id: 'smd',
      afterStep: 'smd',
      questions: [
        { id: 'reflow', q: 'quizzes.smd.reflow.q', options: ['quizzes.smd.reflow.options.1', 'quizzes.smd.reflow.options.2', 'quizzes.smd.reflow.options.3'], answer: 0, why: 'quizzes.smd.reflow.why' },
        { id: 'pmic', q: 'quizzes.smd.pmic.q', options: ['quizzes.smd.pmic.options.1', 'quizzes.smd.pmic.options.2', 'quizzes.smd.pmic.options.3'], answer: 1, why: 'quizzes.smd.pmic.why' },
      ],
    },
    {
      id: 'solder',
      afterStep: 'solder',
      questions: [
        { id: 'order', q: 'quizzes.solder.order.q', options: ['quizzes.solder.order.options.1', 'quizzes.solder.order.options.2', 'quizzes.solder.order.options.3'], answer: 2, why: 'quizzes.solder.order.why' },
        { id: 'last', q: 'quizzes.solder.last.q', options: ['quizzes.solder.last.options.1', 'quizzes.solder.last.options.2', 'quizzes.solder.last.options.3'], answer: 0, why: 'quizzes.solder.last.why' },
      ],
    },
    {
      id: 'plug',
      afterStep: 'plug',
      questions: [
        { id: 'five-amps', q: 'quizzes.plug.five-amps.q', options: ['quizzes.plug.five-amps.options.1', 'quizzes.plug.five-amps.options.2', 'quizzes.plug.five-amps.options.3'], answer: 1, why: 'quizzes.plug.five-amps.why' },
        { id: 'led', q: 'quizzes.plug.led.q', options: ['quizzes.plug.led.options.1', 'quizzes.plug.led.options.2', 'quizzes.plug.led.options.3'], answer: 0, why: 'quizzes.plug.led.why' },
      ],
    },
    {
      id: 'teleop',
      afterStep: 'teleop',
      questions: [
        { id: 'realtime', q: 'quizzes.teleop.realtime.q', options: ['quizzes.teleop.realtime.options.1', 'quizzes.teleop.realtime.options.2', 'quizzes.teleop.realtime.options.3'], answer: 0, why: 'quizzes.teleop.realtime.why' },
        { id: 'rate', q: 'quizzes.teleop.rate.q', options: ['quizzes.teleop.rate.options.1', 'quizzes.teleop.rate.options.2', 'quizzes.teleop.rate.options.3'], answer: 2, why: 'quizzes.teleop.rate.why' },
      ],
    },
    {
      id: 'charger',
      afterStep: 'charger',
      questions: [
        { id: 'fix', q: 'quizzes.charger.fix.q', options: ['quizzes.charger.fix.options.1', 'quizzes.charger.fix.options.2', 'quizzes.charger.fix.options.3'], answer: 1, why: 'quizzes.charger.fix.why' },
        { id: 'bits', q: 'quizzes.charger.bits.q', options: ['quizzes.charger.bits.options.1', 'quizzes.charger.bits.options.2', 'quizzes.charger.bits.options.3'], answer: 0, why: 'quizzes.charger.bits.why' },
      ],
    },
    {
      id: 'heat',
      afterStep: 'no-cooler',
      questions: [
        { id: 'throttle', q: 'quizzes.heat.throttle.q', options: ['quizzes.heat.throttle.options.1', 'quizzes.heat.throttle.options.2', 'quizzes.heat.throttle.options.3'], answer: 1, why: 'quizzes.heat.throttle.why' },
        { id: 'fan', q: 'quizzes.heat.fan.q', options: ['quizzes.heat.fan.options.1', 'quizzes.heat.fan.options.2', 'quizzes.heat.fan.options.3'], answer: 0, why: 'quizzes.heat.fan.why' },
      ],
    },
    {
      id: 'end',
      afterStep: null,
      questions: [
        { id: 'distro', q: 'quizzes.end.distro.q', options: ['quizzes.end.distro.options.1', 'quizzes.end.distro.options.2', 'quizzes.end.distro.options.3'], answer: 1, why: 'quizzes.end.distro.why' },
        { id: 'gpio', q: 'quizzes.end.gpio.q', options: ['quizzes.end.gpio.options.1', 'quizzes.end.gpio.options.2', 'quizzes.end.gpio.options.3'], answer: 2, why: 'quizzes.end.gpio.why' },
        { id: 'battery', q: 'quizzes.end.battery.q', options: ['quizzes.end.battery.options.1', 'quizzes.end.battery.options.2', 'quizzes.end.battery.options.3'], answer: 0, why: 'quizzes.end.battery.why' },
        { id: 'motors', q: 'quizzes.end.motors.q', options: ['quizzes.end.motors.options.1', 'quizzes.end.motors.options.2', 'quizzes.end.motors.options.3'], answer: 1, why: 'quizzes.end.motors.why' },
      ],
    },
  ],
  sources: [
    { title: 'Raspberry Pi 5 product brief', url: 'https://datasheets.raspberrypi.com/rpi5/raspberry-pi-5-product-brief.pdf' },
    { title: 'Raspberry Pi documentation: power supplies (4.63 V under-voltage, 5 A and USB current limits)', url: 'https://www.raspberrypi.com/documentation/computers/raspberry-pi.html#power-supply' },
    { title: 'Raspberry Pi documentation: frequency management and thermal control (80-85 °C throttling, fan curve)', url: 'https://www.raspberrypi.com/documentation/computers/raspberry-pi.html#frequency-management-and-thermal-control' },
    { title: 'Raspberry Pi documentation: vcgencmd get_throttled bits', url: 'https://www.raspberrypi.com/documentation/computers/os.html#get_throttled' },
    { title: 'Raspberry Pi documentation: LED warning flash codes', url: 'https://www.raspberrypi.com/documentation/computers/configuration.html#led-warning-flash-codes' },
    { title: 'Whitepaper RP-004340-WP: extra PMIC features on Raspberry Pi 4, Raspberry Pi 5 and Compute Module 4', url: 'https://pip.raspberrypi.com/categories/685-whitepapers-app-notes' },
    { title: 'RP1 peripherals datasheet', url: 'https://datasheets.raspberrypi.com/rp1/rp1-peripherals.pdf' },
    { title: 'ROS 2 releases: Lyrical Luth (May 2026 LTS) and Jazzy Jalisco', url: 'https://docs.ros.org/en/rolling/Releases.html' },
    { title: 'ROS 2 tutorial: writing a simple publisher and subscriber (Python)', url: 'https://docs.ros.org/en/rolling/Tutorials/Beginner-Client-Libraries/Writing-A-Simple-Py-Publisher-And-Subscriber.html' },
  ],
  title: 'title',
  sub: 'sub',
  hint: 'hint',
  overview: 'overview',
} satisfies RoboticsContent;

export default bench;
