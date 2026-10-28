import { connection } from "next/server";
import { env, features } from "@/lib/server/env";

// No `runtime` export: cacheComponents is on, and it rejects that config (nodejs is the default).

export async function GET() {
  // The config comes from this deployment's environment, so answer per request, never from the build.
  await connection();
  return Response.json(
    {
      server: env.IYNK_SERVER_URL ?? null,
      protocol: 1,
      modules: { ai: features.ai, search: features.search, voice: features.voice },
    },
    { headers: { "cache-control": "no-store" } },
  );
}
