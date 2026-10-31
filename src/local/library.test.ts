import { describe, expect, it } from "vitest";
import { seededRandom } from "@/project/testing/harness";
import { validateValue } from "@/project/validate";
import { createLibrary, LibraryError } from "./library";
import type { Library } from "./library";
import { createMemoryRepository } from "./memory-repository";
import type { Repository } from "./repository";

const START = Date.parse("2026-10-28T09:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;

function setup() {
  const time = { now: START };
  const repo = createMemoryRepository();
  const library = createLibrary({ repo, clock: () => time.now, rnd: seededRandom(3), actor: "usr_owner" });
  return { library, repo, time };
}

async function failureOf(work: Promise<unknown>): Promise<LibraryError> {
  const error = await work.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(LibraryError);
  return error as LibraryError;
}

async function stored(repo: Repository, id: string) {
  const found = await repo.load(id);
  if (found.status !== "ok") throw new Error(`not stored: ${id}`);
  return found.rec;
}

describe("Library", () => {
  it("creates an Uno project that validates and lists it", async () => {
    const { library, repo } = setup();
    expect(await library.list()).toEqual([]);
    const id = await library.create({ board: "uno" });
    const rows = await library.list();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id, board: "core.uno-r3", name: "Untitled project", archived: false });
    const report = validateValue((await stored(repo, id)).doc);
    expect(report.ok).toBe(true);
  });

  it("refuses an empty or over-long title", async () => {
    const { library } = setup();
    expect((await failureOf(library.create({ board: "uno", title: "" }))).code).toBe("invalid");
    expect((await failureOf(library.create({ board: "uno", title: "x".repeat(121) }))).code).toBe("invalid");
    expect(await library.create({ board: "uno", title: "x".repeat(120) })).toMatch(/^prj_/);
  });

  it("lists the newest update first", async () => {
    const { library, time } = setup();
    const first = await library.create({ board: "uno", title: "First" });
    time.now += 1000;
    const second = await library.create({ board: "uno", title: "Second" });
    expect((await library.list()).map((r) => r.id)).toEqual([second, first]);
    time.now += 1000;
    await library.rename(first, "First again");
    expect((await library.list()).map((r) => r.id)).toEqual([first, second]);
  });

  it("renames through the session, which moves the revision", async () => {
    const { library, repo, time } = setup();
    const id = await library.create({ board: "uno", title: "Before" });
    const before = await stored(repo, id);
    time.now += 5000;
    await library.rename(id, "After");
    const after = await stored(repo, id);
    expect(after.doc.meta.title).toBe("After");
    expect(after.doc.revision).toBe(before.doc.revision + 1);
    expect(after.hash).not.toBe(before.hash);
    expect((await library.list())[0]?.name).toBe("After");
    expect(validateValue(after.doc).ok).toBe(true);
  });

  it("refuses to rename to a bad title or a trashed project", async () => {
    const { library } = setup();
    const id = await library.create({ board: "uno" });
    expect((await failureOf(library.rename(id, ""))).code).toBe("invalid");
    await library.trash(id);
    expect((await failureOf(library.rename(id, "Nope"))).code).toBe("not_found");
  });

  it("forks and leaves the source untouched", async () => {
    const { library, repo, time } = setup();
    const id = await library.create({ board: "uno", title: "Original" });
    const before = await stored(repo, id);
    time.now += 1000;
    const copy = await library.fork(id);
    expect(copy).not.toBe(id);
    expect(await stored(repo, id)).toEqual(before);
    const forked = await stored(repo, copy);
    expect(forked.doc.meta.title).toBe("Copy of Original");
    expect(forked.doc.provenance.origin).toMatchObject({ kind: "fork", project: id, stateHash: before.hash });
    expect((await library.list()).map((r) => r.id).sort()).toEqual([id, copy].sort());
    const named = await library.fork(id, { title: "Mine" });
    expect((await stored(repo, named)).doc.meta.title).toBe("Mine");
  });

  it("refuses to fork a project that is not there", async () => {
    const { library } = setup();
    expect((await failureOf(library.fork("prj_missing"))).code).toBe("not_found");
  });

  it("trashes, restores, and purges after 30 days", async () => {
    const { library, time } = setup();
    const id = await library.create({ board: "uno", title: "Gone soon" });
    time.now += 1000;
    await library.trash(id);
    expect(await library.list()).toEqual([]);
    expect(await library.trashList()).toEqual([{ id, name: "Gone soon", deletedAt: time.now }]);

    await library.restore(id);
    expect((await library.list()).map((r) => r.id)).toEqual([id]);
    expect((await failureOf(library.restore(id))).code).toBe("exists");

    await library.trash(id);
    time.now += 29 * DAY;
    expect(await library.purgeExpired()).toBe(0);
    time.now += 2 * DAY;
    expect(await library.purgeExpired()).toBe(1);
    expect(await library.trashList()).toEqual([]);
    expect((await failureOf(library.restore(id))).code).toBe("not_found");
  });

  it("empties the trash and says how many it removed", async () => {
    const { library } = setup();
    const a = await library.create({ board: "uno", title: "A" });
    const b = await library.create({ board: "uno", title: "B" });
    await library.trash(a);
    await library.trash(b);
    expect(await library.emptyTrash()).toBe(2);
    expect(await library.trashList()).toEqual([]);
  });

  it("is a Library", () => {
    const library: Library = setup().library;
    expect(Object.keys(library).sort()).toEqual(
      ["create", "emptyTrash", "fork", "forkDocument", "list", "purgeExpired", "rename", "restore", "trash", "trashList"],
    );
  });
});
