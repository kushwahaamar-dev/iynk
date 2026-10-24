import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { LabStore } from "@/components/dock/types";
import type { FigureHandle } from "@/components/figure/protocol";
import common from "@/i18n/messages/en/common.json";
import { initialState } from "@/lib/boardlab/store";

const encoder = new TextEncoder();

function sse(events: object[]) {
  return new Response(
    new ReadableStream({
      start(controller) {
        for (const event of events) controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        controller.close();
      },
    }),
    { headers: { "content-type": "text/event-stream" } },
  );
}

const done = { type: "done", usage: { provider: "meta", inTokens: 1, outTokens: 1 } };

type Handler = (body: Record<string, unknown>) => Response;

function mockFetch(features: Record<string, boolean>, chat: Handler[]) {
  const bodies: Array<Record<string, unknown>> = [];
  const fetch = vi.fn(async (url: string, init?: RequestInit) => {
    if (url === "/api/status") return Response.json({ features });
    if (url === "/api/ai/chat") {
      const body = JSON.parse(init!.body as string) as Record<string, unknown>;
      bodies.push(body);
      const next = chat.shift();
      if (!next) throw new Error("unexpected chat call");
      return next(body);
    }
    throw new Error(`unexpected fetch ${url}`);
  });
  vi.stubGlobal("fetch", fetch);
  return { fetch, bodies };
}

const code = "void loop() {\n  digitalWrite(12, HIGH);\n}";

function boardStore() {
  let state = initialState({ board: "uno-r3", lesson: "blink", language: "arduino-cpp", template: code });
  return {
    getState: () => state,
    subscribe: () => () => {},
    dispatch: vi.fn((action: { type: string; code?: string }) => {
      if (action.type === "code/replace") state = { ...state, code: action.code! };
    }),
  } satisfies LabStore;
}

async function renderPanel(store: LabStore, figure: FigureHandle | null) {
  // Fresh modules per test: the feature flags and conversations are module singletons.
  vi.resetModules();
  const { I18nProvider } = await import("@/i18n/client");
  const { PartnerPanel } = await import("./PartnerPanel");
  return render(
    <I18nProvider locale="en" messages={common.client}>
      <PartnerPanel lab="board" itemId="uno-r3" store={store} figure={figure} />
    </I18nProvider>,
  );
}

const FULL = { ai: true, image: true, voice: true, search: true, solana: false, db: false, realtime: false, gemini: false };

beforeEach(() => {
  Element.prototype.scrollTo ??= () => {};
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("PartnerPanel", () => {
  test("shows a real not-set-up state when the deployment has no AI key", async () => {
    mockFetch({ ...FULL, ai: false }, []);
    await renderPanel(boardStore(), null);
    expect(await screen.findByText("The lab partner isn’t set up on this deployment")).toBeTruthy();
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  test("streams a reply, runs highlight_part on the figure and continues with the tool result", async () => {
    const { bodies } = mockFetch(FULL, [
      () =>
        sse([
          { type: "text", delta: "Check the **LED** first." },
          { type: "citation", url: "https://docs.arduino.cc/built-in-examples/basics/Blink/", title: "Blink", snippet: "Pin 13" },
          { type: "tool_call", id: "call-1", name: "highlight_part", args: { partId: "led1", note: "Long leg to pin 13" } },
          done,
        ]),
      () => sse([{ type: "text", delta: "Which leg is longer?" }, done]),
    ]);
    const send = vi.fn();
    const figure = { send, observe: () => () => {}, isReady: () => true, info: () => null, focus: () => {} } as unknown as FigureHandle;
    await renderPanel(boardStore(), figure);

    const box = await screen.findByRole("textbox", { name: "Ask your lab partner" });
    fireEvent.change(box, { target: { value: "Why is the LED off?" } });
    fireEvent.keyDown(box, { key: "Enter" });

    expect(await screen.findByText("Which leg is longer?")).toBeTruthy();
    expect(screen.getByText("LED").tagName).toBe("STRONG");
    expect(screen.getByRole("link", { name: /Blink/ }).getAttribute("href")).toBe("https://docs.arduino.cc/built-in-examples/basics/Blink/");
    expect(screen.getByText("Look at led1")).toBeTruthy();
    expect(send).toHaveBeenCalledWith("flash", { text: "Long leg to pin 13", ms: 4000 });
    expect(send).toHaveBeenCalledWith("set", { state: { select: "led1" } });

    expect(bodies).toHaveLength(2);
    expect(bodies[0]).toMatchObject({ lab: "board", itemId: "uno-r3", locale: "en", messages: [{ role: "user", content: "Why is the LED off?" }] });
    expect(String(bodies[0].bench)).toContain("digitalWrite(12, HIGH);");
    expect(bodies[1].messages).toEqual([
      { role: "user", content: "Why is the LED off?" },
      {
        role: "assistant",
        content: "Check the **LED** first.",
        tool_calls: [{ id: "call-1", name: "highlight_part", args: { partId: "led1", note: "Long leg to pin 13" } }],
      },
      { role: "tool", tool_call_id: "call-1", content: JSON.stringify({ ok: true }) },
    ]);
  });

  test("a proposed change shows a diff; Accept dispatches it and the model hears about it", async () => {
    const { bodies } = mockFetch(FULL, [
      () =>
        sse([
          {
            type: "tool_call",
            id: "call-2",
            name: "propose_change",
            args: { kind: "code", reason: "The LED is on pin 13.", patch: { find: "digitalWrite(12", replace: "digitalWrite(13" } },
          },
          done,
        ]),
      () => sse([{ type: "text", delta: "Accept it and press Run." }, done]),
      () => sse([{ type: "text", delta: "Nice, it blinks." }, done]),
    ]);
    const store = boardStore();
    await renderPanel(store, null);
    const box = await screen.findByRole("textbox", { name: "Ask your lab partner" });
    fireEvent.change(box, { target: { value: "Show me the fix." } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByText("Proposed code change")).toBeTruthy();
    expect(screen.getByText("The LED is on pin 13.")).toBeTruthy();
    expect(screen.getByText("digitalWrite(13, HIGH);", { exact: false })).toBeTruthy();
    await screen.findByText("Accept it and press Run.");
    fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    expect(store.dispatch).toHaveBeenCalledWith({ type: "code/replace", code: "void loop() {\n  digitalWrite(13, HIGH);\n}" });
    expect(screen.getByText("You accepted the code change.")).toBeTruthy();

    fireEvent.change(box, { target: { value: "It works!" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Send" }));
    });
    await screen.findByText("Nice, it blinks.");
    const last = bodies[2].messages as Array<{ role: string; content: string }>;
    expect(last.at(-1)).toEqual({ role: "user", content: "[The learner accepted your proposed code change.]\n\nIt works!" });
  });

  test("an upstream error keeps the question and offers a retry", async () => {
    mockFetch(FULL, [
      () => Response.json({ error: { code: "upstream_failed", message: "x" } }, { status: 502 }),
      () => sse([{ type: "text", delta: "Back again." }, done]),
    ]);
    await renderPanel(boardStore(), null);
    const box = await screen.findByRole("textbox", { name: "Ask your lab partner" });
    fireEvent.change(box, { target: { value: "Hello?" } });
    fireEvent.keyDown(box, { key: "Enter" });
    expect(await screen.findByText("The partner didn’t answer this time. Try again.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Back again.")).toBeTruthy();
    await waitFor(() => expect(screen.queryByText("The partner didn’t answer this time. Try again.")).toBeNull());
    expect(screen.getAllByText("Hello?")).toHaveLength(1);
  });
});
