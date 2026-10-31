import { defineRoutes, type Reply, type RouteDef } from "./classes.ts";
import type { RouteDeps } from "../app.ts";

export const PROJECT_SCHEMAS = ["1.1"];

export function serverInfoRoutes(ctx: RouteDeps): RouteDef[] {
  const { config, compile } = ctx;
  const body = {
    audience: config.audience,
    name: config.serverName,
    software: { name: "iynk-server" },
    apiVersions: [1],
    apiVersion: "1.0",
    schemas: { project: PROJECT_SCHEMAS, component: [1], opSchema: "1.1" },
    minClient: config.minClient,
    enrollment: config.enrol,
    features: {
      identities: true,
      buddies: true,
      shares: false,
      rooms: false,
      assets: false,
      aiRelay: false,
      searchProxy: false,
      tools: false,
    },
    limits: { documentBytes: 5_242_880, assetBytes: 16_777_216, peersPerRoom: 8, buddiesPerIdentity: 64 },
  };
  const info = (): Reply => ({ status: 200, body: { ...body, features: { ...body.features, compile: config.compile.enabled && compile.reachable() } } });
  return defineRoutes([{ method: "GET", path: "/v1/server", operation: "getServerInfo", cls: "public", bucket: "public.read", handler: info }]);
}
