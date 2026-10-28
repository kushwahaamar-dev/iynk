// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readEnv } from "./env";

const READ_OUTSIDE_SCHEMA = [
  "SITE_URL", // src/i18n/seo.ts
  "IYNK_BUILD_SKIP_TYPECHECK", // next.config.ts
];

function namesIn(file: string): string[] {
  return file
    .split("\n")
    .filter((line) => line.trim() !== "" && !line.startsWith("#"))
    .map((line) => line.split("=")[0]);
}

function drift(example: string, schema: string[]) {
  const listed = new Set(namesIn(example));
  const known = new Set([...schema, ...READ_OUTSIDE_SCHEMA]);
  return {
    missing: schema.filter((name) => !listed.has(name)),
    extra: [...listed].filter((name) => !known.has(name)),
  };
}

const schemaNames = Object.keys(readEnv({}).env);

describe(".env.example against the env schema", () => {
  it("lists every schema name and nothing else", () => {
    const example = readFileSync(join(process.cwd(), ".env.example"), "utf8");
    expect(drift(example, schemaNames)).toEqual({ missing: [], extra: [] });
  });

  it("names the variable that is missing or extra", () => {
    expect(drift("META_API_BASE=\nGHOST=\n", ["META_API_BASE", "META_MODEL"])).toEqual({
      missing: ["META_MODEL"],
      extra: ["GHOST"],
    });
  });
});
