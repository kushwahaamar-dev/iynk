import { connection } from "next/server";

// No `runtime` export: cacheComponents is on, and it rejects that config (nodejs is the default).

export async function GET() {
  // The config comes from this deployment's environment, so answer per request, never from the build.
  await connection();
  const server = process.env.IYNK_SERVER_URL;
  return Response.json({ server: server && URL.canParse(server) ? server : null, protocol: 1 }, { headers: { "cache-control": "no-store" } });
}
