import { serveWorker } from "../../protocol/index.ts";
import type { WorkerScopeLike } from "../../protocol/index.ts";
import { DbError, openDb } from "../../local/db.ts";
import { idbProfileStore, memoryProfileStore } from "../../local/ai-profiles.ts";
import { idbSecretReader } from "../custody.ts";
import { createAiHandler } from "./handler.ts";
import type { AiToHost, HostToAi } from "./protocol.ts";

async function openHandler() {
  const fetchNow: typeof fetch = (input, init) => fetch(input, init);
  try {
    const db = await openDb();
    return createAiHandler({ store: idbProfileStore(db), secrets: idbSecretReader(db), fetch: fetchNow, browser: true });
  } catch (cause) {
    if (!(cause instanceof DbError) || cause.kind !== "unavailable") throw cause;
    // Without storage the worker cannot see the page's profiles, so every call answers not_configured.
    return createAiHandler({ store: memoryProfileStore(), secrets: async () => null, fetch: fetchNow, browser: true });
  }
}

// The listener goes up at once so a request posted while the database opens is not lost.
const handler = openHandler();

serveWorker<HostToAi, AiToHost>(self as unknown as WorkerScopeLike, async (msg, emit) => (await handler)(msg, emit));
