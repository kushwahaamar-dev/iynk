// The HTTP half of server/scripts/drill.sh: a scripted device that enrols, signs in and pairs.
//   node drill-client.mjs enrol <base> <keyfile> <name> <code>
//   node drill-client.mjs login <base> <keyfile>
//   node drill-client.mjs pair <base> <keyfileA> <keyfileB>
//   node drill-client.mjs buddies <base> <keyfile>
//   node drill-client.mjs drain <base> <pid>
import { createPrivateKey, generateKeyPairSync, sign } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { connect } from "node:net";
import { deriveIdentityId, keyThumbprint, toBase64Url } from "../../src/protocol/identity.ts";

const DRAIN_PAUSE_MS = 300;

async function call(base, method, path, body, token) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { ...(body === undefined ? {} : { "content-type": "application/json" }), ...(token ? { authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await res.text();
  const json = text === "" ? null : JSON.parse(text);
  if (!res.ok) throw new Error(`${method} ${path} answered ${res.status}: ${json?.error?.code ?? text}`);
  return json;
}

function loadKey(file) {
  const saved = JSON.parse(readFileSync(file, "utf8"));
  const spki = new Uint8Array(Buffer.from(saved.spki, "base64"));
  const privateKey = createPrivateKey({ key: Buffer.from(saved.pkcs8, "base64"), format: "der", type: "pkcs8" });
  return {
    spki,
    thumbprint: keyThumbprint(spki),
    identityId: deriveIdentityId(spki),
    sign: (input) => toBase64Url(new Uint8Array(sign("sha256", Buffer.from(input, "utf8"), { key: privateKey, dsaEncoding: "ieee-p1363" }))),
  };
}

async function enrol(base, file, name, code) {
  const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
  const saved = {
    spki: publicKey.export({ format: "der", type: "spki" }).toString("base64"),
    pkcs8: privateKey.export({ format: "der", type: "pkcs8" }).toString("base64"),
  };
  writeFileSync(file, JSON.stringify(saved), { mode: 0o600 });
  const key = loadKey(file);
  const challenge = await call(base, "POST", "/v1/auth/challenges", { purpose: "register", keyThumbprint: key.thumbprint });
  await call(base, "POST", "/v1/identities", {
    challengeId: challenge.challengeId,
    signature: key.sign(challenge.signingInput),
    publicKey: toBase64Url(key.spki),
    displayName: name,
    enrollmentCode: code,
  });
  return key.identityId;
}

async function login(base, file) {
  const key = loadKey(file);
  const challenge = await call(base, "POST", "/v1/auth/challenges", { purpose: "login", identityId: key.identityId });
  const answer = await call(base, "POST", "/v1/auth/tokens", { challengeId: challenge.challengeId, signature: key.sign(challenge.signingInput) });
  return { token: answer.token, identityId: key.identityId };
}

async function pair(base, fileA, fileB) {
  const a = await login(base, fileA);
  const b = await login(base, fileB);
  const made = await call(base, "POST", "/v1/pairings", {}, a.token);
  const done = await call(base, "POST", "/v1/pairings/redeem", { pairing: { code: made.code } }, b.token);
  return done.buddy.identityId;
}

async function buddies(base, file) {
  const me = await login(base, file);
  const list = await call(base, "GET", "/v1/buddies", undefined, me.token);
  return list.items.map((item) => item.identityId).join("\n");
}

// A request that is still being sent is not idle, so the server keeps that connection while it drains.
function drain(base, pid) {
  const { hostname, port } = new URL(base);
  return new Promise((resolve, reject) => {
    const socket = connect({ host: hostname, port: Number(port) });
    let reply = "";
    socket.on("data", (chunk) => {
      reply += chunk.toString("utf8");
      if (reply.includes("\r\n\r\n") && /\r\n\r\n\{.*\}$/s.test(reply)) socket.end();
    });
    socket.on("error", reject);
    socket.on("close", () => resolve(reply));
    socket.on("connect", () => {
      socket.write(`GET /healthz HTTP/1.1\r\nHost: ${hostname}\r\n`);
      process.kill(Number(pid), "SIGTERM");
      setTimeout(() => socket.write("\r\n"), DRAIN_PAUSE_MS);
    });
  }).then((reply) => {
    const status = /^HTTP\/1\.1 (\d{3})/.exec(reply)?.[1];
    const body = reply.slice(reply.indexOf("\r\n\r\n") + 4);
    return `${status} ${body}`;
  });
}

const [command, base, ...args] = process.argv.slice(2);
const commands = {
  enrol: () => enrol(base, args[0], args[1], args[2]),
  login: async () => (await login(base, args[0])).identityId,
  pair: () => pair(base, args[0], args[1]),
  buddies: () => buddies(base, args[0]),
  drain: () => drain(base, args[0]),
};

if (!(command in commands)) {
  console.error(`Unknown command "${command}".`);
  process.exit(64);
}
commands[command]().then(
  (line) => console.log(line),
  (error) => {
    console.error(error.message);
    process.exit(1);
  },
);
