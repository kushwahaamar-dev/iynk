// @vitest-environment node
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// SYSTEM_ARCHITECTURE 5.3 as code. Only the rows for new code are enforced; the rows for the existing tree are held
// by the ratchets at the bottom.

type ModuleName =
  | "core"
  | "protocol"
  | "project"
  | "parts"
  | "sim"
  | "sim-host"
  | "local"
  | "export"
  | "studio"
  | "ai"
  | "collab"
  | "server-client"
  | "content"
  | "ui"
  | "labs"
  | "server";

type EnforcedModule = "core" | "protocol" | "project" | "parts" | "sim" | "export" | "server";

const ALLOWED: Record<EnforcedModule, ReadonlySet<ModuleName>> = {
  core: new Set(),
  protocol: new Set(["core"]),
  project: new Set(["core"]),
  parts: new Set(["core", "project"]),
  sim: new Set(["core", "project", "parts"]),
  export: new Set(["core", "project", "parts"]),
  server: new Set(["core", "protocol", "project", "parts", "sim", "export"]),
};

const PORTABLE: ReadonlySet<ModuleName> = new Set(["core", "protocol", "project", "parts", "sim", "export"]);
const PARTS_TO_PROJECT_TYPE_ONLY = true;

const MODULE_FOLDERS: readonly (readonly [string, ModuleName])[] = [
  ["src/core", "core"],
  ["src/protocol", "protocol"],
  ["src/project", "project"],
  ["src/parts", "parts"],
  ["src/sim-host", "sim-host"],
  ["src/sim", "sim"],
  ["src/local", "local"],
  ["src/export", "export"],
  ["src/components/studio", "studio"],
  ["src/studio", "studio"],
  ["src/ai", "ai"],
  ["src/collab", "collab"],
  ["src/server-client", "server-client"],
  ["src/content", "content"],
  ["src/i18n", "content"],
  ["src/lib", "labs"],
];

const inFolder = (file: string, folder: string) => file === folder || file.startsWith(`${folder}/`);

function moduleOf(file: string): ModuleName {
  if (inFolder(file, "server")) return "server";
  for (const [folder, name] of MODULE_FOLDERS) if (inFolder(file, folder)) return name;
  // src/app, src/components and the loose app files (instrumentation, test support).
  if (inFolder(file, "src")) return "ui";
  throw new Error(`${file} is in no module`);
}

// The part library is browser glue over storage, packs and fault models (B11): browser code, like the portable carve-out.
const OUTSIDE_MATRIX = ["src/parts/browser"];

function isExempt(file: string): boolean {
  return /\.(test|testing)\.ts$/.test(file) || inFolder(file, "src/project/testing");
}

const isEnforced = (name: ModuleName): name is EnforcedModule => name in ALLOWED;

function isPortable(file: string): boolean {
  return PORTABLE.has(moduleOf(file)) && !inFolder(file, "src/parts/browser");
}

interface FoundImport {
  spec: string;
  typeOnly: boolean;
  line: number;
}

// Same length as the source, with comment text and string contents blanked, so a regex sees code only.
function maskSource(source: string): string {
  const out = source.split("");
  const blank = (from: number, to: number) => {
    for (let i = from; i < to; i++) if (out[i] !== "\n") out[i] = " ";
  };
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];
    if (ch === "/" && next === "/") {
      const end = source.indexOf("\n", i);
      const stop = end === -1 ? source.length : end;
      blank(i, stop);
      i = stop;
    } else if (ch === "/" && next === "*") {
      const end = source.indexOf("*/", i + 2);
      const stop = end === -1 ? source.length : end + 2;
      blank(i, stop);
      i = stop;
    } else if (ch === '"' || ch === "'" || ch === "`") {
      let j = i + 1;
      while (j < source.length && source[j] !== ch) j += source[j] === "\\" ? 2 : 1;
      blank(i + 1, j);
      i = j + 1;
    } else {
      i++;
    }
  }
  return out.join("");
}

const STATIC_IMPORT = /(?<![\w$.])(import|export)\s+(type\s+)?(?:[\w\s{},*$]*?\bfrom\s*)?(['"])/dg;
const DYNAMIC_IMPORT = /(?<![\w$.])import\s*\(\s*(['"])/dg;

function importsOf(source: string): FoundImport[] {
  const masked = maskSource(source);
  const found: FoundImport[] = [];
  const read = (quoteAt: number, typeOnly: boolean) => {
    const quote = source[quoteAt];
    const end = source.indexOf(quote, quoteAt + 1);
    found.push({
      spec: source.slice(quoteAt + 1, end),
      typeOnly,
      line: source.slice(0, quoteAt).split("\n").length,
    });
  };
  for (const m of masked.matchAll(STATIC_IMPORT)) read(m.indices![3][0], m[2] !== undefined);
  for (const m of masked.matchAll(DYNAMIC_IMPORT)) read(m.indices![1][0], false);
  return found.sort((a, b) => a.line - b.line);
}

const SUBPATHS: Record<string, string> = {
  "#core/": "src/core/",
  "#protocol/": "src/protocol/",
  "#project/": "src/project/",
};

function resolveSpec(fromFile: string, spec: string): string | null {
  if (spec.startsWith(".")) return path.posix.join(path.posix.dirname(fromFile), spec);
  if (spec.startsWith("@/")) return `src/${spec.slice(2)}`;
  for (const [prefix, folder] of Object.entries(SUBPATHS)) {
    if (spec.startsWith(prefix)) return `${folder}${spec.slice(prefix.length)}.ts`;
  }
  return null;
}

// Search request schemas and cost helpers the server shares with the app; the i18n config is their only import.
const SERVER_SHARED = new Set([
  "src/lib/search/types.ts",
  "src/lib/search/schema.ts",
  "src/lib/search/cost.ts",
  "src/i18n/config.ts",
]);

const RELATIVE_EXTENSIONS = [".ts", ".mjs", ".json"];
const FORBIDDEN_PACKAGES = ["react", "react-dom", "next"];

function checkImport(fromFile: string, spec: string, typeOnly: boolean): string | null {
  const from = moduleOf(fromFile);
  if (!isEnforced(from) || isExempt(fromFile)) return null;
  const outsideMatrix = OUTSIDE_MATRIX.some((entry) => inFolder(fromFile, entry));

  if (isPortable(fromFile)) {
    const forbidden =
      spec.startsWith("node:") ||
      spec.startsWith("@/") ||
      FORBIDDEN_PACKAGES.some((name) => spec === name || spec.startsWith(`${name}/`));
    if (forbidden) return `portable code cannot import '${spec}' (ADR-0014)`;
    if (spec.startsWith(".") && !RELATIVE_EXTENSIONS.some((ext) => spec.endsWith(ext))) {
      return `portable code needs a .ts, .mjs or .json extension on '${spec}' (ADR-0014)`;
    }
  }

  const resolved = resolveSpec(fromFile, spec);
  if (resolved === null) return null;
  if (!inFolder(resolved, "src") && !inFolder(resolved, "server")) {
    return `'${spec}' leaves the module tree`;
  }
  const to = moduleOf(resolved);
  if (to === from) return null;
  if (from === "server" && SERVER_SHARED.has(resolved)) return null;
  if (outsideMatrix) return null;
  if (!ALLOWED[from].has(to)) return `${from} -> ${to} is not allowed by SYSTEM 5.3 ('${spec}')`;
  if (from === "parts" && to === "project" && PARTS_TO_PROJECT_TYPE_ONLY && !typeOnly) {
    return `parts may only import types from project ('${spec}')`;
  }
  return null;
}

function checkDocblock(file: string, source: string): string | null {
  if (!file.endsWith(".test.ts") || !isPortable(file)) return null;
  const head = source.split("\n").slice(0, 3);
  return head.some((line) => line.trim() === "// @vitest-environment node")
    ? null
    : "a test in a portable folder must start with // @vitest-environment node";
}

const APPLY_FOLDER = "src/project/apply";

// FA-01: only the session may reach `apply`, so every change to a document goes through one place.
function checkApplyImport(fromFile: string, spec: string): string | null {
  if (isExempt(fromFile) || inFolder(fromFile, "server") || fromFile === "src/project/session.ts") return null;
  if (inFolder(fromFile, APPLY_FOLDER)) return null;
  const resolved = resolveSpec(fromFile, spec);
  return resolved !== null && inFolder(resolved, APPLY_FOLDER)
    ? `only src/project/session.ts may import '${spec}' (FA-01)`
    : null;
}

const SESSION_IMPORT = /\/session(\.ts)?$/;
const SESSION_FIELD_WRITE = /\.(state|revision)\s*=[^=]/;

// FA-01: a file that knows the session must not assign to its `state` or `revision`.
function checkSessionWrite(file: string, source: string, imports: FoundImport[]): string | null {
  if (file === "src/project/session.ts") return null;
  if (!imports.some(({ spec }) => SESSION_IMPORT.test(spec))) return null;
  const hit = SESSION_FIELD_WRITE.exec(maskSource(source));
  return hit ? `assigns '${hit[0].trim()}' next to a session import; only the session changes state (FA-01)` : null;
}

function walk(dir: string, into: string[]) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules") continue;
    const full = path.posix.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, into);
    else if (/\.tsx?$/.test(entry.name)) into.push(full);
  }
}

function sourceFiles(): string[] {
  const files: string[] = [];
  walk("src", files);
  walk("server", files);
  return files.filter((file) => !file.endsWith(".d.ts"));
}

interface Scan {
  files: Map<string, FoundImport[]>;
  violations: string[];
}

function scan(): Scan {
  const files = new Map<string, FoundImport[]>();
  const violations: string[] = [];
  for (const file of sourceFiles()) {
    const source = readFileSync(file, "utf8");
    const imports = importsOf(source);
    files.set(file, imports);
    for (const { spec, typeOnly, line } of imports) {
      const problem = checkImport(file, spec, typeOnly) ?? checkApplyImport(file, spec);
      if (problem) violations.push(`${file}:${line} ${problem}`);
    }
    const write = checkSessionWrite(file, source, imports);
    if (write) violations.push(`${file}:1 ${write}`);
    const docblock = checkDocblock(file, source);
    if (docblock) violations.push(`${file}:1 ${docblock}`);
  }
  return { files, violations };
}

function countImports(files: Scan["files"], folder: string, specPrefixes: string[]): number {
  let count = 0;
  for (const [file, imports] of files) {
    if (!inFolder(file, folder)) continue;
    count += imports.filter(({ spec }) => specPrefixes.some((prefix) => spec.startsWith(prefix))).length;
  }
  return count;
}

describe("importsOf", () => {
  const specs = (source: string) => importsOf(source).map(({ spec, typeOnly }) => [spec, typeOnly]);

  it("reads a single-line import", () => {
    expect(specs(`import { a } from "./a.ts";`)).toEqual([["./a.ts", false]]);
  });

  it("reads a multi-line import and reports its line", () => {
    const found = importsOf(`import {\n  a,\n  b,\n} from "./ab.ts";`);
    expect(found).toEqual([{ spec: "./ab.ts", typeOnly: false, line: 4 }]);
  });

  it("marks import type and export type as type only", () => {
    expect(specs(`import type { A } from "./a.ts";\nexport type { B } from "./b.ts";`)).toEqual([
      ["./a.ts", true],
      ["./b.ts", true],
    ]);
  });

  it("does not treat an inline type specifier as a type only import", () => {
    expect(specs(`import { type A, b } from "./a.ts";`)).toEqual([["./a.ts", false]]);
  });

  it("reads export star and re-exports", () => {
    expect(specs(`export * from "./a.ts";\nexport { b } from './b.ts';\nexport * as c from "./c.ts";`)).toEqual([
      ["./a.ts", false],
      ["./b.ts", false],
      ["./c.ts", false],
    ]);
  });

  it("reads a side-effect import", () => {
    expect(specs(`import "./setup.ts";`)).toEqual([["./setup.ts", false]]);
  });

  it("reads a dynamic import", () => {
    expect(specs(`const m = await import("./lazy.ts");`)).toEqual([["./lazy.ts", false]]);
  });

  it("ignores the word import in a comment", () => {
    const source = `// import x from "./no.ts"\n/* import y from "./no2.ts"\n*/\nimport z from "./yes.ts";`;
    expect(specs(source)).toEqual([["./yes.ts", false]]);
  });

  it("ignores import text inside a string", () => {
    const source = `const a = "import q from './no.ts'";\nconst b = \`import('./no2.ts')\`;\nexport const c = 1;`;
    expect(specs(source)).toEqual([]);
  });

  it("does not take a plain export for an import", () => {
    expect(specs(`export const a = 1;\nexport function f() { return 'x'; }\nimport b from "./b.ts";`)).toEqual([
      ["./b.ts", false],
    ]);
  });
});

describe("moduleOf and resolveSpec", () => {
  it("maps folders to modules", () => {
    expect(moduleOf("src/core/index.ts")).toBe("core");
    expect(moduleOf("src/sim-host/a.ts")).toBe("sim-host");
    expect(moduleOf("src/sim/a.ts")).toBe("sim");
    expect(moduleOf("src/components/studio/a.tsx")).toBe("studio");
    expect(moduleOf("src/components/ui/a.tsx")).toBe("ui");
    expect(moduleOf("src/app/[lang]/page.tsx")).toBe("ui");
    expect(moduleOf("src/i18n/server.ts")).toBe("content");
    expect(moduleOf("src/lib/search/a.ts")).toBe("labs");
    expect(moduleOf("server/src/a.ts")).toBe("server");
  });

  it("resolves relative, alias and subpath specs", () => {
    expect(resolveSpec("src/core/a.ts", "../project/b.ts")).toBe("src/project/b.ts");
    expect(resolveSpec("src/core/a.ts", "@/lib/x")).toBe("src/lib/x");
    expect(resolveSpec("src/project/a.ts", "#core/ids")).toBe("src/core/ids.ts");
    expect(resolveSpec("src/project/a.ts", "react")).toBeNull();
  });
});

describe("checkImport", () => {
  it("rejects core importing project", () => {
    expect(checkImport("src/core/a.ts", "../project/b.ts", false)).toMatch(/core -> project/);
  });

  it("allows project importing core", () => {
    expect(checkImport("src/project/a.ts", "../core/b.ts", false)).toBeNull();
    expect(checkImport("src/project/a.ts", "#core/b", false)).toBeNull();
  });

  it("lets parts import types from project but not values", () => {
    expect(checkImport("src/parts/a.ts", "../project/b.ts", false)).toMatch(/only import types/);
    expect(checkImport("src/parts/a.ts", "../project/b.ts", true)).toBeNull();
  });

  it("rejects react, next, node and the app alias in portable code", () => {
    for (const spec of ["react", "react-dom/client", "next/navigation", "node:fs", "@/lib/x"]) {
      expect(checkImport("src/project/a.ts", spec, false), spec).not.toBeNull();
    }
  });

  it("lets the server use node: imports (its transport is not portable)", () => {
    expect(checkImport("server/src/a.ts", "node:fs", false)).toBeNull();
  });

  it("needs an extension on a relative import in a portable folder", () => {
    expect(checkImport("src/core/a.ts", "./b", false)).toMatch(/extension/);
    expect(checkImport("src/core/a.ts", "./b.ts", false)).toBeNull();
    expect(checkImport("src/core/a.ts", "./data.json", false)).toBeNull();
    expect(checkImport("src/core/a.ts", "./b.mjs", false)).toBeNull();
  });

  it("keeps enforced modules away from content, ui and labs", () => {
    expect(checkImport("src/project/a.ts", "../content/x.ts", false)).not.toBeNull();
    expect(checkImport("server/src/a.ts", "../../src/components/x.tsx", false)).not.toBeNull();
    expect(checkImport("src/sim/a.ts", "../lib/x.ts", false)).not.toBeNull();
  });

  it("does not constrain the content, ui and labs rows", () => {
    expect(checkImport("src/content/schema.ts", "@/lib/drone/calc", false)).toBeNull();
    expect(checkImport("src/lib/a.ts", "@/components/x", true)).toBeNull();
  });

  it("holds project/convert to core", () => {
    expect(checkImport("src/project/convert/a.ts", "@/content/schema", false)).not.toBeNull();
  });

  it("exempts tests, test support and the project testing folder", () => {
    expect(checkImport("src/parts/data.test.ts", "../project/legacy-names.ts", false)).toBeNull();
    expect(checkImport("src/parts/a.ts", "../project/legacy-names.ts", false)).not.toBeNull();
    expect(checkImport("src/project/testing/harness.ts", "../../parts/builtin.ts", false)).toBeNull();
    expect(checkImport("src/core/a.testing.ts", "node:fs", false)).toBeNull();
  });
});

describe("checkDocblock", () => {
  it("wants the node environment line in a portable test", () => {
    expect(checkDocblock("src/core/a.test.ts", "import x from './x.ts';\n")).not.toBeNull();
    expect(checkDocblock("src/core/a.test.ts", "// @vitest-environment node\nimport x from './x.ts';\n")).toBeNull();
  });

  it("does not exempt a portable test from the docblock", () => {
    expect(checkDocblock("src/project/testing/a.test.ts", "export {};\n")).not.toBeNull();
  });

  it("ignores tests outside the portable folders and the browser loaders", () => {
    expect(checkDocblock("src/lib/a.test.ts", "export {};\n")).toBeNull();
    expect(checkDocblock("src/parts/browser/a.test.ts", "export {};\n")).toBeNull();
    expect(checkDocblock("src/core/a.testing.ts", "export {};\n")).toBeNull();
  });
});

describe("the FA-01 rules", () => {
  it("lets only the session import apply", () => {
    expect(checkApplyImport("src/project/session.ts", "./apply/index.ts")).toBeNull();
    expect(checkApplyImport("src/project/apply/net.ts", "./types.ts")).toBeNull();
    expect(checkApplyImport("src/project/testing/harness.ts", "../apply/index.ts")).toBeNull();
    expect(checkApplyImport("src/project/session.test.ts", "./apply/index.ts")).toBeNull();
    expect(checkApplyImport("server/src/room.ts", "../../src/project/apply/index.ts")).toBeNull();
  });

  it("rejects an import of apply from anywhere else", () => {
    expect(checkApplyImport("src/components/studio/a.tsx", "@/project/apply/index")).toMatch(/FA-01/);
    expect(checkApplyImport("src/project/netlist.ts", "./apply/index.ts")).toMatch(/FA-01/);
    expect(checkApplyImport("src/sim/a.ts", "#project/apply/net")).toMatch(/FA-01/);
    expect(checkApplyImport("src/parts/a.ts", "../project/apply/types.ts")).toMatch(/FA-01/);
  });

  it("leaves other project imports alone", () => {
    expect(checkApplyImport("src/sim/a.ts", "../project/hash.ts")).toBeNull();
  });

  it("flags an assignment to state or revision in a file that imports the session", () => {
    const imports = importsOf(`import { createSession } from "./session.ts";`);
    expect(checkSessionWrite("src/studio/a.ts", "session.state = next;", imports)).toMatch(/FA-01/);
    expect(checkSessionWrite("src/studio/a.ts", "s.revision = 4;", imports)).toMatch(/FA-01/);
    expect(checkSessionWrite("src/studio/a.ts", "if (s.revision == 4) {}", imports)).toBeNull();
    expect(checkSessionWrite("src/studio/a.ts", "// s.state = 1", imports)).toBeNull();
    expect(checkSessionWrite("src/project/session.ts", "x.state = 1;", imports)).toBeNull();
  });

  it("ignores files that do not import the session", () => {
    expect(checkSessionWrite("src/studio/a.ts", "box.state = 1;", [])).toBeNull();
  });
});

describe("the real tree", () => {
  const { files, violations } = scan();
  console.log(`architecture: ${files.size} files scanned`);

  it("has no import that breaks the matrix or the portable rules", () => {
    expect(violations.slice(0, 20)).toEqual([]);
  });

  // Lower these numbers when a lab moves; never raise them.
  it("holds the three ratchets", () => {
    const labsToComponents = countImports(files, "src/lib", ["@/components"]);
    const contentToUi = countImports(files, "src/content", ["@/lib", "@/components", "@/app"]);
    const labsToApp = countImports(files, "src/lib", ["@/app"]);
    console.log(
      `architecture ratchets: src/lib -> @/components ${labsToComponents} (max 35), ` +
        `src/content -> @/lib, @/components, @/app ${contentToUi} (max 112), src/lib -> @/app ${labsToApp} (max 4)`,
    );
    expect(labsToComponents).toBeLessThanOrEqual(35);
    expect(contentToUi).toBeLessThanOrEqual(112);
    expect(labsToApp).toBeLessThanOrEqual(4);
  });
});
