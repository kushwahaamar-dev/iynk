import { sha256Hex } from "../../core/sha256.ts";
import { readPack } from "../../export/pack.ts";
import type { PackPlan } from "../../export/pack.ts";
import { openDb } from "../../local/db.ts";
import { createIndexedDbPartsRepository, createMemoryPartsRepository } from "../../local/parts-store.ts";
import type { PartRecord, PartsRepository, PutResult } from "../../local/parts-store.ts";
import { CORE_CAUSE_IDS } from "../../sim/faults/cause-ids.ts";
import { loadFailureModels } from "../../sim/faults/models.ts";
import type { FailureModel } from "../../sim/faults/models.ts";
import { SYMPTOM_IDS } from "../../sim/faults/symptoms.ts";
import { builtinRefsForImport } from "../../sim/models/builtins.ts";
import { createRuntimeEntries } from "../../sim/registry/entries.ts";
import type { RuntimeEntries } from "../../sim/registry/entries.ts";
import { registerPartEntries } from "../../sim/registry/from-descriptor.ts";
import { checkPng, sanitizeSvg, svgToDataUrl } from "../art-sanitize.ts";
import { getAppRegistry } from "../builtin.ts";
import { digestOf } from "../descriptor.ts";
import type { Descriptor as ComponentDescriptor, ValidateContext } from "../descriptor.ts";
import type { PartRegistry } from "../registry.ts";
import { commitPack } from "./commit-pack.ts";
import type { CommitChoice, PackCommitResult } from "./commit-pack.ts";

const CHANNEL = "iynk-parts";
const CAUSE_IDS: ReadonlySet<string> = new Set([...CORE_CAUSE_IDS, ...SYMPTOM_IDS]);

export interface LibrarySkip {
  key: string;
  reason: string;
}

export interface PartLibrary {
  readonly registry: PartRegistry;
  /** Fidelity entries of the library parts. They live in memory only. */
  readonly entries: RuntimeEntries;
  /** False when the browser would not open its database: parts last until the page closes. */
  readonly persistent: boolean;
  init(): Promise<{ loaded: number; skipped: LibrarySkip[] }>;
  subscribe(fn: () => void): () => void;
  existingKeys(): ReadonlySet<string>;
  get(id: string, version: string): ComponentDescriptor | undefined;
  save(def: ComponentDescriptor, files: ReadonlyMap<string, Blob>): Promise<PutResult>;
  remove(id: string, version: string): Promise<void>;
  hasAsset(sha256: string): boolean;
  assetUrl(sha256: string): string | undefined;
  /** `id@version` to the sender of the pack the part came in. */
  senders(): ReadonlyMap<string, string>;
  /** Failure models of the library parts, next to the shipped ones. */
  failureModels(): FailureModel[];
  readPack(bytes: Uint8Array, sender: string): Promise<PackPlan>;
  commitPack(plan: Extract<PackPlan, { ok: true }>, choice: CommitChoice): Promise<PackCommitResult>;
}

export interface LibraryOptions {
  persistent: boolean;
  /** Defaults to the registry the whole app shares. */
  registry?: PartRegistry;
  /** Tells other tabs to look at the store again. */
  channel?: BroadcastChannel;
  logError?(where: string, message: string): void;
}

const keyOf = (id: string, version: string): string => `${id}@${version}`;

function base64Of(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

/** The data URL of a stored picture once it has passed the same checks an import faces, else null. */
function safeUrl(mediaType: string, bytes: Uint8Array): string | null {
  if (mediaType === "image/png") return checkPng(bytes).ok ? `data:image/png;base64,${base64Of(bytes)}` : null;
  const svg = sanitizeSvg(new TextDecoder().decode(bytes));
  return svg.ok ? svgToDataUrl(svg.svg) : null;
}

/** Library parts held in the app registry. Records are validated again here every time, whoever wrote them. */
export function createPartLibrary(repo: PartsRepository, opts: LibraryOptions): PartLibrary {
  const registry = opts.registry ?? getAppRegistry();
  const entries = createRuntimeEntries();
  const records = new Map<string, PartRecord>();
  const refused = new Set<string>();
  const assets = new Set<string>();
  const urls = new Map<string, string>();
  const listeners = new Set<() => void>();

  const notify = () => {
    for (const fn of [...listeners]) fn();
  };

  const installed = (): Map<string, string> => new Map(registry.list().map((p) => [keyOf(p.ref, p.version), p.digest]));

  const contextFor = (trust: PartRecord["trust"], candidateDigest: string): ValidateContext => ({
    trust,
    candidateDigest,
    installed: installed(),
    builtinRefs: builtinRefsForImport(),
    causeIds: CAUSE_IDS,
  });

  function skip(skipped: LibrarySkip[], key: string, reason: string): void {
    refused.add(key);
    skipped.push({ key, reason });
    opts.logError?.("parts.library", `${key}: ${reason}`);
  }

  /** Keeps the pictures the descriptor names that pass the art checks. */
  function takeArt(def: ComponentDescriptor, fileShas: Readonly<Record<string, string>>, bytesOf: Map<string, Uint8Array>): void {
    for (const asset of def.visual.assets ?? []) {
      const sha = fileShas[asset.path];
      const bytes = sha === undefined ? undefined : bytesOf.get(sha);
      if (sha === undefined || bytes === undefined || sha256Hex(bytes) !== sha) continue;
      const url = safeUrl(asset.media_type, bytes);
      if (url === null) continue;
      assets.add(sha);
      urls.set(sha, url);
    }
  }

  async function bytesOfFiles(shas: Iterable<string>): Promise<Map<string, Uint8Array>> {
    const found = await Promise.all([...new Set(shas)].map(async (sha) => [sha, await repo.getFile(sha)] as const));
    const bytes = new Map<string, Uint8Array>();
    for (const [sha, blob] of found) if (blob) bytes.set(sha, new Uint8Array(await blob.arrayBuffer()));
    return bytes;
  }

  function takeRecord(rec: PartRecord): string | null {
    if (digestOf(rec.descriptor) !== rec.digest) return "digest";
    const added = registry.add(rec.descriptor, { ctx: contextFor(rec.trust, rec.digest) });
    if (!added.ok) return `schema: ${[...new Set(added.error.map((d) => d.code))].join(", ")}`;
    records.set(rec.key, rec);
    registerPartEntries(entries, [rec.descriptor], rec.trust);
    return null;
  }

  function dropRecord(key: string): void {
    const rec = records.get(key);
    if (!rec) return;
    records.delete(key);
    registry.remove(rec.id, rec.version);
  }

  /** Brings the registry in line with the store: new valid records in, records that left the store out. */
  async function sync(): Promise<{ loaded: number; skipped: LibrarySkip[] }> {
    const stored = await repo.list();
    const skipped: LibrarySkip[] = [];
    const present = new Set(stored.map((r) => r.key));
    for (const key of [...records.keys()]) if (!present.has(key)) dropRecord(key);
    const fresh = stored.filter((r) => !records.has(r.key) && !refused.has(r.key));
    const taken: PartRecord[] = [];
    for (const rec of fresh) {
      const reason = takeRecord(rec);
      if (reason === null) taken.push(rec);
      else skip(skipped, rec.key, reason);
    }
    const bytes = await bytesOfFiles(taken.flatMap((r) => Object.values(r.files)));
    for (const rec of taken) takeArt(rec.descriptor, rec.files, bytes);
    return { loaded: taken.length, skipped };
  }

  if (opts.channel) {
    opts.channel.onmessage = () => {
      void sync()
        .then(notify)
        .catch(() => undefined);
    };
  }
  const announce = () => opts.channel?.postMessage("changed");

  return {
    registry,
    entries,
    persistent: opts.persistent,
    async init() {
      const result = await sync();
      notify();
      return result;
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => void listeners.delete(fn);
    },
    existingKeys: () => new Set(registry.list().map((p) => keyOf(p.ref, p.version))),
    get: (id, version) => registry.get(id, version),
    async save(def, files) {
      const key = keyOf(def.id, def.version);
      const digest = digestOf(def);
      const known = installed().get(key);
      if (known !== undefined) return known === digest ? "same" : "conflict";

      const bytes = new Map<string, Uint8Array>();
      const fileShas: Record<string, string> = {};
      for (const [path, blob] of files) {
        const data = new Uint8Array(await blob.arrayBuffer());
        const sha = sha256Hex(data);
        bytes.set(sha, data);
        fileShas[path] = sha;
      }
      const rec: PartRecord = { key, id: def.id, version: def.version, descriptor: def, digest, trust: "local", addedAt: new Date().toISOString(), files: fileShas };
      const reason = takeRecord(rec);
      if (reason !== null) throw new Error(`${key} is not a valid part (${reason})`);
      try {
        const written = await repo.putMany([rec], new Map([...bytes].map(([sha, data]) => [sha, new Blob([data as BlobPart])])));
        if (!written.ok) {
          dropRecord(key);
          return "conflict";
        }
      } catch (error) {
        dropRecord(key);
        throw error;
      }
      takeArt(def, fileShas, bytes);
      notify();
      announce();
      return "added";
    },
    async remove(id, version) {
      await repo.remove(id, version);
      dropRecord(keyOf(id, version));
      notify();
      announce();
    },
    hasAsset: (sha256) => assets.has(sha256),
    assetUrl: (sha256) => urls.get(sha256),
    senders: () => new Map([...records.values()].flatMap((r) => (r.source?.sender ? [[r.key, r.source.sender] as const] : []))),
    failureModels: () => loadFailureModels([...records.values()].map((r) => r.descriptor)),
    readPack: (bytes, sender) => readPack(bytes, { sender, installed: installed(), builtinRefs: builtinRefsForImport(), causeIds: CAUSE_IDS }),
    async commitPack(plan, choice) {
      const result = await commitPack(plan, choice, repo);
      if (result.ok && choice.mode === "library") {
        await sync();
        notify();
        announce();
      }
      return result;
    },
  };
}

let shared: Promise<PartLibrary> | undefined;

/** The library of this page: opens the browser database, or keeps parts in memory when it cannot. Loaded once. */
export function getPartLibrary(): Promise<PartLibrary> {
  shared ??= (async () => {
    try {
      const db = await openDb();
      const logError = (where: string, message: string) => {
        try {
          db.transaction("errors", "readwrite").objectStore("errors").add({ where, message, at: new Date().toISOString() });
        } catch {
          // the log is best effort
        }
      };
      const channel = typeof BroadcastChannel === "undefined" ? undefined : new BroadcastChannel(CHANNEL);
      const library = createPartLibrary(createIndexedDbPartsRepository(db), { persistent: true, channel, logError });
      await library.init();
      return library;
    } catch {
      const library = createPartLibrary(createMemoryPartsRepository(), { persistent: false });
      await library.init();
      return library;
    }
  })();
  return shared;
}
