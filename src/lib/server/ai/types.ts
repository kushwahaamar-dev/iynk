// Request, response and event shapes of /api/ai/* (HX-CONTRACT H4).
// Types only and no "server-only": client code imports them with `import type`.

import type { LabKind } from "@/components/dock/types";
import type { Locale } from "@/i18n/config";

export type AiProvider = "meta" | "gemini";

/** A tool call as the client sees it: `args` is the parsed JSON object. */
export type ChatToolCall = { id: string; name: string; args: unknown };

export type ChatMessage =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; tool_calls?: ChatToolCall[] }
  | { role: "tool"; content: string; tool_call_id: string };

/** `done` holds progress keys (D7), so the partner can send the learner to someone who passed. */
export type ChatPeer = { id: string; name: string; lang: Locale; done: string[] };

export type ChatRequest = {
  messages: ChatMessage[];
  lab?: LabKind;
  itemId?: string;
  /** A compact description of the bench (netlist, code, serial tail, faults), at most 12 KB. */
  bench?: string;
  locale: Locale;
  peers?: ChatPeer[];
};

export type ChatUsage = { provider: AiProvider; inTokens: number; outTokens: number };

/** Error codes a chat stream can end with. */
export type ChatErrorCode = "not_configured" | "upstream_failed" | "upstream_timeout" | "upstream_busy" | "internal";

/** One `data:` line of the /api/ai/chat event stream. */
export type ChatEvent =
  | { type: "text"; delta: string }
  | { type: "tool_call"; id: string; name: string; args: unknown }
  | { type: "citation"; url: string; title: string; snippet: string }
  | { type: "done"; usage: ChatUsage }
  | { type: "error"; code: ChatErrorCode };

export type TranslateRequest = { texts: string[]; to: Locale; from?: Locale };
/** `from` is the source language: the one asked for, else the one detected (`und` when it is none of ours). */
export type TranslateResponse = { texts: string[]; from: Locale | "und" };

export type TranscribeResponse = { text: string; lang: Locale };

export type StoryEvent = { t: number; who: string; kind: string; text: string };

export type StoryRequest = {
  lab: LabKind;
  itemId: string;
  locale: Locale;
  peers: Array<{ name: string; lang: Locale }>;
  events: StoryEvent[];
};

export type StoryResponse = { title: string; story: string; highlights: string[]; imagePrompt: string };

export type ImageRequest = { prompt: string; style: "colorfigures" };
/** A `data:image/...;base64,` URL. */
export type ImageResponse = { image: string };

export type Level = "new" | "some" | "lots";

export type PlanRequest = {
  locale: Locale;
  participants: Array<{ name: string; lang: Locale; level: Level; wants: string }>;
  messages?: Array<{ who: string; text: string }>;
};

export type PlanResponse = {
  title: string;
  item: { lab: LabKind; id: string };
  why: string;
  roles: Array<{ name: string; role: string; firstTask: string }>;
  steps: string[];
  parts?: string[];
};

/** A buddy-pool profile. It holds no contact data; people connect by room invite. */
export type Profile = { id: string; name: string; lang: Locale; interests: string[]; built: string[]; wants: string };

export type MatchRequest = { me: Profile; pool: Profile[] };

export type Match = {
  id: string;
  score: number;
  why: string;
  sharedInterest: string;
  suggestedProject: { lab: LabKind; id: string };
};

export type MatchResponse = { matches: Match[] };

export type ApiErrorBody = { error: { code: string; message: string } };
