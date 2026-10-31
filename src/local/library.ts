import type { Clock, RandomSource } from "@/core/ids";
import { newProjectId } from "@/core/ids";
import { blankProject } from "@/project/blank";
import { forkProject } from "@/project/fork";
import type { ForkOptions } from "@/project/fork";
import type { Project } from "@/project/generated/types";
import { canonicalBytes, stateHash } from "@/project/hash";
import { createSession } from "@/project/session";
import { validateValue } from "@/project/validate";
import type { IndexRow, ProjectRecord, Repository } from "./repository";

const TRASH_DAYS = 30;
const TRASH_MS = TRASH_DAYS * 24 * 60 * 60 * 1000;
const MAX_TITLE = 120;
const ID_TRIES = 3;
const DEFAULT_TITLE = "Untitled project";
const DEFAULT_LOCALE = "en";
const NEVER_KEPT = Number.MAX_SAFE_INTEGER;

export type LibraryRow = { id: string } & IndexRow;

export type LibraryErrorCode = "invalid" | "not_found" | "exists" | "unreadable" | "save_failed";

export class LibraryError extends Error {
  constructor(
    readonly code: LibraryErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "LibraryError";
  }
}

export interface Library {
  /** Newest `updatedAt` first; archived projects are left out. */
  list(): Promise<LibraryRow[]>;
  create(o: { board: "uno"; title?: string }): Promise<string>;
  rename(id: string, title: string): Promise<void>;
  /** Duplicate is fork. */
  fork(id: string, o?: { title?: string }): Promise<string>;
  /** Stores a fork of a document that is not the saved one, such as the local view before a rebase dropped work. */
  forkDocument(doc: Project, o?: { title?: string; origin?: ForkOptions["origin"] }): Promise<string>;
  trash(id: string): Promise<void>;
  restore(id: string): Promise<void>;
  emptyTrash(): Promise<number>;
  purgeExpired(): Promise<number>;
  trashList(): Promise<Array<{ id: string; name: string; deletedAt: number }>>;
}

export interface LibraryDeps {
  repo: Repository;
  clock: Clock;
  rnd: RandomSource;
  actor: string;
}

function checkTitle(title: string): string {
  if (title.length === 0 || title.length > MAX_TITLE) {
    throw new LibraryError("invalid", `a title is 1 to ${MAX_TITLE} characters`);
  }
  return title;
}

function rowOf(doc: Project, hash: string): IndexRow {
  return {
    name: doc.meta.title,
    updatedAt: doc.meta.updatedAt,
    hash,
    board: doc.boards[0]?.definition.ref ?? "",
    size: canonicalBytes(doc),
    hasFileCopy: false,
    archived: false,
  };
}

export function createLibrary({ repo, clock, rnd, actor }: LibraryDeps): Library {
  const stamp = () => new Date(clock()).toISOString();

  async function freshId(): Promise<string> {
    for (let i = 0; i < ID_TRIES; i++) {
      const id = newProjectId(clock(), rnd);
      if ((await repo.load(id)).status === "missing") return id;
    }
    throw new LibraryError("save_failed", "could not find a free project id");
  }

  async function store(doc: Project, expect: { revision: number; hash: string } | null): Promise<void> {
    const report = validateValue(doc);
    if (!report.ok) throw new LibraryError("invalid", report.first20[0]?.message ?? "the document does not validate");
    const hash = stateHash(doc);
    const rec: ProjectRecord = { doc, hash, writtenAt: clock() };
    const saved = await repo.save(doc.id, rec, rowOf(doc, hash), expect);
    if (!saved.ok) throw new LibraryError("save_failed", saved.detail);
  }

  async function open(id: string): Promise<ProjectRecord> {
    const found = await repo.load(id);
    if (found.status === "missing") throw new LibraryError("not_found", `no project ${id}`);
    if (found.status === "lost") throw new LibraryError("unreadable", `project ${id} cannot be read`);
    return found.rec;
  }

  async function forkDocument(doc: Project, o: { title?: string; origin?: ForkOptions["origin"] } = {}): Promise<string> {
    const title = o.title === undefined ? `Copy of ${doc.meta.title}`.slice(0, MAX_TITLE) : checkTitle(o.title);
    const source = validateValue(doc);
    if (!source.ok) throw new LibraryError("invalid", "the source document does not validate");
    const fork = forkProject(doc, { id: await freshId(), now: stamp(), actor, title, ...(o.origin && { origin: o.origin }) });
    await store(fork, null);
    return fork.id;
  }

  return {
    async list() {
      const rows = await repo.list();
      return rows
        .filter((row) => !row.archived)
        .sort((a, b) => (a.updatedAt === b.updatedAt ? (a.id < b.id ? 1 : -1) : a.updatedAt < b.updatedAt ? 1 : -1));
    },

    async create({ board, title = DEFAULT_TITLE }) {
      const doc = blankProject({ board, title: checkTitle(title), locale: DEFAULT_LOCALE, actor, now: stamp(), id: await freshId() });
      await store(doc, null);
      return doc.id;
    },

    async rename(id, title) {
      const { doc, hash } = await open(id);
      const session = createSession({ state: doc, clock, rnd });
      const applied = session.apply({ k: "meta.set", set: { title: checkTitle(title) } }, { actor, kind: "user" });
      if (!applied.ok) throw new LibraryError("invalid", applied.message);
      await store(session.state, { revision: doc.revision, hash });
    },

    async fork(id, o = {}) {
      const { doc } = await open(id);
      return forkDocument(doc, o);
    },

    forkDocument,

    async trash(id) {
      await repo.remove(id, clock());
    },

    async restore(id) {
      if ((await repo.load(id)).status !== "missing") throw new LibraryError("exists", `project ${id} is not in the trash`);
      if (!(await repo.listTrash()).some((row) => row.id === id)) throw new LibraryError("not_found", `no trashed project ${id}`);
      await repo.restore(id);
    },

    emptyTrash: () => repo.purgeTrash(NEVER_KEPT),
    purgeExpired: () => repo.purgeTrash(clock() - TRASH_MS),
    trashList: () => repo.listTrash(),
  };
}
