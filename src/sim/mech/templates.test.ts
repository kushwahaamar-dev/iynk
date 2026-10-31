// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createRun } from "../../lib/interp/run.ts";
import { builtinRegistry } from "../../parts/builtin.ts";
import { validateRoboticsRefs } from "../../project/apply/domain-robotics.ts";
import type { Project } from "../../project/generated/types.ts";
import { validateValue } from "../../project/validate.ts";
import { isCauseId } from "../faults/cause-ids.ts";
import { runChecks } from "./checker.ts";
import type { ComponentDescriptor } from "./ports.ts";
import { validateRobot } from "./validate.ts";

const registry = builtinRegistry();
const describePart = (ref: string): ComponentDescriptor | undefined => registry.latest(ref);

export function loadTemplate(name: string): Project {
  return JSON.parse(readFileSync(`content/projects/robots/${name}.project.json`, "utf8")) as Project;
}

describe("line follower template", () => {
  const doc = loadTemplate("line-follower");

  it("passes the schema and the robotics cross-references", () => {
    const report = validateValue(doc);
    expect(report.diagnostics.filter((d) => d.severity === "error")).toEqual([]);
    expect(validateRoboticsRefs(doc)).toEqual([]);
  });

  it("has no robot validator error", () => {
    const errors = validateRobot(doc, { describe: describePart, dmath: Math }).filter((p) => p.severity === "error");
    expect(errors).toEqual([]);
  });

  it("has five faults with registry cause ids, all off", () => {
    const faults = doc.simulation.faults ?? [];
    expect(faults.map((f) => f.id).sort()).toEqual(["flt_brownout", "flt_motor_swap", "flt_sensor_high", "flt_sensor_sat", "flt_wheel_slip"]);
    for (const fault of faults) {
      expect(isCauseId(fault.cause_id), fault.cause_id).toBe(true);
      expect(fault.enabled).toBe(false);
    }
    expect(faults.find((f) => f.id === "flt_sensor_high")?.params).toEqual({ height_mm: 30 });
  });

  it("passes the robot checks", () => {
    const checks = runChecks({ doc, describe: describePart, slopeDeg: 0, supplyV: 7.4 });
    expect(checks.filter((c) => c.result === "fail")).toEqual([]);
  });

  it("names the heartbeat pin and the loop period the loop-timing view reads", () => {
    expect((doc.ext as Record<string, unknown>)["x-iynk-robot"]).toEqual({ loopPeriodUs: 10000, loopPin: "D13" });
  });

  it("compiles in the interpreter without a diagnostic", () => {
    const source = doc.sources.find((s) => s.role === "firmware")!.content;
    const run = createRun({ board: "uno-r3", source });
    expect(run.diagnostics).toEqual([]);
  });
});
