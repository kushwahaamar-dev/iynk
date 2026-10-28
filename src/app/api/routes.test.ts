// @vitest-environment node
import { readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ROUTE_CLASSES } from "@/lib/server/access";

function routeFiles(dir: string, base = dir): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return routeFiles(full, base);
    return entry.name === "route.ts" ? [path.relative(base, full).split(path.sep).join("/")] : [];
  });
}

describe("route classes", () => {
  const found = routeFiles(__dirname).sort();
  const listed = Object.keys(ROUTE_CLASSES).sort();

  it("lists every route file", () => {
    expect(found.filter((f) => !listed.includes(f)), "route files with no class in ROUTE_CLASSES").toEqual([]);
  });

  it("lists no route file that is gone", () => {
    expect(listed.filter((f) => !found.includes(f)), "ROUTE_CLASSES rows with no route file").toEqual([]);
  });

  it("uses only known classes", () => {
    const known = ["local-only", "needs-server-token", "needs-user-key"];
    for (const [file, cls] of Object.entries(ROUTE_CLASSES)) expect(known, file).toContain(cls);
  });
});
