import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import messages from "@/i18n/messages/en/faults.json";
import { builtinRegistry } from "@/parts/builtin";
import type { Op, Project } from "@/project/generated/types";
import { stateHash } from "@/project/hash";
import { sampleBlinkD12 } from "@/project/samples";
import { createSession } from "@/project/session";
import { seededRandom, steppingClock, USER } from "@/project/session.testing";
import { validateValue } from "@/project/validate";
import { buildNetView } from "@/sim/faults/netlist-view";
import type { NetView } from "@/sim/faults/types";
import { buildSimNetlist } from "@/sim/netlist";
import { BreakIt, type BreakItProps } from "./BreakIt";

const registry = builtinRegistry();
let start: Project;
let view: NetView;
let sources: Record<string, string>;

beforeAll(() => {
  const report = validateValue(sampleBlinkD12());
  if (!report.ok || !report.doc) throw new Error("the sample does not validate");
  start = report.doc;
  const { net } = buildSimNetlist(start, registry);
  view = buildNetView(net, (id) => {
    const [ref = "", version = ""] = id.split("@");
    return registry.get(ref, version);
  });
  sources = Object.fromEntries(start.sources.map((s) => [s.path, s.content]));
});

function rig(props: Partial<BreakItProps> = {}) {
  const session = createSession({ state: start, clock: steppingClock(), rnd: seededRandom() });
  const log = { append: vi.fn().mockResolvedValue(undefined) };
  const restartRun = vi.fn();
  function Harness() {
    const [doc, setDoc] = useState(session.state);
    const commit = (ops: Op[]) => {
      const done = session.apply(ops, USER);
      if (done.ok) setDoc(session.state);
      return done.ok;
    };
    return <BreakIt doc={doc} view={view} sources={sources} commit={commit} restartRun={restartRun} messages={messages} lang="en" log={log} {...props} />;
  }
  render(<Harness />);
  return { session, log, restartRun };
}

const rowFor = (cause: string) => screen.getAllByText(messages.cause[cause as "wrong-value"].title)[0]!.closest("li")!;

describe("BreakIt", () => {
  it("lists candidates under a heading for their family", () => {
    rig();
    expect(screen.getByRole("heading", { name: messages.breakIt.family.code })).toBeTruthy();
    expect(rowFor("wrong-pin-in-code")).toBeTruthy();
  });

  it("breaks, restarts the run, and enables Restore, which returns the original hash", () => {
    const { session, restartRun } = rig();
    const before = stateHash(session.state);
    const restore = screen.getByRole("button", { name: messages.breakIt.restore }) as HTMLButtonElement;
    expect(restore.disabled).toBe(true);

    fireEvent.click(within(rowFor("wrong-pin-in-code")).getByRole("button", { name: new RegExp(`^${messages.breakIt.apply}`) }));
    expect(restartRun).toHaveBeenCalledTimes(1);
    expect(screen.getByText(messages.breakIt.restarted)).toBeTruthy();
    expect(restore.disabled).toBe(false);
    expect(stateHash(session.state)).not.toBe(before);

    fireEvent.click(restore);
    expect(stateHash(session.state)).toBe(before);
    expect(restore.disabled).toBe(true);
    expect(restartRun).toHaveBeenCalledTimes(2);
  });

  it("says the fault is stored when no simulator is attached", () => {
    rig({ restartRun: undefined });
    fireEvent.click(within(rowFor("wrong-pin-in-code")).getByRole("button", { name: new RegExp(`^${messages.breakIt.apply}`) }));
    expect(screen.getByText(messages.breakIt.applied)).toBeTruthy();
  });

  it("explains the cause and writes one record to the log", () => {
    const { log } = rig();
    fireEvent.click(within(rowFor("wrong-pin-in-code")).getByRole("button", { name: new RegExp(`^${messages.breakIt.apply}`) }));
    fireEvent.click(screen.getByRole("button", { name: messages.breakIt.explain }));
    const box = screen.getByTestId("break-it-explain");
    expect(within(box).getByText(messages.cause["wrong-pin-in-code"].title)).toBeTruthy();
    expect(box.textContent).toContain(messages.cause["wrong-pin-in-code"].why);
    expect(log.append).toHaveBeenCalledTimes(1);
    expect(log.append.mock.calls[0]![0]).toBe("diagnosis.record");
    expect(log.append.mock.calls[0]![1]).toMatchObject({ outcome: "revealed", diagnosis: { cause_id: "wrong-pin-in-code" } });
  });

  it("shows the seed Surprise me used", () => {
    const { session } = rig({ drawSeed: () => 48213 });
    const stored = session.state.simulation.faults.length;
    fireEvent.click(screen.getByRole("button", { name: messages.breakIt.surprise }));
    expect(screen.getByText("Seed 48,213. Replay with this number.")).toBeTruthy();
    expect(session.state.simulation.faults).toHaveLength(stored + 1);
  });

  it("turns a stored fault on and off", () => {
    const { session } = rig();
    fireEvent.click(within(rowFor("wrong-pin-in-code")).getByRole("button", { name: new RegExp(`^${messages.breakIt.apply}`) }));
    const list = screen.getByRole("heading", { name: messages.breakIt.inProject }).parentElement!;
    const made = () => session.state.simulation.faults.find((f) => f.cause_id === "wrong-pin-in-code")!;
    const row = () => within(within(list).getAllByRole("listitem").find((li) => li.textContent?.includes(messages.cause["wrong-pin-in-code"].title))!);
    fireEvent.click(row().getByRole("button", { name: new RegExp(`^${messages.breakIt.turnOff}`) }));
    expect(made().enabled).toBe(false);
    fireEvent.click(row().getByRole("button", { name: new RegExp(`^${messages.breakIt.turnOn}`) }));
    expect(made().enabled).toBe(true);
  });

  it("downloads one sealed copy for a buddy", () => {
    const onDownload = vi.fn();
    const { session } = rig({ onDownload });
    const before = stateHash(session.state);
    fireEvent.click(within(rowFor("wrong-pin-in-code")).getByRole("button", { name: new RegExp(`^${messages.breakIt.forBuddy}`) }));
    expect(onDownload).toHaveBeenCalledTimes(1);
    expect(onDownload.mock.calls[0]![0].filename).toMatch(/\.iynk$/);
    expect(stateHash(session.state)).toBe(before);
  });

  it("hides a sealed fault's cause in the stored list", () => {
    const sealedStart = start;
    const sealed = {
      ...sealedStart,
      ext: { "x-iynk-guided": { diagnose: { kind: "injected", symptom: { id: "led-dark", text: "dark" }, answer: { cause_id: "wrong-pin-in-code", fault: "flt_x" }, options: ["wrong-pin-in-code", "open-connection", "wrong-value", "missing-ground"].map((cause_id) => ({ cause_id, label: cause_id })), explanation: "why", review: { status: "model-only", source: "own-reasoning" } } } },
      simulation: { ...sealedStart.simulation, faults: [{ id: "flt_x", cause_id: "wrong-pin-in-code", symptom_ids: [], kind: "missing-part", target: { component: "x" }, enabled: true }] },
    } as unknown as Project;
    const session = createSession({ state: sealed, clock: steppingClock(), rnd: seededRandom() });
    render(<BreakIt doc={session.state} view={view} sources={sources} commit={() => true} messages={messages} lang="en" />);
    const list = screen.getByRole("heading", { name: messages.breakIt.inProject }).parentElement!;
    expect(within(list).getByText(messages.breakIt.hidden)).toBeTruthy();
    expect(list.textContent).not.toContain(messages.cause["wrong-pin-in-code"].title);
    act(() => {});
  });
});
