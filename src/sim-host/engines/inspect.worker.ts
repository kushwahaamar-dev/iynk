import type { InspectFail, InspectOk, WorkerReply, WorkerRequest } from "./inspect";

type YosysModule = {
  runYosys(
    args: string[],
    files: Record<string, string>,
    options: { stdout: (bytes: Uint8Array | null) => void; stderr: (bytes: Uint8Array | null) => void },
  ): Promise<Record<string, string | Uint8Array>>;
};

interface Scope {
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
  postMessage(message: WorkerReply): void;
}

const scope = self as unknown as Scope;

/** Under `default_nettype none` an undeclared name is an error, not a silent 1-bit wire (SIM 8.6). The prefix stays on the first line so line numbers match. */
const PREFIX = "`default_nettype none ";
const IMPLICIT = /^\S+?:(\d+)[^:]*: Warning: Identifier `\\?([^']+)' is implicitly declared/;

let yosys: YosysModule | null = null;

/** The engine fetches its own wasm and data files relative to its script; serve those from the bytes the loader already checked. */
function serveVerified(files: Extract<WorkerRequest, { type: "init" }>["files"]): void {
  const verified = new Map(files.map((f) => [new URL(f.url, self.location.href).href, f]));
  const realFetch = self.fetch.bind(self);
  self.fetch = (input, init) => {
    const url = input instanceof Request ? input.url : new URL(String(input), self.location.href).href;
    const file = verified.get(url);
    if (!file) return realFetch(input, init);
    const headers = file.kind === "wasm" ? { "content-type": "application/wasm" } : undefined;
    return Promise.resolve(new Response(file.bytes, { headers }));
  };
}

async function init(files: Extract<WorkerRequest, { type: "init" }>["files"]): Promise<void> {
  serveVerified(files);
  const script = files.find((f) => f.kind === "js");
  if (!script) throw new Error("the engine has no script file");
  yosys = (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ new URL(script.url, self.location.href).href)) as YosysModule;
}

function logger(): { sink(bytes: Uint8Array | null): void; text(): string } {
  const decoder = new TextDecoder();
  let text = "";
  return {
    sink: (bytes) => {
      if (bytes) text += decoder.decode(bytes, { stream: true });
    },
    text: () => text,
  };
}

interface NetlistModule {
  attributes?: { top?: unknown };
  cells?: Record<string, { type: string }>;
  netnames?: Record<string, unknown>;
}

function summarise(netlistJson: string, log: string): Omit<InspectOk, "ms"> {
  const modules = (JSON.parse(netlistJson) as { modules: Record<string, NetlistModule> }).modules;
  const top = Object.values(modules).find((m) => m.attributes?.top !== undefined && Number(m.attributes.top) !== 0) ?? Object.values(modules)[0];
  const cells: Record<string, number> = {};
  for (const cell of Object.values(top?.cells ?? {})) cells[cell.type] = (cells[cell.type] ?? 0) + 1;

  const lines = log.split("\n");
  const implicitWires = lines.flatMap((line) => {
    const hit = IMPLICIT.exec(line);
    return hit ? [{ line: Number(hit[1]), name: hit[2] }] : [];
  });
  const warnings = lines.filter((line) => /Warning:/.test(line)).map((line) => line.trim());
  return { ok: true, cells, nets: Object.keys(top?.netnames ?? {}).length, netlistJson, implicitWires, warnings };
}

async function elaborate(src: string, top?: string): Promise<Omit<InspectOk, "ms"> | InspectFail> {
  if (!yosys) return { ok: false, error: "the engine is not loaded", log: "" };
  const out = logger();
  const hierarchy = top ? `hierarchy -top ${top}` : "hierarchy -auto-top";
  const script = `read_verilog -sv in.v; ${hierarchy}; proc; opt; stat; write_json out.json`;
  try {
    const files = await yosys.runYosys(["-p", script], { "in.v": PREFIX + src }, { stdout: out.sink, stderr: out.sink });
    const json = files["out.json"];
    const netlistJson = typeof json === "string" ? json : new TextDecoder().decode(json);
    return summarise(netlistJson, out.text());
  } catch (error) {
    const log = out.text();
    const first = log.split("\n").find((line) => /ERROR:/.test(line));
    return { ok: false, error: first?.replace(/^.*?ERROR:\s*/, "") ?? (error instanceof Error ? error.message : String(error)), log };
  }
}

scope.onmessage = (event) => {
  const message = event.data;
  if (message.type === "init") {
    init(message.files).then(
      () => scope.postMessage({ type: "ready" }),
      (error: unknown) => scope.postMessage({ type: "failed", error: error instanceof Error ? error.message : String(error) }),
    );
  } else {
    void elaborate(message.src, message.top).then((result) => scope.postMessage({ type: "result", result }));
  }
};
