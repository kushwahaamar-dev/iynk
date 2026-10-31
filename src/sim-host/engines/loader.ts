// Engine loader (FRONTEND_ARCHITECTURE 8.3). Engines are same-origin files under /engines/<id>@<version>/ listed in
// /engines/manifest.json. loadEngine checks what the device can do and reports the download size first; nothing is
// fetched until the caller asks for the files, and every file is checked against the sha256 the build recorded.

export interface EngineFile {
  path: string;
  sha256: string;
  bytes: number;
  brotliBytes?: number;
  kind: "wasm" | "js" | "data";
}

export interface EngineManifestEntry {
  id: string;
  version: string;
  files: EngineFile[];
  requires: { wasm?: ("exnref" | "simd" | "threads")[]; minDeviceMemoryGb?: number; desktopOnly?: boolean };
  license: { spdx: string; reviewed: boolean };
  budget: { wireBytes: number; rawBytes: number };
}

export interface LoadedFile {
  path: string;
  url: string;
  kind: EngineFile["kind"];
  bytes: ArrayBuffer;
}

export type FetchedFiles =
  | { ok: true; files: LoadedFile[] }
  | { ok: false; reason: "integrity" | "network"; detail: string };

export type EngineOffer =
  | { ok: true; entry: EngineManifestEntry; wireBytes: number; rawBytes: number; fetchFiles(): Promise<FetchedFiles> }
  | { ok: false; reason: "device" | "unsupported" | "network"; detail: string };

export type LoadEngine = (id: string) => Promise<EngineOffer>;

export interface LoaderDeps {
  fetch: typeof fetch;
  features: {
    wasm: ReadonlySet<string>;
    deviceMemoryGb: number | undefined;
    desktop: boolean;
  };
}

const ENGINE_ROOT = "/engines";

/** try_table with a catch_all clause: only a module engine that implements exnref validates it. */
const EXNREF_PROBE = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 2, 1, 0, 10, 10, 1, 8, 0, 31, 64, 1, 2, 0, 11, 11]);

export function detectFeatures(): LoaderDeps["features"] {
  const wasm = new Set<string>();
  if (typeof WebAssembly !== "undefined" && WebAssembly.validate(EXNREF_PROBE)) wasm.add("exnref");
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return { wasm, deviceMemoryGb: memory, desktop: !matchMedia("(pointer: coarse)").matches };
}

const hex = (digest: ArrayBuffer): string => Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");

const hexBytes = (text: string): number[] => Array.from({ length: text.length / 2 }, (_, i) => parseInt(text.slice(i * 2, i * 2 + 2), 16));

async function fetchFile(deps: LoaderDeps, file: EngineFile): Promise<LoadedFile | { reason: "integrity" | "network"; detail: string }> {
  const url = `${ENGINE_ROOT}/${file.path}`;
  let bytes: ArrayBuffer;
  try {
    const response = await deps.fetch(url, { integrity: `sha256-${btoa(String.fromCharCode(...hexBytes(file.sha256)))}` });
    if (!response.ok) return { reason: "network", detail: `${file.path}: ${response.status}` };
    bytes = await response.arrayBuffer();
  } catch (error) {
    return { reason: "network", detail: `${file.path}: ${error instanceof Error ? error.message : String(error)}` };
  }
  if (hex(await crypto.subtle.digest("SHA-256", bytes)) !== file.sha256) return { reason: "integrity", detail: file.path };
  return { path: file.path, url, kind: file.kind, bytes };
}

export function createLoader(deps: LoaderDeps): LoadEngine {
  return async (id) => {
    let entry: EngineManifestEntry | undefined;
    try {
      const response = await deps.fetch(`${ENGINE_ROOT}/manifest.json`);
      if (!response.ok) return { ok: false, reason: "network", detail: `manifest: ${response.status}` };
      entry = ((await response.json()) as { engines: EngineManifestEntry[] }).engines.find((e) => e.id === id);
    } catch (error) {
      return { ok: false, reason: "network", detail: `manifest: ${error instanceof Error ? error.message : String(error)}` };
    }
    if (!entry) return { ok: false, reason: "unsupported", detail: `${id} is not in the engine manifest` };

    const { requires } = entry;
    const missing = requires.wasm?.find((feature) => !deps.features.wasm.has(feature));
    if (missing) return { ok: false, reason: "unsupported", detail: `${id} needs WebAssembly ${missing}` };
    const memory = deps.features.deviceMemoryGb;
    if (requires.minDeviceMemoryGb !== undefined && memory !== undefined && memory < requires.minDeviceMemoryGb) {
      return { ok: false, reason: "device", detail: `${id} needs ${requires.minDeviceMemoryGb} GB of memory` };
    }
    if (requires.desktopOnly && !deps.features.desktop) return { ok: false, reason: "device", detail: `${id} needs a desktop browser` };

    const found = entry;
    return {
      ok: true,
      entry: found,
      wireBytes: found.budget.wireBytes,
      rawBytes: found.budget.rawBytes,
      async fetchFiles() {
        const files: LoadedFile[] = [];
        for (const file of found.files) {
          const loaded = await fetchFile(deps, file);
          if ("reason" in loaded) return { ok: false, ...loaded };
          files.push(loaded);
        }
        return { ok: true, files };
      },
    };
  };
}

export const loadEngine: LoadEngine = (id) => createLoader({ fetch: (input, init) => fetch(input, init), features: detectFeatures() })(id);
