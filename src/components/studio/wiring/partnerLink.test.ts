// @vitest-environment node
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ModelEvent, ModelRequest } from "@/ai/adapters/types";
import { createLedger, DEFAULT_CAPS } from "@/ai/ledger";
import type { AiLogRow } from "@/ai/log";
import type { ProviderProfile } from "@/ai/profiles";
import { builtinRegistry } from "@/parts/builtin";
import { memoryProfileStore } from "@/local/ai-profiles";
import { memoryThreadStore } from "@/local/ai-threads";
import { memoryUsageStore } from "@/local/ai-usage";
import { lessonSession } from "@/project/session.testing";
import { createRecordingDoc } from "@/studio/testing/recording-doc";
import { createRunStore } from "@/studio/stores/run";
import { createSessionStore } from "@/studio/stores/session";
import { createUiStore } from "@/studio/stores/ui";
import { linkPartner, studioUi, type PartnerLinkDeps } from "./partnerLink";

const PROFILE: ProviderProfile = {
  id: "prf_0123456789",
  label: "stub",
  family: "openai-compat",
  baseUrl: "https://api.example.com/v1",
  keyId: "key_0123456789",
  via: "direct",
  models: [{ id: "stub-model", contextTokens: 100_000, maxOutputTokens: 4_000 }],
};

const usage: ModelEvent = { t: "usage", inTokens: 100, cacheReadTokens: 0, cacheWriteTokens: 0, outTokens: 20 };

async function rig(o: { profile?: ProviderProfile | null; secret?: string | null; caps?: typeof DEFAULT_CAPS } = {}) {
  const doc = createRecordingDoc(lessonSession());
  const run = createRunStore();
  const session = createSessionStore(doc.getState().state.views[0]!.id);
  const profiles = memoryProfileStore();
  if (o.profile !== null) {
    const profile = o.profile ?? PROFILE;
    await profiles.put(profile, o.secret === undefined && profile.keyId !== null ? "sk-test-secret-value" : o.secret);
  }
  const requests: ModelRequest[] = [];
  const rows: AiLogRow[] = [];
  const store = memoryUsageStore();
  const caps = o.caps ?? DEFAULT_CAPS;
  const ai = {
    async *stream(req: ModelRequest): AsyncGenerator<ModelEvent> {
      requests.push(structuredClone(req));
      yield { t: "text", delta: "Look at the LED." };
      yield usage;
      yield { t: "done", reason: "stop" };
    },
    probe: async () => ({ reachable: true, modelIds: [] }),
  };
  const highlights: string[] = [];
  const deps: PartnerLinkDeps = {
    doc,
    run,
    session,
    profiles,
    ledger: createLedger({ store, caps: () => caps, now: Date.now, day: () => "2026-10-30", random: Math.random }),
    ai,
    threads: memoryThreadStore(),
    server: () => ({ ready: false, url: null }),
    locale: () => "en",
    registry: () => builtinRegistry(),
    rules: () => [],
    traceOf: () => ({ ok: false, code: "no_run" }),
    diagnoses: () => [],
    itemState: () => null,
    ui: { highlight: (ref) => void highlights.push(ref.raw), openPanel() {} },
    openSettings: vi.fn(),
    caps: () => caps,
    log: async (row) => void rows.push(row),
    retention: () => "project",
    random: Math.random,
    now: Date.now,
  };
  const partner = linkPartner(deps);
  if (o.profile !== null) await vi.waitFor(() => expect(partner.status()).not.toBe("not_set_up"));
  return { doc, run, session, profiles, partner, requests, rows, highlights, deps };
}

async function ask(partner: Awaited<ReturnType<typeof rig>>["partner"], text = "why does it not blink") {
  const events = [];
  for await (const event of partner.run({ mode: "direct", text, signal: new AbortController().signal })) events.push(event);
  return events;
}

afterEach(() => vi.unstubAllGlobals());

describe("linkPartner", () => {
  it("reads the stores and puts the selected part in the pack", async () => {
    const { doc, session, partner, requests, deps } = await rig();
    const part = doc.getState().state.components[0]!;
    session.setSelection([{ kind: "part", view: session.getState().viewId, id: part.id }, { kind: "wire", view: session.getState().viewId, id: "wir_x" }]);

    expect(partner.sources.selection()).toEqual([part.id]);
    expect(partner.sources.project().doc).toBe(doc.getState().state);
    expect(partner.sources.project().revision).toBe(doc.getState().revision);
    expect(partner.sources.locale()).toBe(deps.locale());

    await ask(partner);
    expect(requests).toHaveLength(1);
    expect(requests[0]!.messages[0]!.text).toContain(`[SELECTION] 1 selected: ${part.id}`);
  });

  it("shows the serial lines of the run to the partner", async () => {
    const { run, partner } = await rig();
    expect(partner.sources.run()).toBeNull();
    run.apply({ t: "phase", phase: "running" });
    run.apply({ t: "serial", tNs: 1_000_000, kind: "out", text: "tick\n" });
    const snapshot = partner.sources.run();
    expect(snapshot?.phase).toBe("running");
    expect(snapshot?.serial).toEqual([{ tNs: 1_000_000, kind: "out", text: "tick" }]);
  });

  it("never writes to the project", async () => {
    const { doc, partner } = await rig();
    await ask(partner);
    expect(doc.commits).toHaveLength(0);
    const source = readFileSync(new URL("./partnerLink.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(/commit\(|session\.apply/);
  });

  it("maps what is missing to a status", async () => {
    expect((await rig({ profile: null })).partner.status()).toBe("not_set_up");
    expect((await rig({ secret: null })).partner.status()).toBe("no_key");
    expect((await rig()).partner.status()).toBe("ready");

    vi.stubGlobal("navigator", { onLine: false });
    expect((await rig()).partner.status()).toBe("offline");
    const local = await rig({ profile: { ...PROFILE, keyId: null, caps: { tools: "native", parallelTools: false, usageInStream: true, promptCache: "none", structuredOutput: false, contextTokens: 8_000, maxOutputTokens: 1_000, browserDirect: "yes", privacy: "local" } } });
    expect(local.partner.status()).toBe("ready");
  });

  it("says capped after the day's cap stops a call", async () => {
    const { partner, requests } = await rig({ caps: { ...DEFAULT_CAPS, dayUSD: null, monthUSD: null, sessionUSD: null, dayTokens: 0, sessionTokens: null } });
    const events = await ask(partner);
    expect(events.at(-1)).toMatchObject({ t: "error", error: { code: "capped" } });
    expect(requests).toHaveLength(0);
    expect(partner.status()).toBe("capped");
  });

  it("answers not configured without a profile", async () => {
    const { partner } = await rig({ profile: null });
    expect((await ask(partner)).at(-1)).toMatchObject({ t: "error", error: { code: "not_configured" } });
  });

  it("keeps the exchange for the next question", async () => {
    const { partner, requests } = await rig();
    await ask(partner, "first question");
    await ask(partner, "second question");
    expect(requests[1]!.messages[0]!.text).toContain("first question");
    expect(requests[1]!.messages[0]!.text).toContain("Look at the LED.");
  });

  it("previews the pack and honours a switched off source", async () => {
    const { partner } = await rig();
    const before = partner.preview();
    expect(before.sections.find((s) => s.id === "S7")?.included).toBe(true);
    partner.toggleSource("S7", false);
    expect(partner.preview().sections.find((s) => s.id === "S7")?.included).toBe(false);
  });

  it("points at a part through the studio", async () => {
    const { partner, highlights } = await rig();
    partner.ui.highlight("cmp_x1");
    partner.ui.highlight("not a reference");
    expect(highlights).toEqual(["cmp_x1"]);
  });

  it("stops a running turn when it is disposed", async () => {
    const { partner, deps } = await rig();
    let aborted = false;
    deps.ai.stream = async function* (_req, _id, signal) {
      await new Promise<void>((resolve) => signal.addEventListener("abort", () => resolve(), { once: true }));
      aborted = signal.aborted;
      yield { t: "done", reason: "stop" };
    };
    const events = ask(partner);
    await vi.waitFor(() => expect(partner.status()).toBe("busy"));
    partner.dispose();
    await events;
    expect(aborted).toBe(true);
  });
});

describe("studioUi", () => {
  function setup() {
    const session = createSessionStore("view_1");
    const ui = createUiStore("prj_test", undefined);
    const fitSelection = vi.fn();
    return { session, ui, fitSelection, host: studioUi({ session, ui, fitSelection }) };
  }

  it("selects and frames a part, focuses a net, shows the code and opens the partner tab", () => {
    const { session, ui, fitSelection, host } = setup();
    host.highlight({ kind: "component", raw: "cmp_led1", id: "cmp_led1" });
    expect(session.getState().selection).toEqual([{ kind: "part", view: "view_1", id: "cmp_led1" }]);
    expect(fitSelection).toHaveBeenCalledTimes(1);

    host.highlight({ kind: "net", raw: "net_d12", id: "net_d12" });
    expect(session.getState().focusNet).toBe("net_d12");

    ui.set("dock", "serial");
    host.highlight({ kind: "source", raw: "src_main", id: "src_main" });
    expect(ui.getState().dock).toBe("code");

    host.openPanel("partner");
    expect(ui.getState().rightRail).toBe("partner");
    host.openPanel("together");
    expect(ui.getState().rightRail).toBe("partner");
  });
});
