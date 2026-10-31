import type { PidTrace } from "@/core/robot-report";

/** The reference controller of ROBOTICS 9.3 as readable Arduino source: PI with a filtered derivative on the measurement and a clamped integral that stops growing while the output saturates. */
export const PID_ARDUINO = `// PID controller. Reads the response on A0 (0 to 1023), drives PWM pin 9.
const int SENSE_PIN = A0;
const int OUT_PIN = 9;

const float KP = 1.2;
const float KI = 0.8;
const float KD = 0.02;
const float TS = 0.02;       // control period, seconds
const float TF = 0.04;       // derivative filter time constant, seconds
const float I_MAX = 0.5;
const float U_MIN = 0.0;
const float U_MAX = 1.0;

float integral = 0;
float dFilt = 0;
float lastY = 0;
bool primed = false;
unsigned long lastStep = 0;

void setup() {
  Serial.begin(115200);
  pinMode(OUT_PIN, OUTPUT);
}

void loop() {
  unsigned long now = millis();
  if (now - lastStep < (unsigned long)(TS * 1000)) return;
  lastStep = now;

  float setpoint = now < 1000 ? 0.0 : 0.6;
  float y = analogRead(SENSE_PIN) / 1023.0;
  if (!primed) {
    lastY = y;
    primed = true;
  }

  float e = setpoint - y;
  float a = TS / (TS + TF);
  dFilt += a * ((lastY - y) / TS - dFilt);
  lastY = y;

  float p = KP * e;
  float d = KD * dFilt;
  float iNext = constrain(integral + KI * TS * e, -I_MAX, I_MAX);
  float raw = p + iNext + d;
  bool winding = (raw > U_MAX && e > 0) || (raw < U_MIN && e < 0);
  if (!winding) integral = iNext;
  float u = constrain(p + integral + d, U_MIN, U_MAX);

  analogWrite(OUT_PIN, (int)(u * 255));

  Serial.print("pid ");
  Serial.print(now);
  Serial.print(" ");
  Serial.print(setpoint, 4);
  Serial.print(" ");
  Serial.print(y, 4);
  Serial.print(" ");
  Serial.print(u, 4);
  Serial.print(" ");
  Serial.println(integral, 4);
}
`;

/** The same controller in MicroPython, printing the same `pid` lines. */
export const PID_MICROPYTHON = `# PID controller. Reads the response on ADC pin 26, drives PWM pin 15.
import time
from machine import ADC, PWM, Pin

sense = ADC(Pin(26))
out = PWM(Pin(15))
out.freq(1000)

KP = 1.2
KI = 0.8
KD = 0.02
TS = 0.02       # control period, seconds
TF = 0.04       # derivative filter time constant, seconds
I_MAX = 0.5
U_MIN = 0.0
U_MAX = 1.0

integral = 0.0
d_filt = 0.0
last_y = None
start = time.ticks_ms()


def clamp(x, lo, hi):
    return lo if x < lo else hi if x > hi else x


while True:
    now = time.ticks_diff(time.ticks_ms(), start)
    setpoint = 0.0 if now < 1000 else 0.6
    y = sense.read_u16() / 65535
    if last_y is None:
        last_y = y

    e = setpoint - y
    a = TS / (TS + TF)
    d_filt += a * ((last_y - y) / TS - d_filt)
    last_y = y

    p = KP * e
    d = KD * d_filt
    i_next = clamp(integral + KI * TS * e, -I_MAX, I_MAX)
    raw = p + i_next + d
    winding = (raw > U_MAX and e > 0) or (raw < U_MIN and e < 0)
    if not winding:
        integral = i_next
    u = clamp(p + integral + d, U_MIN, U_MAX)

    out.duty_u16(int(u * 65535))
    print("pid", now, "%.4f" % setpoint, "%.4f" % y, "%.4f" % u, "%.4f" % integral)
    time.sleep_ms(int(TS * 1000))
`;

const LINE = /^pid\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s*$/;

/** Reads the `pid <t_ms> <setpoint> <response> <output> <integral>` lines the reference sources print; any other serial text is skipped. */
export function parsePidLines(serial: ReadonlyArray<{ tNs: number; text: string }>): PidTrace {
  const trace: PidTrace = { tNs: [], setpoint: [], response: [], output: [], integral: [] };
  for (const entry of serial) {
    for (const line of entry.text.split("\n")) {
      const m = LINE.exec(line.trim());
      if (!m) continue;
      const [tMs, setpoint, response, output, integral] = m.slice(1).map(Number) as [number, number, number, number, number];
      if (![tMs, setpoint, response, output, integral].every(Number.isFinite)) continue;
      trace.tNs.push(tMs * 1e6);
      trace.setpoint.push(setpoint);
      trace.response.push(response);
      trace.output.push(output);
      trace.integral.push(integral);
    }
  }
  return trace;
}
