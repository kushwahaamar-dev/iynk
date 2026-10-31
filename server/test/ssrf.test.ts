import assert from "node:assert/strict";
import { test } from "node:test";
import { buildAllowList, checkTarget } from "../src/modules/ai/hosts.ts";
import { checkAddresses, classifyAddress, type AddressClass } from "../src/modules/ai/ssrf.ts";

const CASES: [string, AddressClass][] = [
  ["8.8.8.8", "public"],
  ["1.1.1.1", "public"],
  ["172.15.0.1", "public"],
  ["172.32.0.1", "public"],
  ["100.63.255.255", "public"],
  ["0.0.0.0", "unspecified"],
  ["0.1.2.3", "unspecified"],
  ["10.0.0.1", "private"],
  ["100.64.0.1", "private"],
  ["100.127.255.255", "private"],
  ["172.16.0.1", "private"],
  ["172.31.255.255", "private"],
  ["192.168.1.1", "private"],
  ["127.0.0.1", "loopback"],
  ["127.255.255.254", "loopback"],
  ["169.254.169.254", "metadata"],
  ["169.254.0.1", "link-local"],
  ["192.0.0.8", "reserved"],
  ["198.18.0.1", "reserved"],
  ["198.19.255.255", "reserved"],
  ["224.0.0.1", "multicast"],
  ["239.255.255.255", "multicast"],
  ["240.0.0.1", "reserved"],
  ["255.255.255.255", "reserved"],
  ["::", "unspecified"],
  ["::1", "loopback"],
  ["fc00::1", "unique-local"],
  ["fd12:3456::1", "unique-local"],
  ["fe80::1", "link-local"],
  ["febf::1", "link-local"],
  ["ff02::1", "multicast"],
  ["::ffff:127.0.0.1", "loopback"],
  ["::ffff:7f00:1", "loopback"],
  ["::ffff:10.1.2.3", "private"],
  ["::ffff:8.8.8.8", "public"],
  ["::ffff:169.254.169.254", "metadata"],
  ["64:ff9b::a9fe:a9fe", "metadata"],
  ["64:ff9b::8.8.8.8", "public"],
  ["::7f00:1", "reserved"],
  ["2001:4860:4860::8888", "public"],
  ["2606:4700:4700::1111", "public"],
  ["fe80::1%eth0", "link-local"],
  ["not an address", "reserved"],
  ["", "reserved"],
  ["999.1.1.1", "reserved"],
];

test("classifyAddress sorts addresses into classes", () => {
  for (const [address, expected] of CASES) assert.equal(classifyAddress(address), expected, address);
});

test("checkAddresses refuses an empty answer and picks the first good address", () => {
  const policy = { allowPrivate: false, hostAllowed: true };
  assert.deepEqual(checkAddresses([], policy), { ok: false, code: "address_not_allowed" });
  assert.deepEqual(checkAddresses([{ address: "8.8.8.8" }, { address: "2001:4860:4860::8888" }], policy), { ok: true, pick: { address: "8.8.8.8", family: 4 } });
  assert.deepEqual(checkAddresses([{ address: "2001:4860:4860::8888" }], policy), { ok: true, pick: { address: "2001:4860:4860::8888", family: 6 } });
});

test("checkAddresses needs every address to pass", () => {
  const policy = { allowPrivate: false, hostAllowed: true };
  assert.equal(checkAddresses([{ address: "8.8.8.8" }, { address: "10.0.0.1" }], policy).ok, false);
  assert.equal(checkAddresses([{ address: "10.0.0.1" }, { address: "8.8.8.8" }], policy).ok, false);
});

test("allowPrivate admits loopback and private only for an allow-listed host", () => {
  for (const address of ["127.0.0.1", "10.0.0.1", "fd00::1", "::ffff:192.168.0.1"]) {
    assert.equal(checkAddresses([{ address }], { allowPrivate: true, hostAllowed: true }).ok, true, address);
    assert.equal(checkAddresses([{ address }], { allowPrivate: true, hostAllowed: false }).ok, false, address);
    assert.equal(checkAddresses([{ address }], { allowPrivate: false, hostAllowed: true }).ok, false, address);
  }
});

test("link-local, metadata, multicast, unspecified and reserved are refused in every setting", () => {
  for (const address of ["169.254.169.254", "169.254.1.1", "224.0.0.1", "0.0.0.0", "240.0.0.1", "fe80::1", "ff02::1", "::", "64:ff9b::a9fe:a9fe"]) {
    assert.equal(checkAddresses([{ address }], { allowPrivate: true, hostAllowed: true }).ok, false, address);
  }
});

test("checkTarget matches the exact lower-case host or host:port", () => {
  const allow = buildAllowList(["models.example", "local.test:8080", "Mixed.Example"]);
  assert.equal(checkTarget("https://MODELS.example/v1", allow, false).ok, true);
  assert.equal(checkTarget("https://models.example:443/v1", allow, false).ok, true);
  assert.equal(checkTarget("https://models.example:8443/v1", allow, false).ok, false);
  assert.equal(checkTarget("https://mixed.example", allow, false).ok, true);
  assert.deepEqual(checkTarget("https://evil.example", allow, false), { ok: false, code: "host_not_allowed" });
  assert.deepEqual(checkTarget("https://models.example.evil.example", allow, false), { ok: false, code: "host_not_allowed" });
  assert.deepEqual(checkTarget("https://127.0.0.1", allow, false), { ok: false, code: "host_not_allowed" });
  assert.deepEqual(checkTarget("https://169.254.169.254", allow, true), { ok: false, code: "host_not_allowed" });
  assert.deepEqual(checkTarget("ftp://models.example", allow, false), { ok: false, code: "scheme_not_allowed" });
  assert.deepEqual(checkTarget("not a url", allow, false), { ok: false, code: "host_not_allowed" });
});

test("plain http is only for an allow-listed host while private targets are allowed", () => {
  const allow = buildAllowList(["local.test:8080", "models.example"]);
  assert.equal(checkTarget("http://local.test:8080/v1", allow, true).ok, true);
  assert.deepEqual(checkTarget("http://local.test:8080/v1", allow, false), { ok: false, code: "scheme_not_allowed" });
  assert.deepEqual(checkTarget("http://other.test:8080/v1", allow, true), { ok: false, code: "host_not_allowed" });
});
