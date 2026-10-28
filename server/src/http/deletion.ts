import type { RouteDeps } from "../app.ts";
import { cancelDeletion, purgeDue, requestDeletion } from "../identity/deletion.ts";
import { badField, iso, readObject, readText } from "./auth.ts";
import { defineRoutes, type Ctx, type Reply, type RouteDef } from "./classes.ts";
import { ApiError } from "./errors.ts";

const MAX_BODY_BYTES = 1024;

export function deletionRoutes(ctx: RouteDeps): RouteDef[] {
  const { store, deps, config, log } = ctx;

  const request = (c: Ctx): Reply => {
    const who = c.authed as NonNullable<Ctx["authed"]>;
    const fields = readObject(c.body, ["confirm"], ["confirm"]);
    if (readText(fields, "confirm") !== `delete ${who.name}`) throw badField("/confirm", `Type "delete ${who.name}" to confirm.`);
    const { status, requestedAt, effectiveAt } = store.transaction((tx) => {
      const scheduled = requestDeletion(tx, deps, who, config.deletionGraceHours);
      if (purgeDue(tx, deps.clock.now()) > 0) log.info("identity_deleted");
      return scheduled;
    });
    return { status: 202, body: { status, requestedAt: iso(requestedAt), effectiveAt: iso(effectiveAt) } };
  };

  const cancel = (c: Ctx): Reply => {
    const who = c.authed as NonNullable<Ctx["authed"]>;
    if (!store.transaction((tx) => cancelDeletion(tx, who))) throw new ApiError(404, "not_found", "Not found.");
    return { status: 204 };
  };

  return defineRoutes([
    { method: "POST", path: "/v1/identities/me/deletion", operation: "requestDeletion", cls: "device", bucket: "write", maxBodyBytes: MAX_BODY_BYTES, handler: request },
    { method: "DELETE", path: "/v1/identities/me/deletion", operation: "cancelDeletion", cls: "device", bucket: "write", handler: cancel },
  ]);
}
