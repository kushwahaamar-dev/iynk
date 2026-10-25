// @vitest-environment node
import { describe, expect, test } from "vitest";
import type { CliEmulator } from "@/content/schema";
import { quad5Fixture } from "./__fixtures__/quad5";
import { createCliSession, runCli, unsavedCount, type CliContext, type CliSession } from "./cli";

const bf = quad5Fixture.firmware.emulator;
const ctx: CliContext = { version: "Betaflight 2026.6.2", plugged: false, cells: 6, accCal: false, built: false };

function run(lines: string[], emu: CliEmulator = bf, context = ctx) {
  let session: CliSession = createCliSession(emu);
  const out: string[] = [];
  const effects: Record<string, unknown>[] = [];
  for (const line of lines) {
    const r = runCli(emu, context, session, line);
    session = r.session;
    out.push(...r.out.map((l) => l.text));
    effects.push(...r.effects);
  }
  return { session, out, effects };
}

describe("Betaflight CLI", () => {
  test("set prints the firmware's confirmation and get shows range and default", () => {
    const { out, session } = run(["set motor_poles = 12", "get motor_poles"]);
    expect(out).toContain("motor_poles set to 12");
    expect(out).toContain("motor_poles = 12");
    expect(out).toContain("Allowed range: 4 - 255");
    expect(out).toContain("Default value: 14");
    expect(session.values.motor_poles).toBe(12);
  });

  test("names and lookup values ignore case; lookups come back in the table's spelling", () => {
    const { out, session } = run(["SET Motor_PWM_Protocol=dshot300"]);
    expect(out).toContain("motor_pwm_protocol set to DSHOT300");
    expect(session.values.motor_pwm_protocol).toBe("DSHOT300");
  });

  test("an unknown setting is refused with the real error, e.g. the removed p_level", () => {
    const { out } = run(["set p_level = 50"]);
    expect(out).toContain("###ERROR IN set: INVALID NAME: p_level###");
  });

  test("out-of-range and unknown lookup values are refused and the limits are listed", () => {
    const range = run(["set motor_poles = 2"]).out;
    expect(range).toContain("###ERROR IN set: INVALID VALUE###");
    expect(range).toContain("Allowed range: 4 - 255");
    const lookup = run(["set dshot_bidir = maybe"]).out;
    expect(lookup).toContain("Allowed values: OFF, ON");
    expect(run(["set motor_poles = 12abc"]).out).toContain("###ERROR IN set: INVALID VALUE###");
  });

  test("free-text values such as arrays are kept as typed", () => {
    const { session } = run(["set rpm_filter_weights = 100,80,60"]);
    expect(session.values.rpm_filter_weights).toBe("100,80,60");
  });

  test("get with part of a name lists every match; no match is an error", () => {
    const { out } = run(["get angle"]);
    expect(out).toContain("angle_p_gain = 50");
    expect(out).toContain("angle_limit = 60");
    expect(run(["get nosuch"]).out).toContain("###ERROR IN get: INVALID NAME: nosuch###");
  });

  test("unknown commands point at help", () => {
    expect(run(["arm"]).out).toContain("Unknown command, try 'help'");
  });

  test("diff lists only what differs from the defaults", () => {
    const { out } = run(["set motor_poles = 12", "mixer QUADX", "diff"]);
    expect(out).toContain("set motor_poles = 12");
    expect(out).toContain("mixer QUADX");
    expect(out).not.toContain("set angle_limit = 60");
    expect(out).toContain("# Betaflight 2026.6.2");
  });

  test("save stores, reboots and applies the effects of changed settings", () => {
    const r = run(["set align_board_yaw = 180", "save"]);
    expect(r.out).toContain("# saving");
    expect(r.out).toContain("Rebooting");
    expect(r.effects).toEqual([{ boardYaw: 180 }]);
    expect(r.session.saved.align_board_yaw).toBe(180);
    expect(r.session.open).toBe(false);
    expect(unsavedCount(r.session)).toBe(0);
  });

  test("the next command after a reboot re-enters the CLI", () => {
    const { out } = run(["save", "version"]);
    expect(out.filter((l) => l.startsWith("Entering CLI Mode"))).toHaveLength(1);
    expect(out).toContain("# Betaflight 2026.6.2");
  });

  test("exit throws away unsaved changes", () => {
    const r = run(["set motor_poles = 12", "exit"]);
    expect(r.out).toContain("# leaving CLI mode, unsaved changes lost");
    expect(r.session.values.motor_poles).toBe(14);
    expect(r.effects).toEqual([]);
  });

  test("unsaved changes are counted until save", () => {
    const r = run(["set motor_poles = 12", "set angle_limit = 55"]);
    expect(unsavedCount(r.session)).toBe(2);
  });

  test("status lists the arming-disable flags the bench causes, in bit order", () => {
    expect(run(["status"]).out).toContain("Arming disable flags: RXLOSS CLI NO_ACC_CAL");
    const calibrated = run(["status"], bf, { ...ctx, accCal: true, plugged: true }).out;
    expect(calibrated).toContain("Arming disable flags: RXLOSS CLI");
    expect(calibrated).toContain("Voltage: 2520 * 0.01V (6S battery - OK)");
  });

  test("aux takes numeric permanent mode IDs; names fail to parse", () => {
    expect(run(["aux 1 ANGLE 0 1300 2100 0"]).out).toContain("###ERROR IN aux: PARSING FAILED###");
    const good = run(["aux 1 1 1 1300 2100 0 0"]);
    expect(good.out).toContain("aux 1 1 1 1300 2100 0 0");
    expect(good.session.extra).toEqual(["aux 1 1 1 1300 2100 0 0"]);
  });

  test("serial accepts port names and the legacy numbers", () => {
    expect(run(["serial 1 64 115200 57600 0 115200"]).session.extra).toEqual(["serial UART2 64 115200 57600 0 115200"]);
    expect(run(["serial UART2 64 115200"]).out).toContain("###ERROR IN serial: PARSING FAILED###");
  });

  test("feature, beeper, resource and vtxtable lines are validated and kept for diff", () => {
    const emu: CliEmulator = { ...bf, commands: [...bf.commands, "feature", "beeper", "resource", "vtxtable"] };
    const r = run(
      [
        "feature -AIRMODE",
        "feature WARP_DRIVE",
        "beeper -GYRO_CALIBRATED",
        "resource MOTOR 1 b6",
        "resource MOTOR 1",
        "vtxtable bands 5",
        "vtxtable band 5 RACEBAND R FACTORY 5658 5695",
        "diff",
      ],
      emu,
    );
    expect(r.out).toContain("Disabled AIRMODE");
    expect(r.out).toContain("###ERROR IN feature: INVALID NAME###");
    expect(r.out).toContain("Resource MOTOR 1 set to B06");
    expect(r.out).toContain("###ERROR IN resource: PARSING FAILED###");
    expect(r.session.extra).toEqual([
      "feature -AIRMODE",
      "beeper -GYRO_CALIBRATED",
      "resource MOTOR 1 B06",
      "vtxtable bands 5",
      "vtxtable band 5 RACEBAND R FACTORY 5658 5695",
    ]);
  });

  test("comment lines are ignored", () => {
    expect(run(["# arrow on the FC facing the nose"]).out).toEqual(["# # arrow on the FC facing the nose"]);
  });

  test("defaults resets every setting and reboots", () => {
    const r = run(["set motor_poles = 12", "save", "defaults"]);
    expect(r.session.values.motor_poles).toBe(14);
    expect(r.out).toContain("# resetting to defaults");
  });

  test("the same input always gives the same output", () => {
    const lines = ["set motor_poles = 12", "diff", "save", "status"];
    expect(run(lines)).toEqual(run(lines));
  });
});

describe("Betaflight servo and smix (a tricopter's tail)", () => {
  const tri: CliEmulator = { ...bf, commands: [...bf.commands, "servo", "smix"] };

  test("are offered only to a craft that lists them, and help describes them", () => {
    expect(run(["servo"]).out).toContain("Unknown command, try 'help'");
    expect(run(["smix reverse 5 2 r"]).out).toContain("Unknown command, try 'help'");
    const help = run(["help"], tri).out;
    expect(help).toContain("servo - configure servos");
    expect(help).toContain("smix - servo mixer");
  });

  test("servo lists all eight servos, at the firmware's defaults until one is set", () => {
    const out = run(["servo"], tri).out.slice(1);
    expect(out).toHaveLength(8);
    expect(out[0]).toBe("servo 0 1000 2000 1500 100 -1");
    expect(out[5]).toBe("servo 5 1000 2000 1500 100 -1");
  });

  test("servo stores six whole numbers within the limits, the last line for a servo winning", () => {
    const r = run(["servo 5 1000 2000 1520 100 -1", "servo 5 1100 1950 1520 100 -1", "servo"], tri);
    expect(r.out).toContain("servo 5 1100 1950 1520 100 -1");
    expect(r.session.extra).toEqual(["servo 5 1100 1950 1520 100 -1"]);
    expect(r.out.filter((l) => l.startsWith("servo 5 "))).toEqual([
      "servo 5 1000 2000 1520 100 -1",
      "servo 5 1100 1950 1520 100 -1",
      "servo 5 1100 1950 1520 100 -1",
    ]);
  });

  test("servo refuses bad lines with the firmware's own errors and keeps what it had", () => {
    const refused = (line: string) => {
      const r = run([line], tri);
      expect(r.session.extra, line).toEqual([]);
      return r.out.at(-1);
    };
    expect(refused("servo 5 1000 2000 1500 100")).toBe("###ERROR IN servo: INVALID ARGUMENT COUNT###");
    expect(refused("servo 5 1000 2000 1500 100 -1 0")).toBe("###ERROR IN servo: INVALID ARGUMENT COUNT###");
    expect(refused("servo 8 1000 2000 1500 100 -1")).toBe("###ERROR IN servo: INVALID ARGUMENT COUNT###");
    expect(refused("servo 5 1000 2000 mid 100 -1")).toBe("###ERROR IN servo: PARSING FAILED###");
    for (const line of [
      "servo 5 400 2000 1500 100 -1",
      "servo 5 1000 2600 1500 100 -1",
      "servo 5 1000 2000 2100 100 -1",
      "servo 5 1600 1400 1500 100 -1",
      "servo 5 1000 2000 1500 101 -1",
      "servo 5 1000 2000 1500 100 18",
    ]) {
      expect(refused(line)).toBe("###ERROR IN servo: ARGUMENT OUT OF RANGE###");
    }
  });

  test("smix reverse sets and clears a source's reversal and lists the reversed ones", () => {
    const on = run(["smix reverse 5 2 r", "smix reverse 0 0 r", "smix reverse"], tri);
    expect(on.session.extra).toEqual(["smix reverse 5 2 r", "smix reverse 0 0 r"]);
    expect(on.out.slice(-2)).toEqual(["smix reverse 0 0 r", "smix reverse 5 2 r"]);
    expect(run(["smix reverse 5 2 r", "smix reverse 5 2 n"], tri).session.extra).toEqual([]);
    expect(run(["smix reverse 5 2 r", "smix reset"], tri).session.extra).toEqual([]);
    expect(run(["smix reverse 5 2 r", "servo"], tri).out.at(-1)).toBe("smix reverse 5 2 r");
  });

  test("smix refuses what the firmware refuses", () => {
    expect(run(["smix reverse 5 2"], tri).out.at(-1)).toBe("###ERROR IN smix: INVALID ARGUMENT COUNT###");
    expect(run(["smix reverse 8 2 r"], tri).out.at(-1)).toBe("###ERROR IN smix: servo NOT BETWEEN 0 AND 8###");
    expect(run(["smix reverse 5 14 r"], tri).out.at(-1)).toBe("###ERROR IN smix: servo NOT BETWEEN 0 AND 8###");
    expect(run(["smix reverse 5 2 x"], tri).out.at(-1)).toBe("###ERROR IN smix: servo NOT BETWEEN 0 AND 8###");
    expect(run(["smix load TRI"], tri).out.at(-1)).toBe("###ERROR IN smix: PARSING FAILED###");
  });

  test("saving a reversed tail tells the range; a negative rate reverses too, and the two cancel", () => {
    expect(run(["smix reverse 5 2 r", "save"], tri).effects).toEqual([{ tailReverse: true }]);
    expect(run(["servo 5 1000 2000 1500 -100 -1", "save"], tri).effects).toEqual([{ tailReverse: true }]);
    expect(run(["smix reverse 5 2 r", "servo 5 1000 2000 1500 -100 -1", "save"], tri).effects).toEqual([]);
    // another servo, or the tail's other inputs, leave the tail as it is
    expect(run(["smix reverse 4 2 r", "smix reverse 5 1 r", "save"], tri).effects).toEqual([]);
    expect(run(["smix reverse 5 2 r", "save", "smix reverse 5 2 n", "save"], tri).effects).toEqual([
      { tailReverse: true },
      { tailReverse: false },
    ]);
    expect(run(["smix reverse 5 2 r", "save", "defaults"], tri).effects).toEqual([{ tailReverse: true }, { tailReverse: false }]);
    // unsaved, it changes nothing
    expect(run(["smix reverse 5 2 r", "exit"], tri).effects).toEqual([]);
  });
});

describe("INAV CLI", () => {
  const inav: CliEmulator = { ...bf, kind: "inav-cli" };
  test("uses INAV's error wording", () => {
    expect(run(["set nosuch = 1"], inav).out).toContain("ERROR: Invalid name: nosuch");
    expect(run(["set motor_poles = 1"], inav).out).toContain("ERROR: Invalid value");
  });
});

describe("MAVProxy", () => {
  const mav: CliEmulator = {
    kind: "mavproxy",
    prompt: "STABILIZE> ",
    settings: { ARMING_CHECK: 1, RTL_ALT: 1500, FRAME_CLASS: 1, mode: "STABILIZE" },
    limits: { RTL_ALT: { min: 200, max: 300000 }, mode: { values: ["STABILIZE", "ALT_HOLD", "LOITER", "RTL", "AUTO", "LAND"] } },
    commands: ["help", "param", "mode", "arm", "disarm", "status"],
    effects: [{ setting: "RTL_ALT", equals: 3000, set: { rtlAlt: 30 } }],
  };

  test("param set applies at once and param show prints the value", () => {
    const r = run(["param set RTL_ALT 3000", "param show RTL_*"], mav);
    expect(r.out).toContain("RTL_ALT          3000.000000");
    expect(r.effects).toEqual([{ rtlAlt: 30 }]);
  });

  test("unknown parameters and bad values are refused", () => {
    expect(run(["param set RTL_ALTITUDE 30"], mav).out).toContain("Unable to find parameter 'RTL_ALTITUDE'");
    expect(run(["param set RTL_ALT 50"], mav).out.some((l) => l.includes("out of range"))).toBe(true);
  });

  test("arming lists the pre-arm failures", () => {
    const out = run(["arm throttle"], mav).out;
    expect(out).toContain("PreArm: 3D Accel calibration needed");
    expect(out).toContain("Got COMMAND_ACK: COMPONENT_ARM_DISARM: FAILED");
  });
});

describe("cflib", () => {
  const py: CliEmulator = {
    kind: "cflib-python",
    prompt: ">>> ",
    settings: { "stabilizer.estimator": 2, "stabilizer.controller": 1 },
    limits: { "stabilizer.estimator": { min: 0, max: 3 } },
    commands: [],
    effects: [{ setting: "stabilizer.estimator", equals: 1, set: { estimator: "complementary" } }],
  };

  test("set_value and get_value work on the parameter TOC", () => {
    const r = run(["cf.param.set_value('stabilizer.estimator', '1')", "cf.param.get_value('stabilizer.estimator')"], py);
    expect(r.out).toContain("'1'");
    expect(r.effects).toEqual([{ estimator: "complementary" }]);
  });

  test("a read-only parameter raises AttributeError for any value, and get_value still reads it", () => {
    const ro: CliEmulator = { ...py, settings: { ...py.settings, "deck.bcFlow2": 1 }, readOnly: ["deck.bcFlow2"] };
    for (const value of ["0", "1"]) {
      const r = run([`cf.param.set_value('deck.bcFlow2', ${value})`], ro);
      expect(r.out).toContain("AttributeError: deck.bcFlow2 is read-only!");
      expect(r.session.values["deck.bcFlow2"]).toBe(1);
    }
    expect(run(["print(cf.param.get_value('deck.bcFlow2'))"], ro).out).toContain("1");
  });

  test("a name outside the TOC raises KeyError", () => {
    expect(run(["cf.param.set_value('stabilizer.nope', '1')"], py).out).toContain("KeyError: 'stabilizer.nope not in param TOC'");
    expect(run(["foo()"], py).out).toContain("NameError: name 'foo' is not defined");
  });
});
