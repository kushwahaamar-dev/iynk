import type { RouteDeps } from "../app.ts";
import { defineRoutes, type Ctx, type Reply, type RouteDef } from "../http/classes.ts";
import { ApiError } from "../http/errors.ts";
import { checkRequest } from "./runner.ts";

const KEY_PATTERN = /^[A-Za-z0-9_.:-]{1,128}$/;

const notFound = (): ApiError => new ApiError(404, "not_found", "Not found.");

export function compileRoutes(ctx: RouteDeps): RouteDef[] {
  const { config, compile, log } = ctx;

  const enabled = (): void => {
    if (config.compile.enabled) return;
    throw new ApiError(501, "feature_disabled", "Compiling is turned off on this server.", [
      { code: "feature_disabled", severity: "error", path: "features.compile", message: "The operator has not set IYNK_COMPILE_ENABLE=1." },
    ]);
  };

  const submit = async (c: Ctx): Promise<Reply> => {
    enabled();
    const { deviceId } = c.authed as NonNullable<Ctx["authed"]>;
    const key = c.headers.get("idempotency-key") ?? undefined;
    if (key !== undefined && !KEY_PATTERN.test(key)) throw new ApiError(400, "bad_request", "Idempotency-Key must be 1 to 128 letters, digits or _.:-");
    const checked = checkRequest(c.body);
    if (!checked.ok) throw new ApiError(checked.status, checked.code, checked.message);
    const job = await compile.submit(deviceId, checked.value, key);
    log.info("compile_submitted", { dev: deviceId, job: job.id, status: job.status, cacheHit: job.cacheHit });
    return { status: 202, body: job };
  };

  const read = (c: Ctx): Reply => {
    enabled();
    const { deviceId } = c.authed as NonNullable<Ctx["authed"]>;
    const job = compile.get(deviceId, c.params["jobId"] as string);
    if (job === null) throw notFound();
    return { status: 200, body: job, headers: job.status === "queued" || job.status === "running" ? { "retry-after": "1" } : {} };
  };

  const artifact = (c: Ctx): Reply => {
    enabled();
    const { deviceId } = c.authed as NonNullable<Ctx["authed"]>;
    const kind = c.query.get("kind") ?? "hex";
    if (kind !== "hex" && kind !== "elf") throw new ApiError(400, "bad_request", "kind is hex or elf.");
    const found = compile.artifact(deviceId, c.params["jobId"] as string, kind);
    if (found === null) throw notFound();
    const body =
      kind === "hex"
        ? { mediaType: found.mediaType, encoding: "text", data: Buffer.from(found.bytes).toString("ascii") }
        : { mediaType: found.mediaType, encoding: "base64", data: Buffer.from(found.bytes).toString("base64") };
    return { status: 200, body, headers: { "cache-control": "private, no-store" } };
  };

  return defineRoutes([
    { method: "POST", path: "/v1/compile/jobs", operation: "createCompileJob", cls: "device", bucket: "compile", handler: submit },
    { method: "GET", path: "/v1/compile/jobs/{jobId}", operation: "getCompileJob", cls: "device", bucket: "read", handler: read },
    { method: "GET", path: "/v1/compile/jobs/{jobId}/artifact", operation: "getCompileArtifact", cls: "device", bucket: "read", handler: artifact },
  ]);
}
