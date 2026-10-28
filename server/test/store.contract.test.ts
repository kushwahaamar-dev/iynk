import assert from "node:assert/strict";
import { join } from "node:path";
import { describe, test } from "node:test";
import type { Deps } from "../src/deps.ts";
import type { ServerStore, Tx } from "../src/store/port.ts";
import { openStore } from "../src/store/sqlite.ts";
import { fakeDeps, memoryStore, MIGRATIONS_DIR, tempDir } from "./helpers.ts";

type MakeStore = (deps: Deps) => { store: ServerStore; cleanup(): void };

let counter = 0;

function addDevice(tx: Tx, id = `dev_${(counter += 1)}`): string {
  tx.run(
    "INSERT INTO devices (id, identity_id, public_key, thumbprint, name, server_role, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?, 'member', 1, 1)",
    id,
    `usr_${id}`,
    new Uint8Array([1, 2, 3]),
    `thumb_${id}`,
    "Ada",
  );
  return id;
}

function count(tx: Tx, table: string): number {
  return tx.get<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table}`)?.n ?? -1;
}

export function runStoreContract(name: string, makeStore: MakeStore): void {
  describe(`ServerStore contract: ${name}`, () => {
    function withStore(run: (store: ServerStore, deps: Deps) => void): void {
      const deps = fakeDeps();
      const { store, cleanup } = makeStore(deps);
      try {
        run(store, deps);
      } finally {
        store.close();
        cleanup();
      }
    }

    test("migration 0001 leaves an intact database at version 1", () => {
      withStore((store) => {
        assert.equal(store.schemaVersion(), 1);
        assert.equal(store.integrityCheck(), "ok");
        assert.equal(store.ping(), true);
      });
    });

    test("deleting a device cascades to sessions, pairings and buddies", () => {
      withStore((store) => {
        store.transaction((tx) => {
          const a = addDevice(tx, "dev_a");
          const b = addDevice(tx, "dev_b");
          tx.run(
            "INSERT INTO sessions (id, device_id, token_hash, created_at, expires_at, last_used_at) VALUES ('ses_1', ?, ?, 1, 2, 1)",
            a,
            new Uint8Array(32),
          );
          tx.run(
            "INSERT INTO pairings (id, creator, expires_at, created_at) VALUES ('pair_1', ?, 2, 1)",
            a,
          );
          tx.run("INSERT INTO buddies (a, b, since) VALUES (?, ?, 1)", a, b);
          tx.run("DELETE FROM devices WHERE id = ?", a);
          assert.equal(count(tx, "sessions"), 0);
          assert.equal(count(tx, "pairings"), 0);
          assert.equal(count(tx, "buddies"), 0);
          assert.equal(count(tx, "devices"), 1);
        });
      });
    });

    test("a device that redeemed a code and a pairing can be deleted", () => {
      withStore((store) => {
        store.transaction((tx) => {
          const owner = addDevice(tx);
          const friend = addDevice(tx);
          tx.run(
            "INSERT INTO enrollment_codes (id, secret_hash, typed_hash, expires_at, used_by, used_at, created_at) VALUES ('enr_1', ?, ?, 9, ?, 5, 1)",
            new Uint8Array(32),
            new Uint8Array(32).fill(1),
            friend,
          );
          tx.run(
            "INSERT INTO pairings (id, creator, expires_at, used_by, used_at, created_at) VALUES ('pair_1', ?, 9, ?, 5, 1)",
            owner,
            friend,
          );
          tx.run("DELETE FROM devices WHERE id = ?", friend);
          assert.deepEqual(tx.get("SELECT used_by, used_at FROM enrollment_codes"), { used_by: null, used_at: 5 });
          assert.deepEqual(tx.get("SELECT used_by, used_at FROM pairings"), { used_by: null, used_at: 5 });
        });
      });
    });

    test("read refuses a write and a later transaction still works", () => {
      withStore((store) => {
        assert.throws(() => store.read((tx) => addDevice(tx)));
        store.transaction((tx) => addDevice(tx));
        assert.equal(store.read((tx) => count(tx, "devices")), 1);
      });
    });

    test("buddies must be stored with a before b", () => {
      withStore((store) => {
        store.transaction((tx) => {
          const a = addDevice(tx, "dev_a");
          const b = addDevice(tx, "dev_b");
          assert.throws(() => tx.run("INSERT INTO buddies (a, b, since) VALUES (?, ?, 1)", b, a), /CHECK/);
          assert.equal(tx.run("INSERT INTO buddies (a, b, since) VALUES (?, ?, 1)", a, b).changes, 1);
        });
      });
    });

    test("a thumbprint is unique", () => {
      withStore((store) => {
        store.transaction((tx) => {
          addDevice(tx, "dev_a");
          assert.throws(() =>
            tx.run(
              "INSERT INTO devices (id, identity_id, public_key, thumbprint, name, server_role, created_at, last_seen_at) VALUES ('dev_z', 'usr_z', ?, 'thumb_dev_a', 'Bo', 'member', 1, 1)",
              new Uint8Array([9]),
            ),
          );
        });
      });
    });

    test("a throw rolls the transaction back", () => {
      withStore((store) => {
        assert.throws(() =>
          store.transaction((tx) => {
            addDevice(tx);
            throw new Error("boom");
          }),
        /boom/);
        assert.equal(store.read((tx) => count(tx, "devices")), 0);
      });
    });

    test("a nested transaction joins the outer one", () => {
      withStore((store) => {
        assert.throws(() =>
          store.transaction((outer) => {
            addDevice(outer);
            store.transaction((inner) => addDevice(inner));
            throw new Error("outer fails");
          }),
        /outer fails/);
        assert.equal(store.read((tx) => count(tx, "devices")), 0);
        store.transaction((outer) => {
          addDevice(outer);
          store.transaction((inner) => addDevice(inner));
        });
        assert.equal(store.read((tx) => count(tx, "devices")), 2);
      });
    });

    test("blobs come back as bytes", () => {
      withStore((store) => {
        store.transaction((tx) => addDevice(tx, "dev_a"));
        const row = store.read((tx) => tx.get<{ public_key: Uint8Array }>("SELECT public_key FROM devices"));
        assert.deepEqual(Array.from(row?.public_key ?? []), [1, 2, 3]);
      });
    });

    test("a backup opens with the same row counts", () => {
      const scratch = tempDir();
      try {
        withStore((store, deps) => {
          store.transaction((tx) => {
            addDevice(tx);
            addDevice(tx);
          });
          const target = join(scratch.dir, "copy", "backup.db");
          store.backupTo(target);
          assert.throws(() => store.backupTo(target), /already exists/);
          const copy = openStore(
            { path: target, sync: "normal", migrationsDir: MIGRATIONS_DIR, backupsDir: join(scratch.dir, "backups"), serverVersion: "test" },
            deps,
          );
          try {
            assert.equal(copy.read((tx) => count(tx, "devices")), 2);
            assert.equal(copy.integrityCheck(), "ok");
          } finally {
            copy.close();
          }
        });
      } finally {
        scratch.remove();
      }
    });
  });
}

runStoreContract("node:sqlite in memory", () => ({ store: memoryStore(), cleanup() {} }));

runStoreContract("node:sqlite on a file", (deps) => {
  const scratch = tempDir();
  const store = openStore(
    {
      path: join(scratch.dir, "data", "iynk.db"),
      sync: "full",
      migrationsDir: MIGRATIONS_DIR,
      backupsDir: join(scratch.dir, "data", "backups"),
      serverVersion: "test",
    },
    deps,
  );
  return { store, cleanup: scratch.remove };
});
