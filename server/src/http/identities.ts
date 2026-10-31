import { cleanDisplayName, deriveDeviceId, isSpkiP256, fromBase64Url, keyThumbprint } from "../../../src/protocol/identity.ts";
import { verifySignature } from "../identity/challenge.ts";
import { getDevice, registerDevice, type DeviceRow } from "../identity/devices.ts";
import { redeemEnrolmentCode } from "../identity/enrol.ts";
import { mintToken } from "../identity/tokens.ts";
import type { Tx } from "../store/port.ts";
import { badField, clientHeader, CHALLENGE_ID, denied, iso, readObject, readText, SIGNATURE, type AuthRouteDeps } from "./auth.ts";
import { defineRoutes, type Ctx, type Reply, type RouteDef } from "./classes.ts";
import { ApiError } from "./errors.ts";

const PUBLIC_KEY = /^[A-Za-z0-9_-]{122}$/;
const LOCALE = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;
const COLOR = /^#[0-9a-fA-F]{6}$/;
const ENROLMENT_CODE = /^[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{4}-?[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{4}-?[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{4}$/;
const LINK_CODE = /^[A-Za-z0-9_-]{22}$/;

export function identityBody(device: DeviceRow) {
  return {
    id: device.identityId,
    deviceId: device.id,
    displayName: device.name,
    ...(device.color === null ? {} : { color: device.color }),
    locale: device.locale,
    keyThumbprint: device.thumbprint,
    showOnline: device.showOnline,
    showActivity: device.showActivity,
    createdAt: iso(device.createdAt),
    deletion: null,
  };
}

function cleanName(fields: Record<string, unknown>): string | undefined {
  const raw = readText(fields, "displayName");
  if (raw === undefined) return undefined;
  const name = cleanDisplayName(raw);
  if (name === null) throw badField("/displayName", "Use 1 to 24 visible characters.");
  return name;
}

/** Thrown inside the registration transaction so every write is rolled back. */
class Refusal extends Error {
  readonly outcome: "denied" | "exists" | "full";

  constructor(outcome: Refusal["outcome"]) {
    super(outcome);
    this.outcome = outcome;
  }
}

const UPDATABLE = {
  displayName: "name",
  color: "color",
  locale: "locale",
  showOnline: "show_online",
  showActivity: "show_activity",
} as const;

export function identityRoutes(ctx: AuthRouteDeps): RouteDef[] {
  const { store, deps, config, challenges, log } = ctx;

  const registerIdentity = (c: Ctx): Reply => {
    const fields = readObject(
      c.body,
      ["challengeId", "signature", "publicKey", "displayName", "locale", "color", "enrollmentCode"],
      ["challengeId", "signature", "publicKey", "displayName"],
    );
    const challengeId = readText(fields, "challengeId", CHALLENGE_ID, 72) as string;
    const signature = readText(fields, "signature", SIGNATURE) as string;
    const publicKey = readText(fields, "publicKey", PUBLIC_KEY) as string;
    const spki = fromBase64Url(publicKey);
    if (!spki || !isSpkiP256(spki)) throw badField("/publicKey", "This is not a P-256 public key.");
    const displayName = cleanName(fields) as string;
    const locale = readText(fields, "locale", LOCALE, 35);
    const color = readText(fields, "color", COLOR);
    const code = readText(fields, "enrollmentCode");
    if (code !== undefined && !ENROLMENT_CODE.test(code) && !LINK_CODE.test(code)) throw badField("/enrollmentCode", "This value has the wrong shape.");

    const challenge = challenges.consume(challengeId);
    if (!challenge || challenge.purpose !== "register" || challenge.thumbprint !== keyThumbprint(spki)) return denied(c);
    if (!verifySignature(spki, challenge.signingInput, signature)) return denied(c);
    if (config.enrol !== "code" || code === undefined) return denied(c);

    try {
      const registered = store.transaction((tx) => enrol(tx, { spki, displayName, locale, color, code, client: clientHeader(c) }));
      log.info("enrolled", { device: registered.device.id });
      return { status: 201, body: registered.body };
    } catch (error) {
      if (!(error instanceof Refusal)) throw error;
      if (error.outcome === "exists") throw new ApiError(409, "already_exists", "This key is already enrolled.");
      if (error.outcome === "full") throw new ApiError(409, "quota", "This server has no room for more people.");
      return denied(c);
    }
  };

  const enrol = (tx: Tx, a: { spki: Uint8Array; displayName: string; locale: string | undefined; color: string | undefined; code: string; client: string | null }) => {
    const added = registerDevice(tx, deps, {
      spki: a.spki,
      displayName: a.displayName,
      maxIdentities: config.maxIdentities,
      ...(a.locale !== undefined && { locale: a.locale }),
      ...(a.color !== undefined && { color: a.color }),
    });
    if (added === "full") throw new Refusal("full");
    const deviceId = added === "exists" ? deriveDeviceId(a.spki) : added.deviceId;
    if (redeemEnrolmentCode(tx, a.code, deviceId, deps) === "invalid") throw new Refusal("denied");
    if (added === "exists") throw new Refusal("exists");
    const minted = mintToken(tx, deps, added.deviceId, config.tokenTtlMs, a.client);
    const device = getDevice(tx, added.deviceId) as DeviceRow;
    return {
      device,
      body: {
        identity: identityBody(device),
        accessToken: { token: minted.token, tokenType: "Bearer", identityId: device.identityId, sessionId: minted.sessionId, expiresAt: iso(minted.expiresAt) },
      },
    };
  };

  const getMyIdentity = (c: Ctx): Reply => {
    const { deviceId } = c.authed as NonNullable<Ctx["authed"]>;
    const device = store.read((tx) => getDevice(tx, deviceId));
    if (!device) throw new ApiError(404, "not_found", "Not found.");
    return { status: 200, body: identityBody(device) };
  };

  const updateMyIdentity = (c: Ctx): Reply => {
    const { deviceId } = c.authed as NonNullable<Ctx["authed"]>;
    const fields = readObject(c.body, Object.keys(UPDATABLE), []);
    if (Object.keys(fields).length === 0) throw badField("", "Send at least one field.");
    const values: Record<string, string | number> = {};
    const name = cleanName(fields);
    if (name !== undefined) values["name"] = name;
    const color = readText(fields, "color", COLOR);
    if (color !== undefined) values["color"] = color;
    const locale = readText(fields, "locale", LOCALE, 35);
    if (locale !== undefined) values["locale"] = locale;
    for (const key of ["showOnline", "showActivity"] as const) {
      if (fields[key] === undefined) continue;
      if (typeof fields[key] !== "boolean") throw badField(`/${key}`, "Send true or false.");
      values[UPDATABLE[key]] = fields[key] ? 1 : 0;
    }
    const columns = Object.keys(values);
    const device = store.transaction((tx) => {
      tx.run(`UPDATE devices SET ${columns.map((column) => `${column} = ?`).join(", ")} WHERE id = ?`, ...columns.map((column) => values[column] as string | number), deviceId);
      return getDevice(tx, deviceId);
    });
    if (!device) throw new ApiError(404, "not_found", "Not found.");
    return { status: 200, body: identityBody(device) };
  };

  return defineRoutes([
    { method: "POST", path: "/v1/identities", operation: "registerIdentity", cls: "capability", bucket: "identity.register", handler: registerIdentity },
    { method: "GET", path: "/v1/identities/me", operation: "getMyIdentity", cls: "device", bucket: "read", handler: getMyIdentity },
    { method: "PATCH", path: "/v1/identities/me", operation: "updateMyIdentity", cls: "device", bucket: "write", handler: updateMyIdentity },
  ]);
}
