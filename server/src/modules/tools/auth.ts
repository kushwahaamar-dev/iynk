import type { RouteDeps } from "../../app.ts";
import type { Ctx } from "../../http/classes.ts";
import { findToken } from "../../identity/api-tokens.ts";
import { touchSession, verifyToken } from "../../identity/tokens.ts";

export type McpAuth = { ok: true; who: { kind: "device"; deviceId: string } | { kind: "mcp" } } | { ok: false };

const MAX_TOKEN_LENGTH = 256;

/** A live session token or an unrevoked MCP key. Every failure takes the same path. */
export function authenticateMcp(ctx: Ctx, rd: RouteDeps): McpAuth {
  const bearer = /^Bearer (\S+)$/.exec(ctx.headers.get("authorization") ?? "");
  const token = bearer?.[1];
  if (token === undefined || token.length > MAX_TOKEN_LENGTH) return { ok: false };

  const { authed, touch } = rd.store.read((tx) => verifyToken(tx, rd.deps, token));
  if (authed) {
    if (touch) {
      try {
        rd.store.transaction((tx) => touchSession(tx, rd.deps, authed.sessionId));
      } catch {
        // a busy store never fails the request
      }
    }
    return { ok: true, who: { kind: "device", deviceId: authed.deviceId } };
  }

  const found = rd.store.read((tx) => findToken(tx, token, rd.deps.clock.now()));
  return found?.kind === "mcp" ? { ok: true, who: { kind: "mcp" } } : { ok: false };
}
