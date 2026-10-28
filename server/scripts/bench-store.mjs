import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { realDeps } from "../src/deps.ts";
import { openStore } from "../src/store/sqlite.ts";

const MIGRATIONS_DIR = fileURLToPath(new URL("../migrations", import.meta.url));
const SELF = fileURLToPath(import.meta.url);

const { values } = parseArgs({
  options: {
    cycles: { type: "string", default: "50" },
    sync: { type: "string", default: "full" },
    rate: { type: "string", default: "400" },
    duration: { type: "string", default: "5" },
    child: { type: "boolean", default: false },
    db: { type: "string" },
    start: { type: "string", default: "1" },
  },
});

const sync = values.sync;
const rate = Number(values.rate);
const duration = Number(values.duration);
const cycles = Number(values.cycles);

if (sync !== "full" && sync !== "normal") fail("--sync must be full or normal");
if (![rate, duration, cycles].every((n) => Number.isFinite(n) && n > 0)) fail("--cycles, --rate and --duration must be positive numbers");

function fail(message) {
  console.error(message);
  process.exit(2);
}

function open(path) {
  return openStore(
    { path, sync, migrationsDir: MIGRATIONS_DIR, backupsDir: join(path, "..", "backups"), serverVersion: "bench" },
    realDeps(),
  );
}

function checksum(payload) {
  return createHash("sha256").update(payload).digest("hex");
}

const CREATE = "CREATE TABLE IF NOT EXISTS bench_log (n INTEGER PRIMARY KEY, payload TEXT NOT NULL, checksum TEXT NOT NULL)";

function runChild() {
  const store = open(values.db);
  store.transaction((tx) => tx.run(CREATE));
  const gap = 1000 / rate;
  const t0 = performance.now();
  let n = Number(values.start);
  let sent = 0;
  const tick = () => {
    const payload = randomBytes(64).toString("hex");
    const before = performance.now();
    store.transaction((tx) => tx.run("INSERT INTO bench_log (n, payload, checksum) VALUES (?, ?, ?)", n, payload, checksum(payload)));
    const ms = performance.now() - before;
    process.stdout.write(`ack ${n} ${ms.toFixed(3)}\n`);
    n += 1;
    sent += 1;
    setTimeout(tick, Math.max(0, t0 + sent * gap - performance.now()));
  };
  tick();
}

function percentile(sorted, p) {
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

async function killedCycle(dbPath, start) {
  const child = spawn(
    process.execPath,
    ["--disable-warning=ExperimentalWarning", SELF, "--child", "--db", dbPath, "--sync", sync, "--rate", String(rate), "--duration", String(duration), "--start", String(start)],
    { stdio: ["ignore", "pipe", "inherit"] },
  );
  const acked = [];
  const latencies = [];
  const lines = createInterface({ input: child.stdout });
  lines.on("line", (line) => {
    const [, n, ms] = line.split(" ");
    acked.push(Number(n));
    latencies.push(Number(ms));
  });
  const drained = new Promise((resolve) => lines.once("close", resolve));
  const killAfter = duration * 1000 * (0.25 + Math.random() * 0.65);
  setTimeout(() => child.kill("SIGKILL"), killAfter);
  await drained;
  return { acked, latencies };
}

function verify(dbPath, acked) {
  const store = open(dbPath);
  try {
    const integrity = store.integrityCheck();
    const rows = store.read((tx) => tx.all("SELECT n, payload, checksum FROM bench_log"));
    const present = new Set(rows.map((row) => row.n));
    const torn = rows.filter((row) => checksum(row.payload) !== row.checksum).length;
    const lost = acked.filter((n) => !present.has(n)).length;
    return { integrity, torn, lost, maxN: rows.reduce((max, row) => Math.max(max, row.n), 0) };
  } finally {
    store.close();
  }
}

async function main() {
  const dir = mkdtempSync(join(tmpdir(), "iynk-bench-"));
  const dbPath = join(dir, "iynk.db");
  const latencies = [];
  let totalAcked = 0;
  let totalLost = 0;
  let totalTorn = 0;
  let integrityFailures = 0;
  let start = 1;
  console.log(`store sync=${sync} rate=${rate}/s duration=${duration}s cycles=${cycles}`);
  console.log("cycle  acked  lost  torn  integrity");
  try {
    for (let cycle = 1; cycle <= cycles; cycle += 1) {
      const { acked, latencies: cycleLatencies } = await killedCycle(dbPath, start);
      const result = verify(dbPath, acked);
      start = result.maxN + 1;
      latencies.push(...cycleLatencies);
      totalAcked += acked.length;
      totalLost += result.lost;
      totalTorn += result.torn;
      if (result.integrity !== "ok") integrityFailures += 1;
      console.log(`${String(cycle).padStart(5)}  ${String(acked.length).padStart(5)}  ${String(result.lost).padStart(4)}  ${String(result.torn).padStart(4)}  ${result.integrity}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  latencies.sort((a, b) => a - b);
  if (latencies.length > 0) {
    console.log(
      `commit latency ms: p50 ${percentile(latencies, 50).toFixed(3)}  p99 ${percentile(latencies, 99).toFixed(3)}  max ${latencies[latencies.length - 1].toFixed(3)}  (${latencies.length} commits)`,
    );
  }
  console.log(`acknowledged writes: ${totalAcked}`);
  console.log(`lost acknowledged writes: ${totalLost}`);
  console.log(`torn rows: ${totalTorn}`);
  console.log(`integrity failures: ${integrityFailures}`);
  if (totalLost > 0 || totalTorn > 0 || integrityFailures > 0) process.exit(1);
}

if (values.child) runChild();
else await main();
