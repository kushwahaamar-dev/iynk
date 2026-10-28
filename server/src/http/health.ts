import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { RouteDeps } from "../app.ts";
import { defineRoutes, type Reply, type RouteDef } from "./classes.ts";

const MIGRATIONS_DIR = fileURLToPath(new URL("../../migrations", import.meta.url));

function latestMigration(): number {
  const versions = readdirSync(MIGRATIONS_DIR).flatMap((entry) => {
    const match = /^(\d{4})_.+\.sql$/.exec(entry);
    return match ? [Number(match[1])] : [];
  });
  return Math.max(0, ...versions);
}

export function healthRoutes(ctx: RouteDeps): RouteDef[] {
  const latest = latestMigration();

  const storeWorks = (requireCurrent: boolean): boolean => {
    try {
      return ctx.store.ping() && (!requireCurrent || ctx.store.schemaVersion() >= latest);
    } catch {
      return false;
    }
  };

  const answer = (requireCurrent: boolean): Reply => {
    const draining = ctx.app.draining();
    const store = storeWorks(requireCurrent);
    const ok = store && !draining;
    return { status: ok ? 200 : 503, body: { ok, draining, store: store ? "ok" : "error" } };
  };

  const probe = (path: string, operation: string, requireCurrent: boolean): RouteDef => ({
    method: "GET",
    path,
    operation,
    cls: "public",
    bucket: "public.read",
    handler: () => answer(requireCurrent),
  });

  return defineRoutes([
    probe("/v1/healthz", "getHealth", false),
    probe("/healthz", "getHealth", false),
    probe("/v1/readyz", "getReadiness", true),
    probe("/readyz", "getReadiness", true),
  ]);
}
