// The /api/ai/* shapes (HX-CONTRACT H4) the partner uses, from hx:server-ai's
// types module (types only, so nothing server-side reaches the client).

export type {
  ApiErrorBody,
  ChatEvent,
  ChatMessage,
  ChatPeer,
  ChatRequest,
  TranscribeResponse,
} from "@/lib/server/ai/types";
