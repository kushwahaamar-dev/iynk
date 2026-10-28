import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { PROJECT_SCHEMAS } from "../src/http/server-info.ts";
import { startApp } from "./http-helpers.ts";

const REQUIRED = ["audience", "software", "apiVersions", "apiVersion", "schemas", "enrollment", "features", "limits"];
const FEATURES = ["identities", "buddies", "shares", "rooms", "assets", "aiRelay", "searchProxy", "compile", "tools"];

type Info = {
  audience: string;
  name: string;
  software: Record<string, unknown>;
  apiVersion: string;
  minClient: string;
  enrollment: string;
  schemas: { project: string[]; opSchema: string; component: number[] };
  features: Record<string, unknown>;
  limits: Record<string, number>;
} & Record<string, unknown>;

async function info(env?: Record<string, string>) {
  const running = await startApp({ env });
  try {
    const response = await running.get("/v1/server");
    return { response, body: (await response.json()) as Info };
  } finally {
    await running.stop();
  }
}

test("the body has every field openapi requires, with the right types", async () => {
  const { response, body } = await info();
  assert.equal(response.status, 200);
  for (const key of REQUIRED) assert.ok(key in body, `missing ${key}`);
  assert.equal(typeof body.audience, "string");
  assert.deepEqual(body.software, { name: "iynk-server" });
  assert.deepEqual(body.apiVersions, [1]);
  assert.match(body.apiVersion, /^1\.\d+$/);
  assert.match(body.minClient, /^\d+\.\d+\.\d+$/);
  assert.deepEqual(Object.keys(body.features).sort(), [...FEATURES].sort());
  for (const value of Object.values(body.features)) assert.equal(typeof value, "boolean");
  for (const key of ["documentBytes", "assetBytes", "peersPerRoom", "buddiesPerIdentity"]) assert.ok(Number.isInteger(body.limits[key]), key);
  assert.deepEqual(Object.keys(body.schemas).sort(), ["component", "opSchema", "project"]);
});

test("schemas and limits are the ones the card fixes", async () => {
  const { body } = await info();
  assert.deepEqual(body.schemas.project, ["1.1"]);
  assert.equal(body.schemas.opSchema, "1.1");
  assert.deepEqual(body.schemas.component, [1]);
  assert.deepEqual(body.limits, { documentBytes: 5242880, assetBytes: 16777216, peersPerRoom: 8, buddiesPerIdentity: 64 });
});

test("the project schema list matches CURRENT_SCHEMA_VERSION in src/project/migrate.ts", () => {
  const text = readFileSync(fileURLToPath(new URL("../../src/project/migrate.ts", import.meta.url)), "utf8");
  const match = /CURRENT_SCHEMA_VERSION\s*=\s*["']([^"']+)["']/.exec(text);
  assert.ok(match, "CURRENT_SCHEMA_VERSION not found");
  assert.deepEqual(PROJECT_SCHEMAS, [match[1]]);
});

test("the probe leaks no version, commit, address or counts", async () => {
  const { body } = await info();
  for (const key of ["version", "commit", "wsUrl", "counts"]) assert.ok(!(key in body), key);
  assert.ok(!("version" in body.software));
});

test("features are the B6 set", async () => {
  const { body } = await info();
  assert.deepEqual(body.features, {
    identities: true,
    buddies: true,
    shares: false,
    rooms: false,
    assets: false,
    aiRelay: false,
    searchProxy: false,
    compile: false,
    tools: false,
  });
});

test("name, enrollment and minClient follow the config", async () => {
  const { body } = await info({ IYNK_ENROL: "closed", IYNK_SERVER_NAME: "Lab", IYNK_MIN_CLIENT: "0.3.0" });
  assert.equal(body.enrollment, "closed");
  assert.equal(body.name, "Lab");
  assert.equal(body.minClient, "0.3.0");
  assert.equal(body.audience, "iynk.test");
  assert.equal((await info()).body.enrollment, "code");
});
