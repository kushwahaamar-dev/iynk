// The /api/ai/* shapes (HX-CONTRACT H4) the partner uses, from hx:server-ai's
// types module (types only, so nothing server-side reaches the client).

export type {
  ApiErrorBody,
  ChatEvent,
  ChatMessage,
  ChatPeer,
  ChatRequest,
  ImageResponse,
  StoryRequest,
  StoryResponse,
  TranscribeResponse,
} from "@/lib/server/ai/types";

import type { StoryEvent as ServerStoryEvent } from "@/lib/server/ai/types";

/** What a session-log line is about; the story route takes any string here. */
export type StoryEventKind = "action" | "chat" | "ai" | "fault" | "pass" | "join" | "help";

export type StoryEvent = ServerStoryEvent & { kind: StoryEventKind };
