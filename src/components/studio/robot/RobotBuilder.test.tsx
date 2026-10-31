import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import messages from "@/i18n/messages/en/robot.json";
import type { Descriptor } from "@/parts/descriptor";
import type { Project } from "@/project/generated/types";
import { createSession } from "@/project/session";
import { seededRandom, steppingClock } from "@/project/session.testing";
import { validateRobot } from "@/sim/mech/validate";
import { createDocStore } from "@/studio/stores/doc";
import { RobotBuilder } from "./RobotBuilder";

const FIXTURE = "docs/MASTER_PLAN/04_ARCHITECTURE/schemas/examples/robot-line-follower.project.json";

const describePart = (id: string): Descriptor | undefined => {
  try {
    return JSON.parse(readFileSync(`src/parts/data/${id.replace("core.", "")}.component.json`, "utf8")) as Descriptor;
  } catch {
    return undefined;
  }
};

function emptyRobot(): Project {
  const doc = JSON.parse(readFileSync(FIXTURE, "utf8")) as Project;
  delete doc.mechanical;
  doc.components = [];
  doc.nets = [];
  doc.dependencies.components = [];
  doc.views = [];
  doc.simulation.faults = [];
  doc.simulation.instruments = [];
  const data = doc.domains!.robotics!.data;
  data.sensors = [];
  data.bodies = {};
  data.joints = {};
  data.wheels = {};
  return doc;
}

function mount(problems = [] as Parameters<typeof RobotBuilder>[0]["problems"]) {
  const doc = createDocStore(createSession({ state: emptyRobot(), clock: steppingClock(), rnd: seededRandom() }));
  render(<RobotBuilder doc={doc} describe={describePart} problems={problems} unit={{ length: "mm", mass: "g" }} messages={messages} lang="en" />);
  return doc;
}

afterEach(cleanup);

const key = (name: string) => fireEvent.keyDown(screen.getByRole("listbox"), { key: name });

describe("RobotBuilder", () => {
  it("adds a drive base and a line sensor from the list by keyboard alone", () => {
    const doc = mount();
    key("Enter");
    key("ArrowDown");
    key("Enter");
    key("ArrowDown");
    key("Enter");
    for (let i = 0; i < 3; i++) key("ArrowDown");
    key("Enter");
    key("ArrowDown");
    key("ArrowDown");
    key("Enter");
    const state = doc.getState().state;
    expect(state.mechanical!.joints.filter((j) => j.kind === "wheel")).toHaveLength(2);
    expect(state.domains!.robotics!.data.sensors).toHaveLength(1);
    const errors = validateRobot(state, { describe: describePart, dmath: Math }).filter((p) => p.severity === "error");
    expect(errors).toEqual([]);
  });

  it("says why a wheel pair cannot come before a chassis", () => {
    mount();
    key("ArrowDown");
    key("Enter");
    expect(screen.getByRole("status").textContent).toBe(messages.builder.errors["no-chassis"]);
  });

  it("undoes a recipe as one step", () => {
    const doc = mount();
    key("Enter");
    expect(doc.getState().state.mechanical?.bodies).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(doc.getState().state.mechanical).toBeUndefined();
  });

  it("changes the displayed value with the unit but stores the same grams", () => {
    const doc = mount();
    key("Enter");
    const mass = () => (screen.getByLabelText(/^Mass \(/) as HTMLInputElement);
    expect(mass().value).toBe("120");
    fireEvent.click(within(screen.getByRole("radiogroup", { name: messages.builder.unitMass })).getByRole("radio", { name: "oz" }));
    expect(Number(mass().value)).toBeCloseTo(4.23288, 4);
    expect(doc.getState().state.mechanical!.bodies[0]!.mass_g).toBe(120);
  });

  it("writes an edited value as SI and refuses a word", () => {
    const doc = mount();
    key("Enter");
    const field = screen.getByLabelText(/^Mass \(/) as HTMLInputElement;
    fireEvent.change(field, { target: { value: "abc" } });
    fireEvent.blur(field);
    expect(screen.getByText(messages.builder.errors.value)).toBeTruthy();
    fireEvent.change(field, { target: { value: "200" } });
    fireEvent.blur(field);
    expect(doc.getState().state.mechanical!.bodies[0]!.mass_g).toBe(200);
  });

  it("lists a constructed RB-E-THIN problem in words", () => {
    mount([{ code: "RB-E-THIN", severity: "error", path: "mechanical.bodies.0.shape", messageKey: "problems.RB-E-THIN", args: { body: "Plate", size_mm: 2, min_mm: 5 } }]);
    expect(screen.getByText("RB-E-THIN")).toBeTruthy();
    expect(screen.getByText(/Plate has a side of 2 mm/)).toBeTruthy();
  });
});
