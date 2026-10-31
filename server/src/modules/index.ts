import type { RouteDeps } from "../app.ts";
import { defineRoutes, type RouteDef } from "../http/classes.ts";
import { aiRoutes } from "./ai/routes.ts";
import { searchRoutes } from "./search/routes.ts";
import { loadCatalogueTools } from "./tools/catalogue.ts";
import { toolsOpenapi } from "./tools/openapi.ts";
import { registerTools, registeredTools } from "./tools/registry.ts";
import { toolsRoutes } from "./tools/routes.ts";

registerTools(await loadCatalogueTools());

export function moduleRoutes(ctx: RouteDeps): RouteDef[] {
  const siteUrl = ctx.config.publicUrl.origin;
  const openapi = defineRoutes([
    {
      method: "GET",
      path: "/v1/openapi.json",
      operation: "getToolsOpenapi",
      cls: "public",
      bucket: "public.read",
      handler: () => ({ status: 200, body: toolsOpenapi(registeredTools(), siteUrl) }),
    },
  ]);
  return [...aiRoutes(ctx), ...searchRoutes(ctx), ...toolsRoutes(ctx), ...openapi];
}
