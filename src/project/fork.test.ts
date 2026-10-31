// @vitest-environment node
import { describe, expect, it } from "vitest";
import { forkProject } from "./fork.ts";
import { stateHash } from "./hash.ts";
import { sampleBlinkD12 } from "./samples.ts";
import type { Project } from "./generated/types.ts";
import { validateValue } from "./validate.ts";

const NOW = "2026-10-28T09:00:00.000Z";
const OPTIONS = { id: "prj_forked", now: NOW, actor: "usr_friend" };

function source(): Project {
  const report = validateValue(sampleBlinkD12());
  expect(report.ok).toBe(true);
  return report.doc as Project;
}

describe("forkProject", () => {
  it("makes a new project that names its source", () => {
    const src = source();
    const fork = forkProject(src, OPTIONS);
    expect(fork.id).toBe("prj_forked");
    expect(fork.revision).toBe(0);
    expect(fork.history.ops).toEqual([]);
    expect(fork.history.baseChain).toBe(stateHash(src));
    expect(fork.meta.createdAt).toBe(NOW);
    expect(fork.meta.updatedAt).toBe(NOW);
    expect(fork.access.owners).toEqual(["usr_friend"]);
    expect(fork.provenance.origin).toEqual({
      kind: "fork",
      project: src.id,
      revision: src.revision,
      stateHash: stateHash(src),
    });
  });

  it("leaves the source as it was", () => {
    const src = source();
    const before = structuredClone(src);
    forkProject(src, OPTIONS);
    expect(src).toEqual(before);
  });

  it("validates, and takes a new title", () => {
    const fork = forkProject(source(), { ...OPTIONS, title: "My copy" });
    expect(fork.meta.title).toBe("My copy");
    const report = validateValue(fork);
    expect(report.errors).toEqual(0);
    expect(report.ok).toBe(true);
  });

  it("keeps the content hash of the source", () => {
    const src = source();
    const fork = forkProject(src, OPTIONS);
    expect(fork.sources).toEqual(src.sources);
    expect(fork.components).toEqual(src.components);
  });
});
