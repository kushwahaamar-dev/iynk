#!/usr/bin/env node
// Runs the ten provider conformance checks (src/ai/conformance.ts) from a terminal.
// Usage: node scripts/ai-conformance.mjs --family <anthropic|openai-compat> --base-url <url> --model <id> [--key-env <NAME>] [--json]
// The key is read from the named environment variable only, sent only to the base URL, and never printed.

import { spawnSync } from "node:child_process";
import { parseArgs } from "node:util";

const TRANSFORM_FLAG = "--experimental-transform-types";

if (!process.execArgv.includes(TRANSFORM_FLAG)) {
  const flags = [TRANSFORM_FLAG, "--disable-warning=ExperimentalWarning", "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON"];
  const again = spawnSync(process.execPath, [...flags, ...process.argv.slice(1)], { stdio: "inherit" });
  process.exit(again.status ?? 1);
}

const USAGE =
  "Usage: node scripts/ai-conformance.mjs --family <anthropic|openai-compat> --base-url <url> --model <id> [--key-env <NAME>] [--json]";
const WRONG_KEY = "iynk-conformance-wrong-key";
const REQUIRED_PASSES = ["C1", "C2", "C3", "C4"];

function fail(message) {
  console.error(`${message}\n${USAGE}`);
  process.exit(2);
}

const { values } = parseArgs({
  options: {
    family: { type: "string" },
    "base-url": { type: "string" },
    model: { type: "string" },
    "key-env": { type: "string" },
    json: { type: "boolean", default: false },
  },
  strict: true,
});

const family = values.family;
const baseUrl = values["base-url"];
const modelId = values.model;
if (family !== "anthropic" && family !== "openai-compat") fail("--family must be anthropic or openai-compat.");
if (!baseUrl || !modelId) fail("--base-url and --model are required.");

const [{ runConformance }, { toAiError }, { baseUrlProblem }, { validProviderKey }, { anthropicWire }, { DEFAULT_QUIRKS, openaiWire }, { directTransport }] =
  await Promise.all([
    import("../src/ai/conformance.ts"),
    import("../src/ai/errors.ts"),
    import("../src/ai/profiles.ts"),
    import("../src/protocol/ai-relay.ts"),
    import("../src/ai/adapters/anthropic.ts"),
    import("../src/ai/adapters/openai.ts"),
    import("../src/ai/transports.ts"),
  ]);

const addressProblem = baseUrlProblem(baseUrl);
if (addressProblem) fail(addressProblem);

let key = null;
if (values["key-env"]) {
  key = process.env[values["key-env"]]?.trim() || null;
  if (key === null) fail(`The environment variable ${values["key-env"]} is empty or not set.`);
  if (!validProviderKey(key)) fail(`The key in ${values["key-env"]} must be 8 to 512 visible characters.`);
}

const profile = {
  id: "prf_conformance",
  label: "Conformance run",
  family,
  baseUrl,
  keyId: key === null ? null : "key_cli",
  via: "direct",
  models: [{ id: modelId, contextTokens: 128_000, maxOutputTokens: 4_096 }],
};

const wire = family === "anthropic" ? anthropicWire : openaiWire;

/** An in-process client for one profile and key. It does not retry, so a 429 shows up in the report. */
function clientFor(use, secret) {
  const transport = directTransport({
    fetch,
    custody: { keyFor: async () => secret, scrub: async (text) => ({ text, found: 0 }) },
    browser: false,
  });
  return {
    async *stream(req, _profileId, signal) {
      try {
        const body = { ...wire.buildBody(req, { stream: true, quirks: use.quirks ?? DEFAULT_QUIRKS }), model: req.model };
        const res = await transport.send({ profile: use, path: "chat", body, signal });
        yield* wire.parse(res, signal);
      } catch (error) {
        const { code, detail } = toAiError(error, signal);
        yield { t: "error", code, ...(detail?.status !== undefined ? { status: detail.status } : {}) };
      }
    },
    async probe(_profileId, signal) {
      try {
        const res = await transport.send({ profile: use, path: "models", body: {}, signal });
        let modelIds = [];
        if (res.ok) {
          const data = (await res.json().catch(() => null))?.data;
          if (Array.isArray(data)) modelIds = data.flatMap((item) => (typeof item?.id === "string" ? [item.id] : []));
        }
        await res.body?.cancel().catch(() => {});
        return { reachable: true, status: res.status, modelIds };
      } catch {
        return { reachable: false, modelIds: [] };
      }
    },
  };
}

const report = await runConformance({
  client: clientFor(profile, key),
  profile,
  modelId,
  now: Date.now,
  signal: new AbortController().signal,
  browser: false,
  variant: ({ quirks, wrongKey }) =>
    clientFor({ ...profile, ...(quirks ? { quirks } : {}) }, wrongKey ? WRONG_KEY : key),
});

if (values.json) console.log(JSON.stringify(report, null, 2));
else {
  for (const r of report.results) console.log(`${r.ok ? "PASS" : "FAIL"} ${r.id} ${r.name} (${r.ms} ms): ${r.detail}`);
  console.log(`tools=${report.caps.tools} parallelTools=${report.caps.parallelTools} usageInStream=${report.caps.usageInStream} promptCache=${report.caps.promptCache}`);
}

const passed = new Set(report.results.filter((r) => r.ok).map((r) => r.id));
process.exit(REQUIRED_PASSES.every((id) => passed.has(id)) ? 0 : 1);
