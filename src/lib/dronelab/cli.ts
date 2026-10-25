import type { CliEmulator } from "@/content/schema";

// The flight-controller console of a craft: a pure, deterministic emulation of the Betaflight / INAV CLI,
// MAVProxy (ArduPilot) and a cflib Python prompt over the craft's settings table (CliEmulator). Output is
// the firmware's own text, so it stays English like the real tools; the page around it is translated.

export type CliValue = string | number;
export type CliLineKind = "in" | "out" | "err" | "ok";
export type CliLine = { kind: CliLineKind; text: string };
export type CliPatch = Record<string, string | number | boolean>;

export type CliSession = {
  /** Settings as the console sees them now (unsaved edits included). */
  values: Record<string, CliValue>;
  /** Settings the flight controller has stored. */
  saved: Record<string, CliValue>;
  /** Extra configuration lines (aux, serial, mixer) in the order typed, current and stored. */
  extra: string[];
  savedExtra: string[];
  /** False after save / exit / defaults rebooted the board; the next command re-enters the CLI. */
  open: boolean;
  /** Mode the autopilot is in (MAVProxy). */
  mode: string | null;
};

/** What the console knows about the bench, for `status` and arming. */
export type CliContext = {
  /** FirmwareConfig.version, e.g. "Betaflight 2026.6.2". */
  version: string;
  plugged: boolean;
  cells: number;
  accCal: boolean;
  built: boolean;
};

export type CliResult = { session: CliSession; out: CliLine[]; effects: CliPatch[] };

const BF_BANNER = "Entering CLI Mode, type 'exit' to return, or 'help'";

const BF_HELP: Record<string, string> = {
  aux: "configure modes",
  defaults: "reset to defaults and reboot",
  diff: "list configuration changes from default",
  dump: "dump configuration",
  exit: "leave CLI mode, unsaved changes lost",
  get: "get variable value",
  help: "display command help",
  mixer: "configure mixer",
  save: "save and reboot",
  serial: "configure serial ports",
  servo: "configure servos",
  set: "change setting",
  smix: "servo mixer",
  status: "show status",
  version: "show version",
};

const MAV_HELP: Record<string, string> = {
  arm: "arm motors (arm throttle)",
  disarm: "disarm motors",
  help: "show help",
  mode: "change flight mode",
  param: "parameter handling (show, set, diff, fetch)",
  status: "show status",
};

const MIXERS = [
  "TRI",
  "QUADP",
  "QUADX",
  "BICOPTER",
  "GIMBAL",
  "Y6",
  "HEX6",
  "FLYING_WING",
  "Y4",
  "HEX6X",
  "OCTOX8",
  "OCTOFLATP",
  "OCTOFLATX",
  "AIRPLANE",
  "HELI_120_CCPM",
  "HELI_90_DEG",
  "VTAIL4",
  "HEX6H",
  "PPM_TO_SERVO",
  "DUALCOPTER",
  "SINGLECOPTER",
  "ATAIL4",
  "CUSTOM",
  "CUSTOMAIRPLANE",
  "CUSTOMTRI",
  "QUADX1234",
];

// Betaflight's feature and beeper names (src/main/fc/feature.h, src/main/io/beeper.c).
const FEATURES = [
  "RX_PPM",
  "INFLIGHT_ACC_CAL",
  "RX_SERIAL",
  "MOTOR_STOP",
  "SERVO_TILT",
  "SOFTSERIAL",
  "GPS",
  "RANGEFINDER",
  "TELEMETRY",
  "3D",
  "RX_PARALLEL_PWM",
  "RX_MSP",
  "RSSI_ADC",
  "LED_STRIP",
  "DISPLAY",
  "OSD",
  "CHANNEL_FORWARDING",
  "TRANSPONDER",
  "AIRMODE",
  "RX_SPI",
  "ESC_SENSOR",
  "ANTI_GRAVITY",
];
const BEEPERS = [
  "GYRO_CALIBRATED",
  "RX_LOST",
  "RX_LOST_LANDING",
  "DISARMING",
  "ARMING",
  "ARMING_GPS_FIX",
  "ARMING_GPS_NO_FIX",
  "BAT_CRIT_LOW",
  "BAT_LOW",
  "GPS_STATUS",
  "RX_SET",
  "ACC_CALIBRATION",
  "ACC_CALIBRATION_FAIL",
  "READY_BEEP",
  "MULTI_BEEPS",
  "DISARM_REPEAT",
  "ARMED",
  "SYSTEM_INIT",
  "ON_USB",
  "BLACKBOX_ERASE",
  "CRASH_FLIP",
  "CAM_CONNECTION_OPEN",
  "CAM_CONNECTION_CLOSE",
  "RC_SMOOTHING_INIT_FAIL",
  "ALL",
];
const VTX_SUBS = ["bands", "channels", "band", "powerlevels", "powervalues", "powerlabels"];

// Betaflight's arming-disable flags in bit order (docs/facts/quad5.md 5.13); the console reports the ones the
// bench can cause.
const BF_FLAGS = ["RXLOSS", "CLI", "NO_ACC_CAL"] as const;

// Servo limits at 2026.6.2 (target/common_defaults_post.h, drivers/servo_impl.h, rx/rx.h, flight/servos.h): 8
// servos, the pulses the CLI takes, 18 RC channels to forward from, 14 mixer inputs. TRI mixes stabilised yaw
// (input 2) into servo 5, the tail.
const SERVOS = 8;
const SERVO_PULSE = { min: 500, max: 2500 };
const SERVO_DEFAULT = "1000 2000 1500 100 -1";
const RC_CHANNELS = 18;
const SERVO_INPUTS = 14;
const TAIL = { servo: 5, input: 2 };

const servoLine = (extra: string[], i: number) => extra.find((l) => l.startsWith(`servo ${i} `)) ?? `servo ${i} ${SERVO_DEFAULT}`;

/** The stored `smix reverse <servo> <input> r` lines, in the order the firmware prints them. */
function reversals(extra: string[]): string[] {
  const key = (l: string) => l.split(" ").slice(2, 4).map(Number);
  return extra
    .filter((l) => l.startsWith("smix reverse "))
    .sort((a, b) => key(a)[0] - key(b)[0] || key(a)[1] - key(b)[1]);
}

/** Whether the tail servo answers yaw backwards: reversed in the mixer, or a negative rate (both cancel out). */
function tailReversed(extra: string[]): boolean {
  const mixer = extra.includes(`smix reverse ${TAIL.servo} ${TAIL.input} r`);
  const rate = Number(servoLine(extra, TAIL.servo).split(" ")[5]);
  return mixer !== rate < 0;
}

/** The flight patch for a stored tail reversal that changed: fly.ts turns `tailReverse` into the servo fault. */
function tailEffects(before: string[], after: string[]): CliPatch[] {
  const now = tailReversed(after);
  return now === tailReversed(before) ? [] : [{ tailReverse: now }];
}

/** C's atoi, which the firmware's smix parser uses: leading digits, 0 for anything else. */
const atoi = (text: string) => Number.parseInt(text, 10) || 0;

export function createCliSession(emu: CliEmulator): CliSession {
  return { values: { ...emu.settings }, saved: { ...emu.settings }, extra: [], savedExtra: [], open: true, mode: null };
}

/** The banner the console shows before the first command. */
export function cliBanner(emu: CliEmulator): CliLine[] {
  if (emu.kind === "betaflight-cli" || emu.kind === "inav-cli") return [{ kind: "out", text: BF_BANNER }];
  if (emu.kind === "cflib-python") return [{ kind: "out", text: "cf = scf.cf  # connected over Crazyradio" }];
  return [{ kind: "out", text: "Connect tcp:127.0.0.1:5760 source_system=255" }];
}

/** Settings whose current value differs from the stored one. */
export function unsavedCount(session: CliSession): number {
  const keys = Object.keys(session.values).filter((k) => !same(session.values[k], session.saved[k]));
  return keys.length + (session.extra.join("\n") === session.savedExtra.join("\n") ? 0 : 1);
}

function same(a: CliValue | undefined, b: CliValue | undefined): boolean {
  if (typeof a === "string" && typeof b === "string") return a.toUpperCase() === b.toUpperCase();
  return a === b;
}

/** Finds a setting by name, ignoring case as the firmware does; returns the table's own spelling. */
function settingName(emu: CliEmulator, name: string): string | null {
  const want = name.toLowerCase();
  return Object.keys(emu.settings).find((k) => k.toLowerCase() === want) ?? null;
}

type Parsed = { ok: true; value: CliValue } | { ok: false };

/** Validates a typed value against the setting's limits; lookup values come back in the table's spelling. */
export function parseValue(emu: CliEmulator, name: string, raw: string): Parsed {
  const limit = emu.limits[name];
  const text = raw.trim();
  if (!text) return { ok: false };
  if (limit?.values) {
    const hit = limit.values.find((v) => v.toLowerCase() === text.toLowerCase());
    return hit === undefined ? { ok: false } : { ok: true, value: hit };
  }
  const current = emu.settings[name];
  if (typeof current === "number" || limit?.min !== undefined || limit?.max !== undefined) {
    if (!/^-?\d+(\.\d+)?$/.test(text)) return { ok: false };
    const n = Number(text);
    if (limit?.min !== undefined && n < limit.min) return { ok: false };
    if (limit?.max !== undefined && n > limit.max) return { ok: false };
    return { ok: true, value: n };
  }
  return { ok: true, value: text };
}

function rangeLines(emu: CliEmulator, name: string, inav: boolean): string[] {
  const limit = emu.limits[name];
  if (!limit) return [];
  if (limit.values) return [`Allowed values: ${limit.values.join(", ")}`];
  if (limit.min !== undefined && limit.max !== undefined) return [`Allowed range: ${limit.min} - ${limit.max}`];
  if (inav && limit.min !== undefined) return [`Allowed range: ${limit.min} - `];
  return [];
}

function effectsFor(emu: CliEmulator, values: Record<string, CliValue>, changed: (name: string) => boolean): CliPatch[] {
  return emu.effects.filter((e) => changed(e.setting) && same(values[e.setting], e.equals)).map((e) => ({ ...e.set }));
}

const out = (text: string): CliLine => ({ kind: "out", text });
const err = (text: string): CliLine => ({ kind: "err", text });
const ok = (text: string): CliLine => ({ kind: "ok", text });

/** Runs one console line. Pure: the same session, context and input always give the same result. */
export function runCli(emu: CliEmulator, ctx: CliContext, session: CliSession, input: string): CliResult {
  const line = input.trim();
  const echo: CliLine = { kind: "in", text: `${emu.prompt}${line}` };
  // A whole-line comment ("# Betaflight 2026.6.2 ...", a pasted diff header) is ignored, as the firmware does.
  if (!line || line.startsWith("#")) return { session, out: [echo], effects: [] };
  switch (emu.kind) {
    case "betaflight-cli":
    case "inav-cli":
      return betaflight(emu, ctx, session, line, echo);
    case "mavproxy":
      return mavproxy(emu, ctx, session, line, echo);
    case "cflib-python":
      return cflib(emu, session, line, echo);
  }
}

function allowed(emu: CliEmulator, command: string): boolean {
  return emu.commands.includes(command);
}

function betaflight(emu: CliEmulator, ctx: CliContext, start: CliSession, line: string, echo: CliLine): CliResult {
  const inav = emu.kind === "inav-cli";
  const lines: CliLine[] = [echo];
  let s = start;
  if (!s.open) {
    lines.push(out(BF_BANNER));
    s = { ...s, open: true };
  }
  const [word, ...rest] = line.split(/\s+/);
  const command = word.toLowerCase();
  const args = line.slice(word.length).trim();
  // Betaflight prints "###ERROR IN <command>: <message>###"; INAV keeps the older "ERROR: <message>" form.
  const error = (cmd: string, msg: string, inavMsg = msg) => err(inav ? `ERROR: ${inavMsg}` : `###ERROR IN ${cmd}: ${msg}###`);
  const reboot = (session: CliSession, first: string): CliResult => ({
    session: { ...session, open: false },
    out: [...lines, out(first), out("Rebooting")],
    effects: [],
  });

  if (!allowed(emu, command) && command !== "help") {
    return { session: s, out: [...lines, err("Unknown command, try 'help'")], effects: [] };
  }

  const describe = (name: string): CliLine[] => [
    out(`${name} = ${s.values[name]}`),
    ...rangeLines(emu, name, inav).map(out),
    out(`Default value: ${emu.settings[name]}`),
  ];

  switch (command) {
    case "help": {
      const names = [...new Set([...emu.commands, "help"])].sort();
      return { session: s, out: [...lines, ...names.map((n) => out(BF_HELP[n] ? `${n} - ${BF_HELP[n]}` : n))], effects: [] };
    }
    case "version":
      return { session: s, out: [...lines, out(`# ${ctx.version}`)], effects: [] };
    case "status": {
      const flags = BF_FLAGS.filter((f) => f !== "NO_ACC_CAL" || !ctx.accCal);
      const volts = ctx.plugged
        ? `Voltage: ${Math.round(ctx.cells * 4.2 * 100)} * 0.01V (${ctx.cells}S battery - OK)`
        : "Voltage: 0 * 0.01V (0S battery - NOT PRESENT)";
      return {
        session: s,
        out: [...lines, out(`# ${ctx.version}`), out(volts), out(`Arming disable flags: ${flags.join(" ")}`)],
        effects: [],
      };
    }
    case "get": {
      const needle = args.toLowerCase();
      const names = Object.keys(emu.settings).filter((n) => !needle || n.toLowerCase().includes(needle));
      if (!needle || names.length === 0) {
        return { session: s, out: [...lines, error("get", `INVALID NAME: ${args}`, `Invalid name: ${args}`)], effects: [] };
      }
      return { session: s, out: [...lines, ...names.flatMap(describe)], effects: [] };
    }
    case "set": {
      if (!args) {
        const all = Object.keys(emu.settings).map((n) => out(`${n} = ${s.values[n]}`));
        return { session: s, out: [...lines, out("Current settings: "), ...all], effects: [] };
      }
      const eq = args.indexOf("=");
      if (eq < 0) {
        const needle = args.toLowerCase();
        const names = Object.keys(emu.settings).filter((n) => n.toLowerCase().includes(needle));
        if (names.length === 0)
          return { session: s, out: [...lines, error("set", `INVALID NAME: ${args}`, `Invalid name: ${args}`)], effects: [] };
        return { session: s, out: [...lines, ...names.flatMap(describe)], effects: [] };
      }
      const typed = args.slice(0, eq).trim();
      const name = settingName(emu, typed);
      if (!name)
        return { session: s, out: [...lines, error("set", `INVALID NAME: ${typed}`, `Invalid name: ${typed}`)], effects: [] };
      const parsed = parseValue(emu, name, args.slice(eq + 1));
      if (!parsed.ok) {
        return {
          session: s,
          out: [...lines, error("set", "INVALID VALUE", "Invalid value"), ...rangeLines(emu, name, inav).map(out)],
          effects: [],
        };
      }
      const values = { ...s.values, [name]: parsed.value };
      return { session: { ...s, values }, out: [...lines, ok(`${name} set to ${parsed.value}`)], effects: [] };
    }
    case "mixer": {
      if (!args) return { session: s, out: [...lines, out(`Mixer: ${mixerOf(s) ?? "QUADX"}`)], effects: [] };
      if (args.toLowerCase() === "list")
        return { session: s, out: [...lines, out(`Available: ${MIXERS.join(" ")}`)], effects: [] };
      const name = MIXERS.find((m) => m.toLowerCase() === args.toLowerCase());
      if (!name) return { session: s, out: [...lines, error("mixer", "INVALID NAME", "Invalid name")], effects: [] };
      const extra = [...s.extra.filter((l) => !l.startsWith("mixer ")), `mixer ${name}`];
      return { session: { ...s, extra }, out: [...lines, ok(`Mixer set to ${name}`)], effects: [] };
    }
    case "aux": {
      const nums = rest.map(Number);
      const valid = (rest.length === 6 || rest.length === 7) && nums.every((n) => Number.isInteger(n) && n >= 0);
      const rangeOk = valid && nums[3] >= 900 && nums[4] <= 2100 && nums[3] < nums[4] && nums[3] % 25 === 0 && nums[4] % 25 === 0;
      // The mode is its numeric permanent ID (1 = ANGLE), never a name.
      if (!valid || !rangeOk) return { session: s, out: [...lines, error("aux", "PARSING FAILED", "Parse error")], effects: [] };
      const full = nums.length === 6 ? [...nums, 0] : nums;
      const text = `aux ${full.join(" ")}`;
      const extra = [...s.extra.filter((l) => !l.startsWith(`aux ${full[0]} `)), text];
      return { session: { ...s, extra }, out: [...lines, ok(text)], effects: [] };
    }
    case "serial": {
      if (rest.length === 0)
        return { session: s, out: [...lines, ...s.extra.filter((l) => l.startsWith("serial ")).map(out)], effects: [] };
      const [port, ...vals] = rest;
      const portOk = /^(UART|SOFTSERIAL|VCP|LPUART)\d*$/i.test(port) || /^\d+$/.test(port);
      if (!portOk || vals.length !== 5 || !vals.every((v) => /^\d+$/.test(v))) {
        return { session: s, out: [...lines, error("serial", "PARSING FAILED", "Parse error")], effects: [] };
      }
      const name = /^\d+$/.test(port) ? (port === "20" ? "VCP" : `UART${Number(port) + 1}`) : port.toUpperCase();
      const text = `serial ${name} ${vals.join(" ")}`;
      const extra = [...s.extra.filter((l) => !l.startsWith(`serial ${name} `)), text];
      return { session: { ...s, extra }, out: [...lines, ok(text)], effects: [] };
    }
    case "servo": {
      if (!args) {
        const rows = Array.from({ length: SERVOS }, (_, i) => servoLine(s.extra, i));
        return { session: s, out: [...lines, ...[...rows, ...reversals(s.extra)].map(out)], effects: [] };
      }
      // whole numbers only, possibly negative: servo <index> <min> <max> <middle> <rate> <forward>
      if (!rest.every((t) => /^-?\d+$/.test(t))) return { session: s, out: [...lines, error("servo", "PARSING FAILED")], effects: [] };
      const [i, min, max, middle, rate, forward] = rest.map(Number);
      if (rest.length !== 6 || i < 0 || i >= SERVOS)
        return { session: s, out: [...lines, error("servo", "INVALID ARGUMENT COUNT")], effects: [] };
      const pulse = (n: number) => n >= SERVO_PULSE.min && n <= SERVO_PULSE.max;
      if (!pulse(min) || !pulse(max) || middle < min || middle > max || Math.abs(rate) > 100 || forward >= RC_CHANNELS)
        return { session: s, out: [...lines, error("servo", "ARGUMENT OUT OF RANGE")], effects: [] };
      const text = `servo ${i} ${min} ${max} ${middle} ${rate} ${forward}`;
      const extra = [...s.extra.filter((l) => !l.startsWith(`servo ${i} `)), text];
      return { session: { ...s, extra }, out: [...lines, ok(text)], effects: [] };
    }
    case "smix": {
      const [sub = "", ...params] = rest;
      const reversed = (extra: string[]) => reversals(extra).map(out);
      // A bare smix lists the custom servo rules; TRI uses its built-in one and rules aren't modelled, so none.
      if (!args) return { session: s, out: lines, effects: [] };
      if (sub.toLowerCase() === "reset") {
        return { session: { ...s, extra: s.extra.filter((l) => !l.startsWith("smix reverse ")) }, out: lines, effects: [] };
      }
      if (sub.toLowerCase() !== "reverse") return { session: s, out: [...lines, error("smix", "PARSING FAILED")], effects: [] };
      // The firmware prints an 8 x 14 table of r and n; the reversed sources alone, as diff shows them, fit a phone.
      if (params.length === 0) return { session: s, out: [...lines, ...reversed(s.extra)], effects: [] };
      if (params.length < 3) return { session: s, out: [...lines, error("smix", "INVALID ARGUMENT COUNT")], effects: [] };
      const [servo, input] = params.slice(0, 2).map(atoi);
      const flag = params[2][0];
      if (servo < 0 || servo >= SERVOS || input < 0 || input >= SERVO_INPUTS || (flag !== "r" && flag !== "n")) {
        return { session: s, out: [...lines, error("smix", `servo NOT BETWEEN 0 AND ${SERVOS}`)], effects: [] };
      }
      const text = `smix reverse ${servo} ${input} r`;
      const extra = [...s.extra.filter((l) => l !== text), ...(flag === "r" ? [text] : [])];
      return { session: { ...s, extra }, out: [...lines, ...reversed(extra)], effects: [] };
    }
    case "feature":
    case "beeper": {
      const names = command === "feature" ? FEATURES : BEEPERS;
      const stored = s.extra.filter((l) => l.startsWith(`${command} `));
      if (!args) return { session: s, out: [...lines, ...(stored.length ? stored : [`${command}`]).map(out)], effects: [] };
      const off = args.startsWith("-");
      const name = args.replace(/^-/, "").toUpperCase();
      if (!names.includes(name))
        return { session: s, out: [...lines, error(command, "INVALID NAME", "Invalid name")], effects: [] };
      const text = `${command} ${off ? "-" : ""}${name}`;
      const extra = [...s.extra.filter((l) => l !== `${command} ${name}` && l !== `${command} -${name}`), text];
      return { session: { ...s, extra }, out: [...lines, ok(`${off ? "Disabled" : "Enabled"} ${name}`)], effects: [] };
    }
    case "resource": {
      if (!args)
        return { session: s, out: [...lines, ...s.extra.filter((l) => l.startsWith("resource ")).map(out)], effects: [] };
      const m = /^([A-Za-z_]+)\s+(\d+)\s+([A-Ha-h])(\d{1,2})$|^([A-Za-z_]+)\s+(\d+)\s+(none)$/i.exec(args);
      if (!m) return { session: s, out: [...lines, error("resource", "PARSING FAILED", "Parse error")], effects: [] };
      const type = (m[1] ?? m[5]).toUpperCase();
      const index = Number(m[2] ?? m[6]);
      const pin = m[3] ? `${m[3].toUpperCase()}${m[4].padStart(2, "0")}` : "NONE";
      const text = `resource ${type} ${index} ${pin}`;
      const extra = [...s.extra.filter((l) => !l.startsWith(`resource ${type} ${index} `)), text];
      return { session: { ...s, extra }, out: [...lines, ok(`Resource ${type} ${index} set to ${pin}`)], effects: [] };
    }
    case "vtxtable": {
      const sub = (rest[0] ?? "").toLowerCase();
      if (!args)
        return { session: s, out: [...lines, ...s.extra.filter((l) => l.startsWith("vtxtable ")).map(out)], effects: [] };
      const values = rest.slice(1);
      const numbers = values.every((v) => /^\d+$/.test(v));
      const valid =
        VTX_SUBS.includes(sub) &&
        values.length > 0 &&
        (sub === "band"
          ? values.length >= 5 && /^\d+$/.test(values[0]) && /^(FACTORY|CUSTOM)$/i.test(values[3])
          : sub === "powerlabels" || numbers);
      if (!valid) return { session: s, out: [...lines, error("vtxtable", "PARSING FAILED", "Parse error")], effects: [] };
      const text = `vtxtable ${sub} ${values.join(" ")}`;
      const id = sub === "band" ? `vtxtable band ${values[0]} ` : `vtxtable ${sub} `;
      const extra = [...s.extra.filter((l) => !l.startsWith(id)), text];
      return { session: { ...s, extra }, out: [...lines, ok(text)], effects: [] };
    }
    case "diff":
    case "dump": {
      const names = Object.keys(emu.settings).filter((n) => command === "dump" || !same(s.values[n], emu.settings[n]));
      return {
        session: s,
        out: [
          ...lines,
          out(`# ${command}`),
          out("# version"),
          out(`# ${ctx.version}`),
          ...s.extra.map(out),
          out("# master"),
          ...names.map((n) => out(`set ${n} = ${s.values[n]}`)),
        ],
        effects: [],
      };
    }
    case "save": {
      const changed = (n: string) => !same(s.values[n], s.saved[n]);
      const effects = [...effectsFor(emu, s.values, changed), ...tailEffects(s.savedExtra, s.extra)];
      const session = { ...s, saved: { ...s.values }, savedExtra: [...s.extra], open: false };
      return { session, out: [...lines, out(inav ? "Saving" : "# saving"), out("Rebooting")], effects };
    }
    case "exit": {
      const session = { ...s, values: { ...s.saved }, extra: [...s.savedExtra] };
      return reboot(session, inav ? "Leaving CLI mode, unsaved changes lost" : "# leaving CLI mode, unsaved changes lost");
    }
    case "defaults": {
      const changed = (n: string) => !same(emu.settings[n], s.saved[n]);
      const effects = [...effectsFor(emu, emu.settings, changed), ...tailEffects(s.savedExtra, [])];
      const session = { ...createCliSession(emu), open: false };
      const result = reboot(session, inav ? "Resetting to defaults" : "# resetting to defaults");
      return { ...result, effects };
    }
    default:
      return { session: s, out: [...lines, err("Unknown command, try 'help'")], effects: [] };
  }
}

function mixerOf(s: CliSession): string | null {
  const line = s.extra.find((l) => l.startsWith("mixer "));
  return line ? line.slice(6) : null;
}

function fmtParam(name: string, value: CliValue): string {
  const v = typeof value === "number" ? value.toFixed(6) : value;
  return `${name.padEnd(16)} ${v}`;
}

function globToRegExp(glob: string): RegExp {
  const body = glob
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");
  return new RegExp(`^${body}$`, "i");
}

function mavproxy(emu: CliEmulator, ctx: CliContext, s: CliSession, line: string, echo: CliLine): CliResult {
  const [word, sub = "", ...rest] = line.split(/\s+/);
  const command = word.toLowerCase();
  const lines: CliLine[] = [echo];
  if (!allowed(emu, command) && command !== "help") {
    return { session: s, out: [...lines, err(`Unknown command '${word}'`)], effects: [] };
  }
  switch (command) {
    case "help": {
      const names = [...new Set([...emu.commands, "help"])].sort();
      return {
        session: s,
        out: [...lines, ...names.map((n) => out(MAV_HELP[n] ? `${n.padEnd(10)}: ${MAV_HELP[n]}` : n))],
        effects: [],
      };
    }
    case "status":
      return {
        session: s,
        out: [
          ...lines,
          out(`${ctx.version}`),
          // before any mode command the craft is in mode 0, the first of its modes (MANUAL on Plane, STABILIZE on Copter)
          out(`Mode ${s.mode ?? emu.limits.mode?.values?.[0] ?? "STABILIZE"}`),
          out(ctx.plugged ? "Battery present" : "Battery not present"),
        ],
        effects: [],
      };
    case "mode": {
      const want = sub.toUpperCase();
      const modes = emu.limits.mode?.values;
      if (!want || (modes && !modes.includes(want))) {
        return { session: s, out: [...lines, err(`Unknown mode ${sub}: ${(modes ?? []).join(" ")}`)], effects: [] };
      }
      return { session: { ...s, mode: want }, out: [...lines, ok(`Got COMMAND_ACK: DO_SET_MODE: ACCEPTED`)], effects: [] };
    }
    case "arm": {
      const reasons: string[] = [];
      if (!ctx.built) reasons.push("PreArm: Hardware safety switch");
      if (!ctx.accCal) reasons.push("PreArm: 3D Accel calibration needed");
      if (!ctx.plugged) reasons.push("PreArm: Battery 1 below minimum arming voltage");
      if (reasons.length)
        return {
          session: s,
          out: [...lines, ...reasons.map(err), err("Got COMMAND_ACK: COMPONENT_ARM_DISARM: FAILED")],
          effects: [],
        };
      return { session: s, out: [...lines, ok("Got COMMAND_ACK: COMPONENT_ARM_DISARM: ACCEPTED"), out("ARMED")], effects: [] };
    }
    case "disarm":
      return { session: s, out: [...lines, ok("Got COMMAND_ACK: COMPONENT_ARM_DISARM: ACCEPTED"), out("DISARMED")], effects: [] };
    case "param": {
      const action = sub.toLowerCase();
      if (action === "show") {
        const re = globToRegExp((rest[0] ?? "*").toUpperCase());
        const names = Object.keys(emu.settings).filter((n) => re.test(n));
        if (names.length === 0)
          return { session: s, out: [...lines, err(`Unable to find parameter '${rest[0] ?? ""}'`)], effects: [] };
        return { session: s, out: [...lines, ...names.map((n) => out(fmtParam(n, s.values[n])))], effects: [] };
      }
      if (action === "set") {
        const [typed = "", raw = ""] = rest;
        const name = settingName(emu, typed);
        if (!name) return { session: s, out: [...lines, err(`Unable to find parameter '${typed}'`)], effects: [] };
        const parsed = parseValue(emu, name, raw);
        if (!parsed.ok) {
          const limit = emu.limits[name];
          const range = limit?.values ? limit.values.join(", ") : `${limit?.min ?? ""} to ${limit?.max ?? ""}`;
          return { session: s, out: [...lines, err(`${name}: ${raw || "(no value)"} is out of range (${range})`)], effects: [] };
        }
        // ArduPilot stores a parameter as soon as it accepts it: there is no separate save.
        const values = { ...s.values, [name]: parsed.value };
        const effects = effectsFor(emu, values, (n) => n === name && !same(parsed.value, s.saved[n]));
        return {
          session: { ...s, values, saved: { ...s.saved, [name]: parsed.value } },
          out: [...lines, ok(fmtParam(name, parsed.value))],
          effects,
        };
      }
      if (action === "diff") {
        const names = Object.keys(emu.settings).filter((n) => !same(s.values[n], emu.settings[n]));
        return { session: s, out: [...lines, ...names.map((n) => out(fmtParam(n, s.values[n])))], effects: [] };
      }
      if (action === "fetch") {
        return { session: s, out: [...lines, out(`Received ${Object.keys(emu.settings).length} parameters`)], effects: [] };
      }
      return { session: s, out: [...lines, err("usage: param <fetch|set|show|diff>")], effects: [] };
    }
    default:
      return { session: s, out: [...lines, err(`Unknown command '${word}'`)], effects: [] };
  }
}

const PY_SET = /^cf\.param\.set_value\(\s*(['"])([\w.]+)\1\s*,\s*(?:(['"])(.*?)\3|(-?\d+(?:\.\d+)?))\s*\)$/;
const PY_GET = /^(print\()?cf\.param\.get_value\(\s*(['"])([\w.]+)\2\s*\)(\))?$/;

function cflib(emu: CliEmulator, s: CliSession, line: string, echo: CliLine): CliResult {
  const lines: CliLine[] = [echo];
  const set = PY_SET.exec(line);
  if (set) {
    const typed = set[2];
    const name = settingName(emu, typed);
    if (!name) return { session: s, out: [...lines, err(`KeyError: '${typed} not in param TOC'`)], effects: [] };
    if (emu.readOnly?.includes(name))
      return { session: s, out: [...lines, err(`AttributeError: ${name} is read-only!`)], effects: [] };
    const raw = set[4] ?? set[5] ?? "";
    const parsed = parseValue(emu, name, raw);
    if (!parsed.ok) {
      const limit = emu.limits[name];
      const range = limit?.values ? limit.values.join(", ") : `${limit?.min ?? ""}..${limit?.max ?? ""}`;
      return { session: s, out: [...lines, err(`ValueError: ${raw} is not a valid value for ${name} (${range})`)], effects: [] };
    }
    const values = { ...s.values, [name]: parsed.value };
    const effects = effectsFor(emu, values, (n) => n === name && !same(parsed.value, s.saved[n]));
    return { session: { ...s, values, saved: { ...s.saved, [name]: parsed.value } }, out: lines, effects };
  }
  const get = PY_GET.exec(line);
  if (get && Boolean(get[1]) === Boolean(get[4])) {
    const typed = get[3];
    const name = settingName(emu, typed);
    if (!name) return { session: s, out: [...lines, err(`KeyError: '${typed} not in param TOC'`)], effects: [] };
    const value = String(s.values[name]);
    return { session: s, out: [...lines, out(get[1] ? value : `'${value}'`)], effects: [] };
  }
  if (line === "help()" || line === "help") {
    return {
      session: s,
      out: [...lines, out("cf.param.get_value('group.name')"), out("cf.param.set_value('group.name', 'value')")],
      effects: [],
    };
  }
  const ident = /^[A-Za-z_]\w*/.exec(line)?.[0];
  if (ident && ident !== "cf")
    return { session: s, out: [...lines, err(`NameError: name '${ident}' is not defined`)], effects: [] };
  return { session: s, out: [...lines, err("SyntaxError: invalid syntax")], effects: [] };
}
