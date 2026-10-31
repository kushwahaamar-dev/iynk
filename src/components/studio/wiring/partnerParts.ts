import { createAiHost, spawnAiWorker, type AiHost } from "@/ai/worker/host";
import { CHANNEL_NAME, createLedger, DEFAULT_CAPS, type Caps, type ChannelLike, type Ledger } from "@/ai/ledger";
import { localDay } from "@/ai/host/turn";
import type { AiLogRow } from "@/ai/log";
import { DbError, openDb } from "@/local/db";
import { idbProfileStore, memoryProfileStore, type ProfileStore } from "@/local/ai-profiles";
import { idbThreadStore, memoryThreadStore, type ThreadStore } from "@/local/ai-threads";
import { idbUsageStore, memoryUsageStore, type UsageStore } from "@/local/ai-usage";
import { createClient, type ServerClient } from "@/server-client/client";
import { idbKeyStore, memoryKeyStore } from "@/server-client/keys";
import { fetchConfig, probeServer } from "@/server-client/probe";
import { idbProfileStore as idbServerProfileStore, memoryProfileStore as memoryServerProfileStore, openServerDb, resolveServerUrl } from "@/server-client/profile";
import type { Retention } from "@/ai/retention";

export type PartnerParts = {
  profiles: ProfileStore;
  threads: ThreadStore;
  ledger: Ledger;
  ai: AiHost;
  caps: () => Caps;
  server: () => { ready: boolean; url: string | null };
  log: (row: AiLogRow) => Promise<void>;
  dispose(): void;
};

const EXPIRY_MARGIN_MS = 30_000;

/** The person's own server, if there is one: found once, then asked for a device token whenever the AI worker needs one. */
function serverAccess() {
  const persisted = typeof indexedDB !== "undefined";
  const keys = persisted ? idbKeyStore(openServerDb) : memoryKeyStore();
  const saved = persisted ? idbServerProfileStore(openServerDb) : memoryServerProfileStore();
  let found: { url: string; client: ServerClient } | null = null;
  let session: { token: string; expiresAt: number } | null = null;

  const lookup = (async () => {
    const config = await fetchConfig();
    const url = resolveServerUrl(config.ok ? config.config : null, await saved.read());
    if (!url || (await probeServer(url)).state !== "ready") return;
    found = { url, client: createClient({ base: url, keys, onSession: (next) => void (session = next) }) };
  })().catch(() => undefined);

  return {
    state: () => ({ ready: found !== null, url: found?.url ?? null }),
    relayUrl: () => found?.url ?? null,
    async token(): Promise<string | null> {
      await lookup;
      if (!found) return null;
      if (session && session.expiresAt - EXPIRY_MARGIN_MS > Date.now()) return session.token;
      try {
        return (await found.client.signIn()).token;
      } catch {
        return null;
      }
    },
  };
}

/** The stores, the ledger and the AI worker the partner needs. Where the browser will not open storage they live in memory for this tab. */
export async function openPartnerParts(retention: () => Retention): Promise<PartnerParts> {
  let db: IDBDatabase | null = null;
  try {
    db = await openDb();
  } catch (cause) {
    if (!(cause instanceof DbError)) throw cause;
  }
  const caps = () => DEFAULT_CAPS;
  const profiles = db ? idbProfileStore(db) : memoryProfileStore();
  const threads = db ? idbThreadStore(db, retention) : memoryThreadStore();
  const usage: UsageStore = db ? idbUsageStore(db) : memoryUsageStore();
  const channel = typeof BroadcastChannel === "undefined" ? undefined : new BroadcastChannel(CHANNEL_NAME);
  const ledger = createLedger({ store: usage, caps, now: Date.now, day: () => localDay(Date.now()), channel: channel as ChannelLike | undefined, random: Math.random });
  const access = serverAccess();
  const ai = createAiHost({ spawn: spawnAiWorker, token: access.token, relayUrl: access.relayUrl });

  return {
    profiles,
    threads,
    ledger,
    ai,
    caps,
    server: access.state,
    log: (row) => usage.recordCall(row),
    dispose() {
      ai.dispose();
      channel?.close();
      db?.close();
    },
  };
}
