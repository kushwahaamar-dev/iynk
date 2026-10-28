// @vitest-environment node
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOTS = ["src/studio", "src/components/studio"];
const WRITER = path.join("src", "studio", "stores", "doc.ts");
/** The B3 diagnostics panel writes scratch sessions it creates itself for its kill and save-speed probes, never the open project. */
const SCRATCH_SESSIONS = path.join("src", "components", "studio", "diagnostics-run.ts");
const MUTATORS = "undo|redo|replace";

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

/** Comment text blanked, so a sentence that names a call is not a call. */
const code = (source: string): string => source.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, (m) => m.replace(/[^\n]/g, " "));

/** Lines that write the project session by any route but the doc store. A bare `.apply(` is not matched: `Function.apply` and `Reflect.apply` are not writes. */
export function findWrites(source: string): string[] {
  const text = code(source);
  const typed = [...text.matchAll(/\b(\w+)\s*:\s*ProjectSession\b/g)].map((m) => m[1]!);
  const created = [...text.matchAll(/\b(?:const|let)\s+(\w+)\s*=\s*(?:await\s+)?create\w*Session\(/g)].map((m) => m[1]!);
  const holders = ["\\.session", ...[...typed, ...created].map((name) => `\\b${name}`)].join("|");
  const patterns = [
    /\bsession\.apply\(/,
    new RegExp(`(?:${holders})\\.(?:apply|${MUTATORS})\\(`),
    /\bsession\.state\s*=(?!=)/,
    /\bfrom\s+["'][^"']*project\/apply[^"']*["']/,
    /\bimport\(\s*["'][^"']*project\/apply[^"']*["']\s*\)/,
  ];
  return text.split("\n").filter((line) => patterns.some((p) => p.test(line)));
}

describe("findWrites", () => {
  it("flags the routes into the session", () => {
    expect(findWrites("session.apply(ops, author);")).toHaveLength(1);
    expect(findWrites("doc.session.undo();")).toHaveLength(1);
    expect(findWrites("function f(s: ProjectSession) { s.redo(); }")).toHaveLength(1);
    expect(findWrites("const live = createSession(opts);\nlive.replace(next);")).toHaveLength(1);
    expect(findWrites("session.state = next;")).toHaveLength(1);
    expect(findWrites('import { apply } from "../../project/apply/index.ts";')).toHaveLength(1);
    expect(findWrites('const m = await import("@/project/apply/index");')).toHaveLength(1);
  });

  it("lets through reads, the doc store's own methods, bare apply calls and comments", () => {
    expect(findWrites("doc.undo();\ndoc.redo();\ndoc.replaceSession(next);")).toEqual([]);
    expect(findWrites("fn.apply(null, args);\nReflect.apply(fn, null, args);")).toEqual([]);
    expect(findWrites("if (session.state === other) {}")).toEqual([]);
    expect(findWrites("// session.apply(ops) is the doc store's job")).toEqual([]);
    expect(findWrites("const s = doc.session.state;")).toEqual([]);
  });
});

describe("no direct writes", () => {
  it("keeps every session mutation in stores/doc.ts", () => {
    const files = ROOTS.flatMap((root) => {
      try {
        return sourceFiles(root);
      } catch {
        return [];
      }
    });
    expect(files.length).toBeGreaterThan(0);
    const hits = files
      .filter((file) => file !== WRITER && file !== SCRATCH_SESSIONS)
      .flatMap((file) => findWrites(readFileSync(file, "utf8")).map((line) => `${file}: ${line.trim()}`));
    expect(hits).toEqual([]);
  });
});
