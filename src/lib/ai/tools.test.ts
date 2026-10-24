import { describe, expect, test, vi } from "vitest";
import type { LabStore } from "@/components/dock/types";
import type { FigureHandle } from "@/components/figure/protocol";
import { runClientTool, type ToolContext } from "./run-tools";
import { parseToolCall, partnerTools, type ToolCall } from "./tools";

function call(name: string, args: unknown): ToolCall {
  const parsed = parseToolCall("c1", name, args);
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.call;
}

function fakeFigure() {
  const sent: Array<[string, unknown]> = [];
  const figure = { send: (type: string, payload: unknown) => sent.push([type, payload]) } as unknown as FigureHandle;
  return { figure, sent };
}

const store = (state: unknown): LabStore => ({ getState: () => state, subscribe: () => () => {}, dispatch: vi.fn() });

function context(over: Partial<ToolContext> = {}): ToolContext {
  return { lab: "board", store: store({ code: "void setup() {}\nvoid loop() {\n  digitalWrite(12, HIGH);\n}" }), figure: null, room: null, openTab: vi.fn(), ...over };
}

describe("partnerTools", () => {
  test("defines the six H4 tools with JSON-schema parameters and where they run", () => {
    expect(partnerTools.map((tool) => [tool.name, tool.runs])).toEqual([
      ["search_datasheet", "server"],
      ["find_parts", "server"],
      ["highlight_part", "client"],
      ["propose_change", "client"],
      ["ask_peer", "client"],
      ["open_panel", "client"],
    ]);
    for (const tool of partnerTools) {
      expect(tool.parameters.type).toBe("object");
      expect(tool.parameters).not.toHaveProperty("$schema");
      expect(tool.description.length).toBeGreaterThan(20);
    }
    const highlight = partnerTools.find((tool) => tool.name === "highlight_part")!;
    expect(highlight.parameters.required).toEqual(["partId"]);
    expect(Object.keys(highlight.parameters.properties)).toEqual(["partId", "note"]);
  });
});

describe("parseToolCall", () => {
  test("parses the JSON string the API streams", () => {
    expect(parseToolCall("c1", "highlight_part", '{"partId":"led1","note":"Long leg to D13"}')).toEqual({
      ok: true,
      call: { id: "c1", name: "highlight_part", args: { partId: "led1", note: "Long leg to D13" } },
    });
  });

  test("explains what is wrong, for the model to fix", () => {
    expect(parseToolCall("c1", "launch_rocket", {})).toEqual({ ok: false, error: 'unknown tool "launch_rocket"' });
    expect(parseToolCall("c1", "ask_peer", "{oops")).toEqual({ ok: false, error: "ask_peer: arguments are not valid JSON" });
    const missing = parseToolCall("c1", "open_panel", { tab: "settings" });
    expect(missing.ok).toBe(false);
    expect(!missing.ok && missing.error).toMatch(/^open_panel: .* at tab$/);
  });

  test("normalises propose_change per kind", () => {
    expect(call("propose_change", { kind: "code", reason: "Pin 13 drives the LED", patch: { find: "12", replace: "13" } }).args).toEqual({
      kind: "code",
      reason: "Pin 13 drives the LED",
      find: "12",
      replace: "13",
    });
    expect(call("propose_change", { kind: "wire", reason: "r", patch: { connect: [{ from: "uno.D13", to: "r1.a" }] } }).args).toEqual({
      kind: "wire",
      reason: "r",
      connect: [{ from: "uno.D13", to: "r1.a" }],
      disconnect: [],
    });
    expect(parseToolCall("c1", "propose_change", { kind: "wire", reason: "r", patch: {} })).toEqual({
      ok: false,
      error: "propose_change: a wire patch needs connect or disconnect",
    });
    expect(parseToolCall("c1", "propose_change", { kind: "code", reason: "r", patch: { find: "x" } })).toEqual({
      ok: false,
      error: "propose_change: a code patch needs replace",
    });
  });
});

describe("runClientTool", () => {
  test("highlight_part selects the part and flashes the note", () => {
    const { figure, sent } = fakeFigure();
    const outcome = runClientTool(call("highlight_part", { partId: "led1", note: "Flip me" }), context({ figure }));
    expect(outcome.result).toEqual({ ok: true });
    expect(outcome.card).toEqual({ kind: "highlight", partId: "led1", note: "Flip me", shown: true });
    expect(sent).toEqual([
      ["set", { state: { select: "led1" } }],
      ["flash", { text: "Flip me", ms: 4000 }],
    ]);
    const drone = fakeFigure();
    runClientTool(call("highlight_part", { partId: "motor2" }), context({ lab: "drone", figure: drone.figure }));
    expect(drone.sent[0]).toEqual(["set", { state: { sel: "motor2" } }]);
  });

  test("highlight_part without a figure tells the model and shows why", () => {
    const outcome = runClientTool(call("highlight_part", { partId: "led1" }), context());
    expect(outcome.result).toEqual({ ok: false, error: "the 3D figure is not loaded yet" });
    expect(outcome.card).toMatchObject({ kind: "highlight", shown: false });
  });

  test("propose_change builds the before/after diff from the bench", () => {
    const outcome = runClientTool(
      call("propose_change", { kind: "code", reason: "Use pin 13", patch: { find: "digitalWrite(12", replace: "digitalWrite(13" } }),
      context(),
    );
    expect(outcome.result).toMatchObject({ ok: true, shown: true });
    expect(outcome.card).toMatchObject({ kind: "change", status: "pending" });
    if (outcome.card?.kind !== "change") throw new Error("no card");
    expect(outcome.card.after).toContain("digitalWrite(13, HIGH)");
    expect(outcome.card.before).toContain("digitalWrite(12, HIGH)");
  });

  test("propose_change with text that is not in the code goes back to the model", () => {
    const outcome = runClientTool(call("propose_change", { kind: "code", reason: "r", patch: { find: "analogRead", replace: "x" } }), context());
    expect(outcome).toEqual({ result: { ok: false, error: "propose_change: find text is not in the current code" }, card: null });
  });

  test("ask_peer posts in the room, or offers an invite outside one", () => {
    const ask = vi.fn();
    const room = { peers: [{ id: "p2", name: "Ana", done: ["board:uno-r3:lesson:blink"] }], ask };
    const sent = runClientTool(call("ask_peer", { peerId: "p2", question: "Explain the LED's legs to Sam?" }), context({ room }));
    expect(ask).toHaveBeenCalledWith(room.peers[0], "Explain the LED's legs to Sam?");
    expect(sent).toEqual({
      result: { ok: true, sent: true, peer: "Ana" },
      card: { kind: "peer", peer: "Ana", question: "Explain the LED's legs to Sam?", sent: true },
    });
    const alone = runClientTool(call("ask_peer", { peerId: "p2", question: "Explain the legs?" }), context());
    expect(alone.result).toEqual({ ok: false, error: "the learner is not in a room" });
    expect(alone.card).toMatchObject({ kind: "peer", sent: false });
  });

  test("open_panel switches the dock tab", () => {
    const openTab = vi.fn();
    expect(runClientTool(call("open_panel", { tab: "real" }), context({ openTab })).card).toEqual({ kind: "panel", tab: "real" });
    expect(openTab).toHaveBeenCalledWith("real");
  });
});
