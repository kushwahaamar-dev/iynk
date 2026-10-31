import type { RouteDeps } from "../app.ts";
import type { RouteDef } from "../http/classes.ts";
import { aiRoutes } from "./ai/routes.ts";

export function moduleRoutes(ctx: RouteDeps): RouteDef[] {
  return [...aiRoutes(ctx)];
}
