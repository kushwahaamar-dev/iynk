import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { BrowserContext } from "@playwright/test";

const LAST_BYTE = 256;
let contexts = 0;

// The one definition of the e2e server's environment: the config starts the
// server with it and the enrolment commands below run against the same data.
export function serverEnv(): Record<string, string> {
  const { E2E_PORT, E2E_SERVER_PORT, E2E_SERVER_DATA } = process.env;
  return {
    IYNK_DATA_DIR: E2E_SERVER_DATA ?? "",
    IYNK_PUBLIC_URL: `http://localhost:${E2E_SERVER_PORT}`,
    IYNK_ALLOWED_ORIGINS: `http://localhost:${E2E_PORT}`,
    IYNK_HOST: "127.0.0.1",
    IYNK_PORT: E2E_SERVER_PORT ?? "",
    IYNK_ENROL: "code",
    IYNK_LOG_LEVEL: "warn",
    IYNK_TRUST_PROXY: "1",
  };
}

export function serverUrl(): string {
  return `http://localhost:${process.env.E2E_SERVER_PORT}`;
}

function runCli(command: "init" | "enrol"): { link: string; code: string } {
  const { IYNK_SERVER_TOKEN: _removed, ...inherited } = process.env;
  const out = execFileSync(process.execPath, ["server/bin/iynk-server.ts", command, "--json"], {
    env: { ...inherited, ...serverEnv() },
    encoding: "utf8",
  });
  const { link, code } = JSON.parse(out) as { link: string; code: string };
  return { link, code };
}

export function firstOwnerCode(): { link: string; code: string } {
  return runCli("init");
}

export function newEnrolmentCode(): { link: string; code: string } {
  return runCli("enrol");
}

// Every browser reaches the server from 127.0.0.1, so without this all contexts
// would share one rate-limit bucket. The server trusts the last forwarded
// address; a route continue sets it without a CORS preflight.
export async function distinctAddress(context: BrowserContext): Promise<void> {
  contexts += 1;
  const worker = Number(process.env.TEST_WORKER_INDEX ?? 0);
  const address = `10.${worker % LAST_BYTE}.${Math.floor(contexts / LAST_BYTE) % LAST_BYTE}.${contexts % LAST_BYTE}`;
  await context.route("**/v1/**", (route) => route.continue({ headers: { ...route.request().headers(), "x-forwarded-for": address } }));
}

export function stopServer(): void {
  const pid = Number(readFileSync(join(process.env.E2E_SERVER_DATA ?? "", "pid"), "utf8"));
  process.kill(pid, "SIGKILL");
}
