export const ROUTE_CLASSES = ["public", "capability", "device", "needs-user-key", "operator", "removed"] as const;
export type RouteClass = (typeof ROUTE_CLASSES)[number];

export const BUCKET_NAMES = [
  "public.read",
  "auth.challenge",
  "auth.token",
  "auth.token.identity",
  "identity.register",
  "pairing.create",
  "pairing.guess",
  "read",
  "write",
  "asset.write",
  "share.read",
  "room.write",
  "room.create",
  "room.invite.redeem",
  "room.read",
  "ai.relay",
  "search.web",
  "search.offers",
  "search.other",
  "tools",
] as const;
export type BucketName = (typeof BUCKET_NAMES)[number];

export type Authed = {
  deviceId: string;
  identityId: string;
  role: "owner" | "member";
  sessionId: string;
  name: string;
  deleting: boolean;
};

export type Ctx = {
  method: string;
  path: string;
  params: Record<string, string>;
  query: URLSearchParams;
  headers: Headers;
  body: unknown;
  raw?: Buffer;
  address: string;
  authed: Authed | null;
  requestId: string;
  signal: AbortSignal;
};

export type Reply = {
  status: number;
  body?: unknown;
  bytes?: Uint8Array;
  headers?: Record<string, string>;
  stream?: AsyncIterable<Uint8Array>;
  onFinish?: (info: { bytes: number; aborted: boolean }) => void;
};

export type RouteDef = {
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  path: string;
  operation: string;
  cls: RouteClass;
  bucket: BucketName;
  maxBodyBytes?: number;
  rawBody?: boolean;
  handler?: (ctx: Ctx) => Promise<Reply> | Reply;
};

export function defineRoutes(defs: RouteDef[]): RouteDef[] {
  const seen = new Set<string>();
  for (const def of defs) {
    const name = `${def.method} ${def.path}`;
    if (!ROUTE_CLASSES.includes(def.cls)) throw new Error(`Route ${name} has no valid class.`);
    if (!BUCKET_NAMES.includes(def.bucket)) throw new Error(`Route ${name} has no valid bucket.`);
    if (def.cls === "removed" && def.handler !== undefined) throw new Error(`Route ${name} is removed and must not have a handler.`);
    if (def.cls !== "removed" && def.handler === undefined) throw new Error(`Route ${name} has no handler.`);
    if (seen.has(name)) throw new Error(`Route ${name} is defined twice.`);
    seen.add(name);
  }
  return defs;
}
