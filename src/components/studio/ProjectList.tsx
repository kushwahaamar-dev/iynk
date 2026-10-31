"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Button, Callout, Chip, EmptyState, Meter, Panel, Skeleton, SkeletonGroup, TextInput } from "@/components/ui";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/namespaces";
import { createTranslator, type Translate } from "@/i18n/translate";
import { createKeysBackend } from "@/local/keys-backend";
import { openDb } from "@/local/db";
import { openFile, saveToFile } from "@/local/files";
import { LibraryError, type LibraryRow } from "@/local/library";
import { createProjectHost, type ProjectHost } from "@/local/project-host";
import type { ProjectEv } from "@/local/project-protocol";
import { fileNudgeDue } from "@/local/storage-health";
import { createTabSync } from "@/local/tab-sync";
import { hydrateKeys } from "@/lib/keys";

export type StudioStrings = Messages["studio"];

export interface ProjectListProps {
  strings: StudioStrings;
  lang: Locale;
  /** Tests pass a host over a memory repository; the page starts the real one. */
  host?: ProjectHost;
  /** Makes the project New project adds and returns its id. Without it the library makes a blank one. */
  onNew?: () => Promise<string>;
  /** Called with the id of a project to show in the editor: after New project, and by a row's Open. Without it Open shows the details panel. */
  onOpen?: (id: string) => void;
  /** Shown in the empty state under its text: the way to start when there is nothing yet. */
  emptyAction?: ReactNode;
  /** Read the stored AI and search keys on mount. Defaults to on when the list starts its own host. */
  hydrate?: boolean;
}

type Phase = "loading" | "ready" | "error";

type Banner =
  | { kind: "degraded" }
  | { kind: "recovered"; id: string }
  | { kind: "lost"; id: string }
  | { kind: "quota" }
  | { kind: "otherTab" }
  | { kind: "newer"; name: string; raw: Uint8Array }
  | { kind: "import"; name: string; reason: "TooLarge" | "Damaged" };

interface TrashRow {
  id: string;
  name: string;
  deletedAt: number;
}

interface Selected {
  name: string;
  board: string;
  revision: number;
  hash: string;
}

interface Renaming {
  id: string;
  value: string;
  invalid: boolean;
}

const TAB_CHANNEL = "iynk:projects";
const UNO_REF = "core.uno-r3";
const MAX_TITLE = 120;
const HASH_PREFIX = 8;
const TOO_LARGE_KINDS: readonly string[] = ["too-large", "entry-too-large", "zip-bomb", "ratio", "too-many-entries"];

let sharedHost: ProjectHost | null = null;

function startHost(): ProjectHost {
  sharedHost ??= createProjectHost();
  return sharedHost;
}

const bannerKey = (b: Banner) => ("id" in b ? `${b.kind}:${b.id}` : b.kind);

function formatBytes(lang: Locale, bytes: number): string {
  const units = ["byte", "kilobyte", "megabyte", "gigabyte"] as const;
  let value = bytes;
  let step = 0;
  while (value >= 1000 && step < units.length - 1) {
    value /= 1000;
    step++;
  }
  return new Intl.NumberFormat(lang, { style: "unit", unit: units[step], unitDisplay: "short", maximumFractionDigits: step === 0 ? 0 : 1 }).format(value);
}

const fileName = (title: string) => `${title.replace(/[^\p{L}\p{N}_-]+/gu, "-").replace(/^-+|-+$/g, "") || "project"}.iynk`;

const isCancel = (err: unknown) => err instanceof DOMException && err.name === "AbortError";

async function hydrateStoredKeys(): Promise<void> {
  try {
    await hydrateKeys(createKeysBackend(await openDb()));
  } catch {
    // Without the database the keys stay where they are.
  }
}

export function ProjectList({ strings, lang, host: injected, onNew, onOpen, emptyAction, hydrate = !injected }: ProjectListProps) {
  const t = useMemo(() => createTranslator(lang, strings, `${lang}/studio`), [lang, strings]);
  const [host] = useState(() => injected ?? startHost());
  const [phase, setPhase] = useState<Phase>("loading");
  const [rows, setRows] = useState<LibraryRow[]>([]);
  const [trash, setTrash] = useState<TrashRow[]>([]);
  const [usage, setUsage] = useState<{ usage: number; quota: number } | null>(null);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<Selected | null>(null);
  const [renaming, setRenaming] = useState<Renaming | null>(null);
  const [firstSeen, setFirstSeen] = useState<Record<string, number>>({});
  const [now, setNow] = useState(() => Date.now());
  const persisted = useRef(false);
  const newButton = useRef<HTMLButtonElement>(null);
  const focusedEmpty = useRef(false);

  const addBanner = useCallback((banner: Banner) => {
    setBanners((all) => (all.some((b) => bannerKey(b) === bannerKey(banner)) ? all : [...all, banner]));
  }, []);

  const refresh = useCallback(async (): Promise<LibraryRow[]> => {
    const [list, trashed, space] = await Promise.all([host.library.list(), host.library.trashList(), host.health.estimate()]);
    const at = Date.now();
    setRows(list);
    setTrash(trashed);
    setUsage(space);
    setNow(at);
    setFirstSeen((seen) => Object.fromEntries(list.filter((row) => !row.hasFileCopy).map((row) => [row.id, seen[row.id] ?? at])));
    return list;
  }, [host]);

  useEffect(() => {
    const onEvent = (ev: ProjectEv) => {
      if (ev.t === "degraded") addBanner({ kind: "degraded" });
      else if (ev.t === "recovered_from_previous") addBanner({ kind: "recovered", id: ev.projectId });
      else if (ev.t === "record_lost") addBanner({ kind: "lost", id: ev.projectId });
      else if (ev.t === "save_failed" && ev.kind === "quota") addBanner({ kind: "quota" });
    };
    const off = host.onEvent(onEvent);
    const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(TAB_CHANNEL);
    const offTab = createTabSync(channel).onOther(() => {
      addBanner({ kind: "otherTab" });
      void refresh().catch(() => undefined);
    });
    let live = true;
    (async () => {
      if (hydrate) await hydrateStoredKeys();
      await host.library.purgeExpired();
      await refresh();
      if (live) setPhase("ready");
    })().catch(() => live && setPhase("error"));
    const tick = setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      live = false;
      off();
      offTab();
      channel?.close();
      clearInterval(tick);
    };
  }, [host, hydrate, addBanner, refresh]);

  useEffect(() => {
    if (phase === "ready" && rows.length === 0 && !focusedEmpty.current) {
      focusedEmpty.current = true;
      newButton.current?.focus();
    }
  }, [phase, rows.length]);

  const nameOf = (id: string, list: readonly { id: string; name: string }[] = rows) => list.find((row) => row.id === id)?.name ?? id;

  async function run(key: string, work: () => Promise<string | null>) {
    setBusy(key);
    setErrors(({ [key]: _gone, ...rest }) => rest);
    try {
      const done = await work();
      await refresh();
      if (done) setNotice(done);
    } catch (err) {
      if (isCancel(err)) return;
      if (err instanceof LibraryError && err.code === "save_failed") addBanner({ kind: "quota" });
      setErrors((all) => ({ ...all, [key]: t("row.failed") }));
    } finally {
      setBusy(null);
    }
  }

  function keepAsked() {
    if (persisted.current) return;
    persisted.current = true;
    void host.health.persist().catch(() => undefined);
  }

  const created = async (id: string, message: "created" | "duplicated" | "imported" | "importedForked") => {
    keepAsked();
    const list = await refresh();
    return t(`status.${message}`, { name: nameOf(id, list) });
  };

  const createProject = () =>
    run("new", async () => {
      const id = await (onNew ? onNew() : host.library.create({ board: "uno", title: t("newName") }));
      const message = await created(id, "created");
      onOpen?.(id);
      return message;
    });

  const duplicate = (row: LibraryRow) => run(row.id, async () => created(await host.library.fork(row.id), "duplicated"));

  const trashRow = (row: LibraryRow) =>
    run(row.id, async () => {
      await host.library.trash(row.id);
      if (selected?.name === row.name) setSelected(null);
      return t("status.trashed", { name: row.name });
    });

  const restore = (row: TrashRow) =>
    run(row.id, async () => {
      await host.library.restore(row.id);
      return t("status.restored", { name: row.name });
    });

  const emptyTrash = () =>
    run("trash", async () => {
      await host.library.emptyTrash();
      return t("trash.empty");
    });

  const saveRow = (row: LibraryRow) =>
    run(row.id, async () => {
      await saveToFile(await host.files.exportProject(row.id, "iynk"), fileName(row.name));
      await host.files.markFileCopy(row.id, true);
      return t("status.savedToFile", { name: row.name });
    });

  const showDetails = (row: LibraryRow) =>
    run(row.id, async () => {
      const loaded = await host.load(row.id);
      if (!loaded.state || loaded.revision === undefined || !loaded.hash) throw new Error("unreadable");
      setSelected({
        name: loaded.state.meta.title,
        board: loaded.state.boards[0]?.definition.ref ?? "",
        revision: loaded.revision,
        hash: loaded.hash,
      });
      return null;
    });

  const openRow = (row: LibraryRow) => (onOpen ? onOpen(row.id) : showDetails(row));

  const importFile = () =>
    run("file", async () => {
      const file = await openFile();
      if (!file) return null;
      const outcome = await host.files.importBytes(file.bytes, file.name);
      if (outcome.ok) return created(outcome.id, outcome.forked ? "importedForked" : "imported");
      if (outcome.error.kind === "newer-schema") addBanner({ kind: "newer", name: file.name, raw: outcome.raw });
      else addBanner({ kind: "import", name: file.name, reason: TOO_LARGE_KINDS.includes(outcome.error.kind) ? "TooLarge" : "Damaged" });
      return null;
    });

  function submitRename(event: FormEvent) {
    event.preventDefault();
    if (!renaming) return;
    const title = renaming.value.trim();
    if (title.length === 0 || title.length > MAX_TITLE) {
      setRenaming({ ...renaming, invalid: true });
      return;
    }
    setRenaming(null);
    void run(renaming.id, async () => {
      await host.library.rename(renaming.id, title);
      return t("status.renamed", { name: title });
    });
  }

  const boardName = (ref: string) => (ref === UNO_REF ? t("board.unoR3") : ref);
  const nudgeDue = rows.some((row) => fileNudgeDue(row, firstSeen[row.id] ?? null, now));
  const anyBusy = busy !== null;

  return (
    <div className="mt-8 flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        {banners.map((banner) => (
          <BannerView
            key={bannerKey(banner)}
            banner={banner}
            t={t}
            name={"id" in banner ? nameOf(banner.id) : ""}
            onDismiss={() => setBanners((all) => all.filter((b) => b !== banner))}
          />
        ))}
        {nudgeDue ? (
          <Callout tone="note" title={t("banner.fileTitle")} live>
            {t("banner.file")}
          </Callout>
        ) : null}
      </div>

      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="flex flex-wrap gap-3">
          <Button ref={newButton} variant={emptyAction && phase === "ready" && rows.length === 0 ? "secondary" : "primary"} onClick={createProject} disabled={anyBusy} aria-busy={busy === "new"}>
            {t("newProject")}
          </Button>
          <Button onClick={importFile} disabled={anyBusy} aria-busy={busy === "file"}>
            {t("openFromFile")}
          </Button>
        </div>
        <div className="w-full max-w-xs">
          {usage ? (
            <Meter
              label={t("storage.label")}
              value={usage.usage}
              max={usage.quota}
              valueText={t("storage.value", { used: formatBytes(lang, usage.usage), quota: formatBytes(lang, usage.quota) })}
              warn={usage.quota * 0.8}
              danger={usage.quota * 0.95}
            />
          ) : phase === "ready" ? (
            <p className="text-sm text-muted">{t("storage.unknown")}</p>
          ) : null}
        </div>
      </div>
      {errors.new || errors.file ? (
        <p role="alert" className="text-sm text-bad">
          {errors.new ?? errors.file}
        </p>
      ) : null}

      <section aria-labelledby="studio-projects">
        <h2 id="studio-projects" className="text-xl font-semibold">
          {t("list.title")}
        </h2>
        {phase === "loading" ? (
          <SkeletonGroup label={t("list.loading")} className="mt-4 flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </SkeletonGroup>
        ) : phase === "error" ? (
          <Callout tone="danger" className="mt-4" live>
            {t("list.failed")}
          </Callout>
        ) : rows.length === 0 ? (
          <EmptyState bordered className="mt-4" title={t("list.emptyTitle")} action={emptyAction}>
            {t("list.emptyBody")}
          </EmptyState>
        ) : (
          <table data-testid="project-list" className="mt-4 w-full border-collapse text-start">
            <caption className="sr-only">{t("list.title")}</caption>
            <thead className="max-md:sr-only">
              <tr className="text-start text-sm text-muted">
                <th scope="col" className="py-2 pe-4 text-start font-medium">{t("list.columns.name")}</th>
                <th scope="col" className="py-2 pe-4 text-start font-medium">{t("list.columns.board")}</th>
                <th scope="col" className="py-2 pe-4 text-start font-medium">{t("list.columns.size")}</th>
                <th scope="col" className="py-2 pe-4 text-start font-medium">{t("list.columns.file")}</th>
                <th scope="col" className="py-2 text-start font-medium">{t("list.columns.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} aria-busy={busy === row.id} className="border-t border-rule align-top max-md:block max-md:py-3">
                  <td className="py-3 pe-4 max-md:block max-md:py-0">
                    {renaming?.id === row.id ? (
                      <form onSubmit={submitRename} className="flex flex-wrap items-end gap-2">
                        <TextInput
                          label={t("rename.label", { name: row.name })}
                          value={renaming.value}
                          onChange={(e) => setRenaming({ ...renaming, value: e.target.value, invalid: false })}
                          aria-invalid={renaming.invalid}
                          aria-describedby={renaming.invalid ? `rename-${row.id}` : undefined}
                          autoFocus
                        />
                        <Button type="submit" size="sm" variant="primary">
                          {t("rename.save")}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setRenaming(null)}>
                          {t("rename.cancel")}
                        </Button>
                        {renaming.invalid ? (
                          <p id={`rename-${row.id}`} role="alert" className="w-full text-sm text-bad">
                            {t("rename.invalid")}
                          </p>
                        ) : null}
                      </form>
                    ) : (
                      <span className="font-semibold [overflow-wrap:anywhere]">{row.name}</span>
                    )}
                    <span className="mt-1 block text-sm text-muted md:hidden">
                      {boardName(row.board)} · {formatBytes(lang, row.size)}
                    </span>
                    {errors[row.id] ? (
                      <p role="alert" className="mt-1 text-sm text-bad">
                        {errors[row.id]}
                      </p>
                    ) : null}
                  </td>
                  <td className="py-3 pe-4 text-muted max-md:hidden">{boardName(row.board)}</td>
                  <td className="tabular py-3 pe-4 text-muted max-md:hidden">{formatBytes(lang, row.size)}</td>
                  <td className="py-3 pe-4 max-md:mt-2 max-md:block max-md:py-0">
                    <Chip tone={row.hasFileCopy ? "good" : "neutral"}>
                      {row.hasFileCopy ? t("list.savedToFile") : t("list.notSavedToFile")}
                    </Chip>
                  </td>
                  <td className="py-3 max-md:mt-2 max-md:block max-md:py-0">
                    <div className="flex flex-wrap gap-1">
                      <Button size="sm" variant="ghost" aria-label={t("row.open", { name: row.name })} disabled={anyBusy} onClick={() => void openRow(row)}>
                        {t("row.openText")}
                      </Button>
                      <Button size="sm" variant="ghost" aria-label={t("row.saveToFile", { name: row.name })} disabled={anyBusy} onClick={() => void saveRow(row)}>
                        {t("row.saveToFileText")}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={t("row.rename", { name: row.name })}
                        disabled={anyBusy}
                        onClick={() => setRenaming({ id: row.id, value: row.name, invalid: false })}
                      >
                        {t("row.renameText")}
                      </Button>
                      <Button size="sm" variant="ghost" aria-label={t("row.duplicate", { name: row.name })} disabled={anyBusy} onClick={() => void duplicate(row)}>
                        {t("row.duplicateText")}
                      </Button>
                      <Button size="sm" variant="ghost" aria-label={t("row.delete", { name: row.name })} disabled={anyBusy} onClick={() => void trashRow(row)}>
                        {t("row.deleteText")}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {selected ? (
        <Panel
          title={t("selected.title")}
          titleId="studio-selected"
          actions={
            <Button size="sm" variant="ghost" onClick={() => setSelected(null)}>
              {t("selected.close")}
            </Button>
          }
        >
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="text-muted">{t("selected.name")}</dt>
            <dd className="font-semibold [overflow-wrap:anywhere]">{selected.name}</dd>
            <dt className="text-muted">{t("selected.board")}</dt>
            <dd>{boardName(selected.board)}</dd>
            <dt className="text-muted">{t("selected.revision")}</dt>
            <dd className="tabular font-mono">{selected.revision}</dd>
            <dt className="text-muted">{t("selected.hash")}</dt>
            <dd className="tabular font-mono">{selected.hash.slice(0, HASH_PREFIX)}</dd>
          </dl>
          <p className="mt-4 text-sm text-muted">{t("selected.noEditor")}</p>
        </Panel>
      ) : null}

      <section aria-labelledby="studio-trash">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="studio-trash" className="text-xl font-semibold">
            {t("trash.title")}
          </h2>
          {trash.length > 0 ? (
            <Button size="sm" onClick={() => void emptyTrash()} disabled={anyBusy}>
              {t("trash.emptyTrash")}
            </Button>
          ) : null}
        </div>
        <p className="mt-1 text-sm text-muted">{t("trash.lede")}</p>
        {trash.length === 0 ? (
          <p className="mt-4 text-sm text-muted">{t("trash.empty")}</p>
        ) : (
          <ul data-testid="trash-list" className="mt-4 border-b border-rule">
            {trash.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-rule py-2">
                <span className="font-semibold [overflow-wrap:anywhere]">{row.name}</span>
                <Button size="sm" variant="ghost" aria-label={t("trash.restore", { name: row.name })} disabled={anyBusy} onClick={() => void restore(row)}>
                  {t("trash.restoreText")}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p role="status" className="sr-only">
        {notice}
      </p>
    </div>
  );
}

function BannerView({ banner, t, name, onDismiss }: { banner: Banner; t: Translate<StudioStrings>; name: string; onDismiss: () => void }) {
  const dismiss = (
    <Button size="sm" variant="ghost" onClick={onDismiss}>
      {t("banner.dismiss")}
    </Button>
  );

  switch (banner.kind) {
    case "degraded":
      return (
        <Callout tone="warn" title={t("banner.degradedTitle")} live>
          {t("banner.degraded")} {dismiss}
        </Callout>
      );
    case "recovered":
      return (
        <Callout tone="warn" title={t("banner.recoveredTitle")} live>
          {t("banner.recovered", { name })} {dismiss}
        </Callout>
      );
    case "lost":
      return (
        <Callout tone="danger" title={t("banner.lostTitle")} live>
          {t("banner.lost", { name })} {dismiss}
        </Callout>
      );
    case "quota":
      return (
        <Callout tone="danger" title={t("banner.quotaTitle")} live>
          {t("banner.quota")} {dismiss}
        </Callout>
      );
    case "otherTab":
      return (
        <Callout tone="note" title={t("banner.otherTabTitle")} live>
          {t("banner.otherTab")} {dismiss}
        </Callout>
      );
    case "newer":
      return (
        <Callout tone="warn" title={t("banner.newerTitle")} live>
          {t("banner.newer", { name: banner.name })}{" "}
          <Button size="sm" onClick={() => void saveToFile(banner.raw, banner.name).catch(() => undefined)}>
            {t("banner.newerDownload", { name: banner.name })}
          </Button>{" "}
          {dismiss}
        </Callout>
      );
    case "import":
      return (
        <Callout tone="warn" title={t("banner.importTitle")} live>
          {t(banner.reason === "TooLarge" ? "banner.importTooLarge" : "banner.importDamaged", { name: banner.name })} {dismiss}
        </Callout>
      );
  }
}
