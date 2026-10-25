// @vitest-environment node
// End-to-end against a real TimescaleDB: the migrations, then every query the
// routes run. It uses IYNK_TEST_DATABASE_URL when set (a throwaway database:
// the test writes to it), otherwise starts timescale/timescaledb:latest-pg17 in
// Docker on a random port with a random password and stops it afterwards. With
// neither available it is skipped.
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { listMigrations, migrate } from "../../../../scripts/db-migrate.mjs";
import { deleteProfile, getLeaderboard, getLiveCounters, insertEvents, listProfiles, upsertProfile, type EventRow } from "./queries";

const external = process.env.IYNK_TEST_DATABASE_URL;

function dockerAvailable(): boolean {
  try {
    execFileSync("docker", ["info"], { stdio: "ignore", timeout: 10_000 });
    return true;
  } catch {
    return false;
  }
}

const enabled = Boolean(external) || dockerAvailable();
if (!enabled) console.info("timescale.test: skipped (no IYNK_TEST_DATABASE_URL and no Docker daemon)");

describe.skipIf(!enabled)("TimescaleDB integration", () => {
  let container: string | null = null;
  let sql: postgres.Sql;

  beforeAll(async () => {
    let url = external;
    if (!url) {
      const port = 40_000 + Math.floor(Math.random() * 10_000);
      const password = randomBytes(12).toString("hex");
      container = execFileSync("docker", [
        "run", "-d", "--rm", "-p", `127.0.0.1:${port}:5432`, "-e", `POSTGRES_PASSWORD=${password}`, "timescale/timescaledb:latest-pg17",
      ]).toString().trim();
      url = `postgres://postgres:${password}@127.0.0.1:${port}/postgres`;
    }
    sql = postgres(url, { max: 2, onnotice: () => {}, connect_timeout: 5 });
    // The image restarts Postgres once after its init scripts; wait for a stable server.
    for (let tries = 0, ok = 0; ok < 3; tries++) {
      if (tries > 120) throw new Error("TimescaleDB did not come up");
      try {
        await sql`SELECT extversion FROM pg_extension WHERE extname = 'timescaledb'`;
        ok++;
      } catch {
        ok = 0;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
    await migrate(sql, listMigrations(), { log: () => {} });
  }, 240_000);

  afterAll(async () => {
    await sql?.end({ timeout: 5 });
    if (container) execFileSync("docker", ["stop", container], { stdio: "ignore" });
  });

  it("migrations are recorded and every file runs again without error", async () => {
    expect(await migrate(sql, listMigrations(), { log: () => {} })).toEqual([]);
    for (const m of listMigrations()) await sql.unsafe(m.text).simple();
    const [{ hypertable }] = await sql`SELECT count(*)::int AS hypertable FROM timescaledb_information.hypertables WHERE hypertable_name = 'events'`;
    expect(hypertable).toBe(1);
    const views = await sql`SELECT view_name, materialized_only FROM timescaledb_information.continuous_aggregates ORDER BY view_name`;
    expect(views.map((v) => [v.view_name, v.materialized_only])).toEqual([["activity_1m", false], ["laps_best_daily", false]]);
    const jobs = await sql`SELECT proc_name FROM timescaledb_information.jobs ORDER BY proc_name`;
    const procs = jobs.map((j) => j.proc_name);
    for (const proc of ["policy_retention", "policy_refresh_continuous_aggregate", "simlab_expire_profiles"]) expect(procs).toContain(proc);
  });

  const s = (n: number) => `sess-${String(n).padStart(4, "0")}-aaaa`;
  const at = (msAgo: number) => new Date(Date.now() - msAgo);

  it("ranks laps per pilot from the real-time aggregate, with the asker's own row", async () => {
    const laps: EventRow[] = [
      [1, "Ada", 41_000], [1, "Ada", 39_500], [2, "Grace", 40_000], [3, "", 45_000], [4, "Linus", 60_000],
    ].map(([n, name, timeMs]) => ({
      ts: at(5_000), kind: "flight.lap", session: s(n as number), room: null, item: "quad5",
      data: { course: "quad5-bando", timeMs, ...(name ? { name } : {}) },
    }));
    await insertEvents(sql, [...laps, { ts: at(1000), kind: "flight.lap", session: s(9), room: null, item: "quad5", data: { course: "other-course", timeMs: 1000 } }]);

    const board = await getLeaderboard(sql, { course: "quad5-bando", session: s(4), limit: 2 });
    expect(board.pilots).toBe(4);
    expect(board.rows.map((r) => [r.rank, r.name, r.timeMs, r.laps])).toEqual([[1, "Ada", 39_500, 2], [2, "Grace", 40_000, 1]]);
    expect(board.you).toMatchObject({ rank: 4, name: "Linus", timeMs: 60_000, you: true });

    // A refresh materializes the buckets; the answer does not change.
    await sql`CALL refresh_continuous_aggregate('laps_best_daily', NULL, NULL)`;
    const again = await getLeaderboard(sql, { course: "quad5-bando", session: s(3), limit: 10 });
    expect(again.rows.find((r) => r.you)).toMatchObject({ rank: 3, name: null });
  });

  it("counts builders, LED blinks and drone flights over the last hour", async () => {
    const before = await getLiveCounters(sql);
    await insertEvents(sql, [
      { ts: at(30_000), kind: "led.blink", session: s(20), room: null, item: "uno-r3", data: { count: 40 } },
      { ts: at(20_000), kind: "led.blink", session: s(21), room: null, item: "uno-r3", data: { count: 2 } },
      { ts: at(10_000), kind: "flight.start", session: s(20), room: null, item: "quad5", data: {} },
      { ts: at(2 * 3_600_000), kind: "flight.start", session: s(22), room: null, item: "quad5", data: {} },
    ]);
    const live = await getLiveCounters(sql);
    expect(live.ledsBlinked - before.ledsBlinked).toBe(42);
    expect(live.dronesFlown - before.dronesFlown).toBe(1);
    expect(live.builders - before.builders).toBe(2);
    expect(live.perMinute).toHaveLength(60);
    expect(live.perMinute.reduce((a, b) => a + b, 0)).toBe(live.events);
  });

  it("keeps profiles to their token and hides expired ones", async () => {
    const p = { id: "prof-0001-aaaa", name: "Ada", lang: "en" as const, interests: ["drones"], built: ["drone:quad5:build"], wants: "a whoop" };
    expect(await upsertProfile(sql, p, "token-aaaaaaaaaaaaaaaa")).not.toBeNull();
    expect(await upsertProfile(sql, { ...p, name: "Mallory" }, "token-bbbbbbbbbbbbbbbb")).toBeNull();
    expect((await listProfiles(sql, { limit: 50 })).find((x) => x.id === p.id)).toMatchObject({ name: "Ada", interests: ["drones"] });
    expect(await listProfiles(sql, { exclude: p.id, limit: 50 })).not.toContainEqual(expect.objectContaining({ id: p.id }));

    await sql`UPDATE profiles SET expires_at = now() - INTERVAL '1 minute' WHERE id = ${p.id}`;
    expect((await listProfiles(sql, { limit: 50 })).some((x) => x.id === p.id)).toBe(false);
    // An expired profile may be taken over by a new token.
    expect(await upsertProfile(sql, { ...p, name: "Grace" }, "token-bbbbbbbbbbbbbbbb")).not.toBeNull();
    expect(await deleteProfile(sql, p.id, "token-aaaaaaaaaaaaaaaa")).toBe(false);
    expect(await deleteProfile(sql, p.id, "token-bbbbbbbbbbbbbbbb")).toBe(true);
  });
});
