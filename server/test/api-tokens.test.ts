import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { findToken, issueMcpKey, revokeMcpKey } from "../src/identity/api-tokens.ts";
import { fakeDeps, memoryStore } from "./helpers.ts";

function setup() {
  const deps = fakeDeps();
  const store = memoryStore(deps);
  const issue = () => store.transaction((tx) => issueMcpKey(tx, deps));
  const find = (key: string) => store.read((tx) => findToken(tx, key, deps.clock.now()));
  return { deps, store, issue, find };
}

describe("MCP keys", () => {
  test("an issued key has the documented shape and is found", () => {
    const { issue, find } = setup();
    const { id, key } = issue();
    assert.match(key, /^iynk_mcp_[A-Za-z0-9_-]{43}$/);
    assert.match(id, /^tok_[a-z2-7]{16}$/);
    assert.deepEqual(find(key), { id, kind: "mcp", deviceId: null });
  });

  test("a key pasted with a trailing newline is found", () => {
    const { issue, find } = setup();
    const { key } = issue();
    assert.equal(find(`${key}\n`)?.kind, "mcp");
  });

  test("revoking ends the key at once and reports the count", () => {
    const { deps, store, issue, find } = setup();
    const { key } = issue();
    assert.equal(store.transaction((tx) => revokeMcpKey(tx, deps)), 1);
    assert.equal(find(key), null);
    assert.equal(store.transaction((tx) => revokeMcpKey(tx, deps)), 0);
  });

  test("issuing again revokes the earlier key", () => {
    const { deps, issue, find } = setup();
    const first = issue();
    deps.advance(1000);
    const second = issue();
    assert.equal(find(first.key), null);
    assert.equal(find(second.key)?.id, second.id);
  });

  test("an expired key is refused", () => {
    const { deps, store, issue, find } = setup();
    const { id, key } = issue();
    store.transaction((tx) => tx.run("UPDATE api_tokens SET expires_at = ? WHERE id = ?", deps.clock.now() + 1000, id));
    assert.ok(find(key));
    deps.advance(1000);
    assert.equal(find(key), null);
  });

  test("unknown and malformed keys are refused", () => {
    const { issue, find } = setup();
    issue();
    assert.equal(find(`iynk_mcp_${"B".repeat(43)}`), null);
    assert.equal(find("iynk_mcp_short"), null);
    assert.equal(find(""), null);
  });

  test("the table holds a hash, never the key", () => {
    const { store, issue } = setup();
    const { key } = issue();
    const rows = store.read((tx) => tx.all<Record<string, unknown>>("SELECT * FROM api_tokens"));
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.["scopes"], "tools:read");
    assert.ok(!JSON.stringify(rows, (_, v) => (v instanceof Uint8Array ? Buffer.from(v).toString("latin1") : v)).includes(key));
    const raw = Buffer.from(rows[0]?.["token_hash"] as Uint8Array);
    assert.equal(raw.length, 32);
    assert.ok(!raw.includes(Buffer.from(key)));
  });
});
