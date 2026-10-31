import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import common from "../src/i18n/messages/en/common.json" with { type: "json" };
import shell from "../src/i18n/messages/en/shell.json" with { type: "json" };
import together from "../src/i18n/messages/en/together.json" with { type: "json" };

const LAST_BYTE = 256;
const RESERVED_PORTS = [3000, 43117];
const HEALTH_TIMEOUT_MS = 15_000;
const EXIT_TIMEOUT_MS = 10_000;
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

// What the web build lists in IYNK_CONNECT_ORIGINS, so its CSP names the e2e server and the dead port.
export function connectOrigins(): string[] {
  const { E2E_SERVER_PORT, E2E_DEAD_PORT } = process.env;
  return [`http://localhost:${E2E_SERVER_PORT}`, `http://localhost:${E2E_DEAD_PORT}`];
}

export function serverUrl(): string {
  return `http://localhost:${process.env.E2E_SERVER_PORT}`;
}

function runCli(command: "init" | "enrol", env: Record<string, string> = serverEnv()): { link: string; code: string } {
  const { IYNK_SERVER_TOKEN: _removed, ...inherited } = process.env;
  const out = execFileSync(process.execPath, ["server/bin/iynk-server.ts", command, "--json"], {
    env: { ...inherited, ...env },
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

export type SpawnedServer = {
  url: string;
  port: number;
  dataDir: string;
  readonly pid: number;
  stop(): Promise<void>;
  kill(): Promise<void>;
  restart(): Promise<void>;
  enrolCode(): Promise<string>;
};

function canBind(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const probe = createServer();
    probe.once("error", () => resolve(false));
    probe.listen(port, "127.0.0.1", () => probe.close(() => resolve(true)));
  });
}

async function freePort(): Promise<number> {
  const taken = [...RESERVED_PORTS, ...["E2E_PORT", "E2E_SERVER_PORT", "E2E_DEAD_PORT"].map((name) => Number(process.env[name]))];
  for (;;) {
    const port = 40000 + Math.floor(Math.random() * 10000);
    if (!taken.includes(port) && (await canBind(port))) return port;
  }
}

async function waitForHealth(url: string, child: ChildProcess): Promise<void> {
  const deadline = Date.now() + HEALTH_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`the spawned server exited with ${child.exitCode}`);
    const up = await fetch(`${url}/healthz`).then((res) => res.ok, () => false);
    if (up) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("the spawned server never answered /healthz");
}

function exited(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("the spawned server did not exit")), EXIT_TIMEOUT_MS);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

// A server this test can kill and restart. Playwright owns the config-managed one, so a spec that
// needs a crash starts its own, on a free port, in its own data directory.
export async function spawnServer(options: { sync?: "full" | "normal"; env?: Record<string, string> } = {}): Promise<SpawnedServer> {
  const port = await freePort();
  const dataDir = mkdtempSync(join(tmpdir(), "iynk-e2e-spawn-"));
  const url = `http://localhost:${port}`;
  const env: Record<string, string> = {
    ...serverEnv(),
    IYNK_DATA_DIR: dataDir,
    IYNK_PUBLIC_URL: url,
    IYNK_PORT: String(port),
    ...(options.sync ? { IYNK_STORE_SYNC: options.sync } : {}),
    ...options.env,
  };
  let child: ChildProcess;
  let log = "";

  const start = async () => {
    const { IYNK_SERVER_TOKEN: _removed, ...inherited } = process.env;
    child = spawn(process.execPath, ["server/src/main.ts"], { env: { ...inherited, ...env }, stdio: ["ignore", "pipe", "pipe"] });
    child.stdout?.on("data", (chunk: Buffer) => (log += chunk.toString()));
    child.stderr?.on("data", (chunk: Buffer) => (log += chunk.toString()));
    await waitForHealth(url, child);
  };
  const end = async (signal: NodeJS.Signals) => {
    if (child.exitCode === null && child.signalCode === null) child.kill(signal);
    await exited(child);
  };

  await start();
  return {
    url,
    port,
    dataDir,
    get pid() {
      return child.pid ?? 0;
    },
    async stop() {
      await end("SIGTERM");
      const info = test.info();
      if (log && info.status !== info.expectedStatus) await info.attach("iynk-server.log", { body: log, contentType: "text/plain" });
      rmSync(dataDir, { recursive: true, force: true });
    },
    kill: () => end("SIGKILL"),
    async restart() {
      await end("SIGKILL");
      await start();
    },
    enrolCode: async () => runCli("enrol", env).code,
  };
}

// Points this browser at the server in the Settings panel, then joins it from the Buddies page.
export async function connectBrowser(page: Page, serverUrl: string, enrolCode: string, displayName: string): Promise<void> {
  const enrol = together.buddies.enrol;
  await page.goto("/en/together");
  await page.getByRole("button", { name: shell.settings.label }).click();
  const panel = page.getByRole("dialog", { name: shell.settings.label });
  await panel.getByLabel(common.client.server.address).fill(serverUrl);
  await panel.getByRole("button", { name: common.client.keys.save }).click();
  await expect(panel.getByText(common.client.server.status.needsEnrol)).toBeVisible();
  await page.keyboard.press("Escape");

  await page.getByLabel(enrol.code).fill(enrolCode);
  await page.getByLabel(enrol.name).fill(displayName);
  await page.getByRole("region", { name: together.buddies.title }).getByRole("button", { name: enrol.submit }).click();
  await expect(page.getByText(together.buddies.empty.title)).toBeVisible();
}

// Both pages must be connected with empty buddy lists: the pairing buttons are the empty state's.
export async function pairBrowsers(a: Page, b: Page): Promise<void> {
  const pair = together.buddies.pair;
  const buddies = (page: Page) => page.getByRole("region", { name: together.buddies.title });
  const close = (page: Page) => page.getByRole("dialog").getByRole("button", { name: together.bar.close }).first().click();

  await buddies(a).getByRole("button", { name: together.buddies.empty.add }).click();
  const code = (await a.getByRole("dialog").getByTestId("pair-code").textContent()) ?? "";
  expect(code).toMatch(/^[0-9A-Z]{4}-[0-9A-Z]{6}$/);

  await buddies(b).getByRole("button", { name: together.buddies.empty.enter }).click();
  await b.getByRole("dialog").getByLabel(pair.enterLabel).fill(code);
  await b.getByRole("dialog").getByRole("button", { name: together.buddies.empty.enter }).click();
  await b.getByRole("button", { name: pair.accept }).click();
  const joined = new RegExp(`^${pair.joined.replace("{name}", ".+").replace(/\./g, "\\.")}$`);
  await expect(b.getByRole("dialog").getByText(joined)).toBeVisible();
  await close(b);
  await expect(a.getByRole("dialog").getByText(joined)).toBeVisible({ timeout: 10_000 });
  await close(a);
  await expect(buddies(a).getByRole("list")).toBeVisible();
  await expect(buddies(b).getByRole("list")).toBeVisible();
}
