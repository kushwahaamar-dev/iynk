import assert from "node:assert/strict";
import { test } from "node:test";
import { defineRoutes, type RouteDef } from "../src/http/classes.ts";
import { startApp } from "./http-helpers.ts";

const handler = () => ({ status: 204 });
const good: RouteDef = { method: "GET", path: "/v1/ok", operation: "ok", cls: "public", bucket: "public.read", handler };

test("a route without a class makes defineRoutes throw", () => {
  const classless = { method: "GET", path: "/v1/loose", operation: "loose", bucket: "public.read", handler } as unknown as RouteDef;
  assert.throws(() => defineRoutes([good, classless]), /no valid class/);
});

test("a route without a bucket makes defineRoutes throw", () => {
  const bucketless = { method: "GET", path: "/v1/loose", operation: "loose", cls: "public", handler } as unknown as RouteDef;
  assert.throws(() => defineRoutes([bucketless]), /no valid bucket/);
});

test("an unknown class or bucket is refused", () => {
  assert.throws(() => defineRoutes([{ ...good, cls: "everyone" as RouteDef["cls"] }]), /no valid class/);
  assert.throws(() => defineRoutes([{ ...good, bucket: "bulk" as RouteDef["bucket"] }]), /no valid bucket/);
});

test("a removed route must not have a handler and the others must", () => {
  assert.throws(() => defineRoutes([{ ...good, cls: "removed" }]), /must not have a handler/);
  assert.doesNotThrow(() => defineRoutes([{ ...good, cls: "removed", handler: undefined }]));
  assert.throws(() => defineRoutes([{ ...good, handler: undefined }]), /no handler/);
});

test("the same method and path twice is refused", () => {
  assert.throws(() => defineRoutes([good, { ...good, operation: "again" }]), /defined twice/);
  assert.doesNotThrow(() => defineRoutes([good, { ...good, method: "POST" }]));
});

test("a valid list comes back unchanged", () => {
  const list = [good];
  assert.equal(defineRoutes(list), list);
});

test("the assembled app registers the probe routes with a class and a bucket", async () => {
  const running = await startApp();
  try {
    const names = running.app.routes.map((route) => `${route.method} ${route.path}`);
    for (const name of ["GET /v1/server", "GET /v1/healthz", "GET /healthz", "GET /v1/readyz", "GET /readyz"]) assert.ok(names.includes(name), name);
    assert.doesNotThrow(() => defineRoutes(running.app.routes));
  } finally {
    await running.stop();
  }
});
