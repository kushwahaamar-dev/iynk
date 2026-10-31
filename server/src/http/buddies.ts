import { parsePairingCode } from "../../../src/protocol/identity.ts";
import type { RouteDeps } from "../app.ts";
import { listBuddies } from "../buddies/list.ts";
import { createPairing, findPairing, listPairings, redeem, revokePairing, strike, type PairingRef } from "../buddies/pairing.ts";
import { removeBuddy, setAlias, visibleBuddy } from "../buddies/visibility.ts";
import { badField, iso, readObject, readText } from "./auth.ts";
import { defineRoutes, type Ctx, type Reply, type RouteDef } from "./classes.ts";
import { ApiError } from "./errors.ts";

const MAX_BODY_BYTES = 8 * 1024;
const MIN_FAILURE_MS = 200;
const LABEL_MAX = 60;
const TTL_MIN = 300;
const TTL_MAX = 604_800;
const LINK_TOKEN = /^[A-Za-z0-9_-]{22}$/;
const CODE_MAX = 32;
// control, zero-width and bidi override characters, as the display-name cleaner strips them
// eslint-disable-next-line no-control-regex
const LABEL_JUNK = /[\u0000-\u001f\u007f-\u009f​‎‏‪-‮⁦-⁩﻿]/g;

const notFound = (): ApiError => new ApiError(404, "not_found", "Not found.");

function readClean(fields: Record<string, unknown>, key: string): string | undefined {
  const raw = readText(fields, key, undefined, LABEL_MAX * 4);
  if (raw === undefined) return undefined;
  const text = raw.replace(LABEL_JUNK, "").replace(/\s+/g, " ").trim();
  if (Array.from(text).length > LABEL_MAX) throw badField(`/${key}`, "Use at most 60 characters.");
  return text;
}

const readLabel = (fields: Record<string, unknown>): string | undefined => readClean(fields, "label") || undefined;

function readTtl(fields: Record<string, unknown>): number | undefined {
  const ttl = fields["ttlSeconds"];
  if (ttl === undefined) return undefined;
  if (typeof ttl !== "number" || !Number.isInteger(ttl) || ttl < TTL_MIN || ttl > TTL_MAX) {
    throw badField("/ttlSeconds", `Use a whole number of seconds from ${TTL_MIN} to ${TTL_MAX}.`);
  }
  return ttl;
}

function readRef(value: unknown): PairingRef {
  const fields = readObject(value, ["token", "code"], []);
  const token = readText(fields, "token", LINK_TOKEN);
  const code = readText(fields, "code", undefined, CODE_MAX);
  if ((token === undefined) === (code === undefined)) throw badField("", "Send either token or code.");
  if (token !== undefined) return { token };
  if (parsePairingCode(code as string) === null) throw badField("/code", "This value has the wrong shape.");
  return { code: code as string };
}

export function buddyRoutes(ctx: RouteDeps): RouteDef[] {
  const { store, deps, config, log } = ctx;

  /** Every failed lookup costs the caller the same time, whatever the reason. */
  const fail = async (c: Ctx, ref: PairingRef, started: number): Promise<never> => {
    if ("code" in ref) {
      const channel = (parsePairingCode(ref.code) as NonNullable<ReturnType<typeof parsePairingCode>>).channel;
      const deleted = store.transaction((tx) => strike(tx, channel));
      log.info("pairing_strike", { dev: c.authed?.deviceId });
      if (deleted) log.warn("pairing_code_deleted", { ip: c.address });
    }
    await deps.sleep(Math.max(0, MIN_FAILURE_MS - (deps.clock.now() - started)));
    throw notFound();
  };

  const create = (c: Ctx): Reply => {
    const creator = c.authed as NonNullable<Ctx["authed"]>;
    const fields = readObject(c.body ?? {}, ["label", "ttlSeconds"], []);
    const label = readLabel(fields);
    const ttlSeconds = readTtl(fields);
    const made = store.transaction((tx) =>
      createPairing(tx, deps, creator, { ...(label !== undefined && { label }), ...(ttlSeconds !== undefined && { ttlSeconds }) }),
    );
    log.info("pairing_created", { dev: creator.deviceId, pairing: made.id });
    return {
      status: 201,
      body: {
        id: made.id,
        ...(label === undefined ? {} : { label }),
        from: creator.identityId,
        status: "open",
        createdAt: iso(made.createdAt),
        expiresAt: iso(made.expiresAt),
        codeExpiresAt: iso(made.codeExpiresAt),
        redeemedAt: null,
        redeemedBy: null,
        token: made.token,
        url: `${config.publicUrl.origin}/together#/pair/${made.token}`,
        code: made.code,
      },
    };
  };

  const list = (c: Ctx): Reply => {
    const me = c.authed as NonNullable<Ctx["authed"]>;
    const now = deps.clock.now();
    const items = store.read((tx) => listPairings(tx, me, now)).map((item) => ({
      id: item.id,
      ...(item.label === null ? {} : { label: item.label }),
      from: item.from,
      status: item.status,
      createdAt: iso(item.createdAt),
      expiresAt: iso(item.expiresAt),
      codeExpiresAt: item.codeExpiresAt === null ? null : iso(item.codeExpiresAt),
      redeemedAt: item.redeemedAt === null ? null : iso(item.redeemedAt),
      redeemedBy: item.redeemedBy,
    }));
    return { status: 200, body: { items, nextCursor: null } };
  };

  const revoke = (c: Ctx): Reply => {
    const { deviceId } = c.authed as NonNullable<Ctx["authed"]>;
    const revoked = store.transaction((tx) => revokePairing(tx, deviceId, c.params["pairingId"] as string, deps.clock.now()));
    if (!revoked) throw notFound();
    return { status: 204 };
  };

  const peek = async (c: Ctx): Promise<Reply> => {
    const started = deps.clock.now();
    const ref = readRef(c.body);
    const found = store.read((tx) => findPairing(tx, ref, started));
    if (!found) return fail(c, ref, started);
    return {
      status: 200,
      body: {
        from: { displayName: found.creatorName, ...(found.creatorColor === null ? {} : { color: found.creatorColor }) },
        expiresAt: iso("code" in ref ? (found.codeExpiresAt as number) : found.expiresAt),
      },
    };
  };

  const redeemRoute = async (c: Ctx): Promise<Reply> => {
    const started = deps.clock.now();
    const me = c.authed as NonNullable<Ctx["authed"]>;
    const fields = readObject(c.body, ["pairing"], ["pairing"]);
    const ref = readRef(fields["pairing"]);
    const result = store.transaction((tx) => redeem(tx, deps, me, ref));
    if (result === "gone") return fail(c, ref, started);
    if (result === "self" || result === "already") throw new ApiError(409, "already_paired", "You are already paired with this person.");
    if (result === "quota") throw new ApiError(409, "quota", "One of you has reached the buddy limit.");
    log.info("pairing_redeemed", { dev: me.deviceId, buddy: result.buddy.deviceId });
    return { status: 200, body: result };
  };

  const buddies = (c: Ctx): Reply => {
    const { deviceId } = c.authed as NonNullable<Ctx["authed"]>;
    return { status: 200, body: { items: store.read((tx) => listBuddies(tx, deviceId, deps.clock.now())), nextCursor: null } };
  };

  const getBuddy = (c: Ctx): Reply => {
    const me = c.authed as NonNullable<Ctx["authed"]>;
    const buddy = store.read((tx) => visibleBuddy(tx, me, c.params["identityId"] as string, deps.clock.now()));
    if (!buddy) throw notFound();
    return { status: 200, body: buddy };
  };

  const updateBuddy = (c: Ctx): Reply => {
    const me = c.authed as NonNullable<Ctx["authed"]>;
    const fields = readObject(c.body, ["alias"], ["alias"]);
    const alias = readClean(fields, "alias") || null;
    const buddy = store.transaction((tx) => setAlias(tx, me, c.params["identityId"] as string, alias, deps.clock.now()));
    if (!buddy) throw notFound();
    return { status: 200, body: buddy };
  };

  const dropBuddy = (c: Ctx): Reply => {
    const me = c.authed as NonNullable<Ctx["authed"]>;
    const { removed, after } = store.transaction((tx) => removeBuddy(tx, me, c.params["identityId"] as string, ctx.buddyRemoval));
    if (removed) log.info("buddy_removed");
    try {
      after?.();
    } catch (error) {
      log.error("buddy_removal_after_failed", { error: error instanceof Error ? error.message : String(error) });
    }
    return { status: 204 };
  };

  return defineRoutes([
    { method: "POST", path: "/v1/pairings", operation: "createPairing", cls: "device", bucket: "pairing.create", maxBodyBytes: MAX_BODY_BYTES, handler: create },
    { method: "GET", path: "/v1/pairings", operation: "listPairings", cls: "device", bucket: "read", handler: list },
    { method: "DELETE", path: "/v1/pairings/{pairingId}", operation: "revokePairing", cls: "device", bucket: "write", handler: revoke },
    { method: "POST", path: "/v1/pairings/peek", operation: "peekPairing", cls: "capability", bucket: "pairing.guess", maxBodyBytes: MAX_BODY_BYTES, handler: peek },
    { method: "POST", path: "/v1/pairings/redeem", operation: "redeemPairing", cls: "device", bucket: "pairing.guess", maxBodyBytes: MAX_BODY_BYTES, handler: redeemRoute },
    { method: "GET", path: "/v1/buddies", operation: "listBuddies", cls: "device", bucket: "read", handler: buddies },
    { method: "GET", path: "/v1/buddies/{identityId}", operation: "getBuddy", cls: "device", bucket: "read", handler: getBuddy },
    { method: "PATCH", path: "/v1/buddies/{identityId}", operation: "updateBuddy", cls: "device", bucket: "write", maxBodyBytes: MAX_BODY_BYTES, handler: updateBuddy },
    { method: "DELETE", path: "/v1/buddies/{identityId}", operation: "removeBuddy", cls: "device", bucket: "write", handler: dropBuddy },
  ]);
}
