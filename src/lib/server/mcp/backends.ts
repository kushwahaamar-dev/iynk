import "server-only";
import type { z } from "zod";
import { env } from "@/lib/server/env";
import { withTimeout } from "@/lib/server/http";
import { ToolError } from "./registry";

async function errorMessage(res: Response): Promise<string | undefined> {
  try {
    const body = (await res.json()) as { error?: { message?: unknown } };
    return typeof body.error?.message === "string" ? body.error.message.slice(0, 300) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * One of iynk's own JSON routes as a tool calls it, so the tool inherits the route's validation, quota guard
 * and "not set up" answer. The base URL is NEXT_PUBLIC_SITE_URL, never the request's Host header, so a caller
 * cannot point the call elsewhere. Only plan_build_night still needs this (docs/requests/hx-mcp.md).
 */
export async function postRoute<S extends z.ZodType>(name: string, path: string, schema: S, body: unknown, timeoutMs: number): Promise<z.output<S>> {
  let res: Response;
  try {
    res = await fetch(new URL(path, env.NEXT_PUBLIC_SITE_URL), {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: withTimeout(timeoutMs),
      cache: "no-store",
    });
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "TimeoutError";
    throw new ToolError("upstream", `${name} ${timedOut ? "took too long to answer" : "could not be reached"}. Try again in a moment.`);
  }
  if (!res.ok) {
    const detail = await errorMessage(res);
    if (res.status === 503) throw new ToolError("not_configured", `${name} is not set up on this deployment.`);
    if (res.status === 429) throw new ToolError("rate_limited", `${name} is busy (rate limited). Wait a minute before trying again.`);
    if (res.status === 400) throw new ToolError("bad_input", detail ?? `${name} did not accept the request.`);
    // A 404 that is not our JSON error means the route itself is missing from this deployment.
    if (res.status === 404) {
      if (detail === undefined) throw new ToolError("not_configured", `${name} is not set up on this deployment.`);
      throw new ToolError("not_found", detail);
    }
    throw new ToolError("upstream", `${name} failed (HTTP ${res.status}). Try again in a moment.`);
  }
  const parsed = schema.safeParse(await res.json().catch(() => undefined));
  if (!parsed.success) throw new ToolError("upstream", `${name} sent an answer iynk could not read.`);
  return parsed.data;
}
