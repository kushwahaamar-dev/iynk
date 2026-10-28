import { readSecret, type KeyKind } from "./store";

export const PROVIDER_KEY_HEADER = "X-Iynk-Provider-Key";
export const SERVER_TOKEN_HEADER = "X-Iynk-Server-Token";

function withAuth(kind: Exclude<KeyKind, "server">, init?: HeadersInit): Headers | null {
  const key = readSecret(kind);
  if (key === null) return null;
  const headers = new Headers(init);
  headers.set(PROVIDER_KEY_HEADER, key);
  const token = readSecret("server");
  if (token !== null) headers.set(SERVER_TOKEN_HEADER, token);
  return headers;
}

/** `init` plus the AI key and, when set, the server token; null when no AI key is set. */
export const withAiAuth = (init?: HeadersInit): Headers | null => withAuth("ai", init);

/** `init` plus the search key and, when set, the server token; null when no search key is set. */
export const withSearchAuth = (init?: HeadersInit): Headers | null => withAuth("search", init);
