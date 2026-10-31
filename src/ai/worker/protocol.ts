import type { ConformanceInput, ModelEvent, ModelRequest } from "../adapters/types.ts";

/** No message in either direction carries a provider key. */
export type HostToAi =
  | { t: "stream"; id: string; profileId: string; req: ModelRequest }
  | { t: "abort"; id: string }
  | { t: "probe"; id: string; profileId: string }
  | { t: "token"; token: string | null }
  | { t: "config"; relayUrl: string | null };

export type AiToHost =
  | { t: "event"; id: string; ev: ModelEvent }
  | { t: "end"; id: string }
  | { t: "probe"; id: string; result: ConformanceInput };
