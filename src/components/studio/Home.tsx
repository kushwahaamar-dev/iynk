"use client";

import { useMemo, useRef, useState, type DragEvent } from "react";
import { Button, Dialog, Icon } from "@/components/ui";
import { cryptoRandom, newId, newProjectId } from "@/core/ids";
import { LIMITS } from "@/core/limits";
import { importIno, type InoFile, type InoImport } from "@/export/ino";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/namespaces";
import { createTranslator, type MessageKey } from "@/i18n/translate";
import { writeIynk } from "@/export/iynk";
import { PROFILES, type BoardId } from "@/lib/interp/profiles";
import { builtinRegistry } from "@/parts/builtin";
import { blankProject } from "@/project/blank";
import { forkProject } from "@/project/fork";
import type { Op, Project, SourceLanguage } from "@/project/generated/types";
import { createSession } from "@/project/session";
import { STARTERS as STARTER_ENTRIES, starterFor } from "@/studio/starters";
import { LOCAL_ACTOR, loadStarter, newUnoProject, STARTERS, type StarterDef } from "@/studio/templates";
import { analyserFor, inoErrorKey } from "./inoAnalyser";
import { LossReport } from "./LossReport";
import { ProjectList, type StudioStrings } from "./ProjectList";
import { useServices } from "./wiring/services";

export interface HomeProps {
  messages: Messages["studioHome"];
  strings: StudioStrings;
  lang: Locale;
  /** Shows a stored project in the editor. `run` asks the workspace to start it. */
  onOpen(id: string, opts?: { run?: boolean }): void;
}

type StarterKey = MessageKey<Messages["studioHome"]>;

const FIRST_RUN = "blink";
const DEFAULT_BOARD = "uno-r3";
const ENTRY_PATH = "main.ino";
const INO_ACCEPT = ".ino,.h,.hpp,.c,.cpp";
// A character takes at most four bytes in UTF-8.
const MAX_FILE_BYTES = LIMITS.sourceBytes * 4;
const SOURCE_LANGUAGES: Record<string, SourceLanguage> = { ".ino": "arduino-cpp", ".c": "c" };

const boardOptions = [DEFAULT_BOARD, ...STARTER_ENTRIES.map((entry) => entry.board)]
  .filter((id, index, all) => all.indexOf(id) === index)
  .map((id) => ({ id, label: PROFILES[id as BoardId]?.name ?? id }));

const languageOf = (path: string): SourceLanguage => SOURCE_LANGUAGES[path.slice(path.lastIndexOf(".")).toLowerCase()] ?? "cpp";

type Review = { files: InoFile[]; imported: InoImport };

/** The text of the sketch put into a new project on its board, through the same ops an edit would use. */
async function projectFromIno(imported: InoImport, lang: string, now: string): Promise<Project> {
  let base: Project;
  const starter = imported.board === DEFAULT_BOARD ? undefined : starterFor(imported.board);
  if (starter) {
    const source = ((await starter.load()) as { default: Project }).default;
    base = forkProject(source, { id: newProjectId(Date.parse(now), cryptoRandom), now, actor: LOCAL_ACTOR });
    base.meta.kind = "project";
  } else {
    const blank = blankProject({
      board: "uno",
      title: imported.title,
      locale: lang,
      actor: LOCAL_ACTOR,
      now,
      id: newProjectId(Date.now(), cryptoRandom),
    });
    base = newUnoProject(blank, { registry: builtinRegistry(), rnd: cryptoRandom });
  }

  const board = base.boards[0]!;
  const firmware = board.firmware!;
  const entry = base.sources.find((source) => source.id === firmware.entry)!;
  const [first, ...rest] = imported.sources;
  const extra = rest.map((source) => ({
    id: newId("src", cryptoRandom),
    path: source.path,
    language: languageOf(source.path),
    role: source.role,
    board: board.id,
    content: source.text,
  }));
  const ops: Op[] = [
    { k: "meta.set", set: { title: imported.title } },
    { k: "source.edit", id: entry.id, baseSeq: base.revision, pos: 0, del: entry.content.length, ins: first!.text },
    ...(entry.path === ENTRY_PATH ? [] : [{ k: "source.rename", id: entry.id, path: ENTRY_PATH } as const]),
    ...extra.map((source) => ({ k: "source.add", source }) as const),
    { k: "board.set", id: board.id, firmware: { ...firmware, sources: [entry.id, ...extra.map((source) => source.id)] } },
  ];
  const session = createSession({ state: base, clock: () => Date.parse(now), rnd: cryptoRandom });
  const done = session.apply(ops, { actor: LOCAL_ACTOR, kind: "user" });
  if (!done.ok) throw new Error(`${done.reject}: ${done.message}`);
  return session.state;
}

export function Home({ messages, strings, lang, onOpen }: HomeProps) {
  const { host, files } = useServices();
  const t = useMemo(() => createTranslator(lang, messages, `${lang}/studioHome`), [lang, messages]);
  const [starting, setStarting] = useState<StarterDef | null>(null);
  const [failed, setFailed] = useState<StarterDef | null>(null);
  const ts = useMemo(() => createTranslator(lang, strings, `${lang}/studio`), [lang, strings]);
  const [review, setReview] = useState<Review | null>(null);
  const [reading, setReading] = useState(false);
  const [inoError, setInoError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const creating = useRef<Promise<string> | null>(null);

  async function store(project: Project): Promise<string> {
    const outcome = await files.importBytes(writeIynk(project), `${project.meta.title}.iynk`);
    if (!outcome.ok) throw new Error(outcome.error.message);
    return outcome.id;
  }

  // Two quick clicks share one creation.
  const createUno = () => {
    creating.current ??= (async () => {
      const blank = blankProject({
        board: "uno",
        title: strings.newName,
        locale: lang,
        actor: LOCAL_ACTOR,
        now: new Date().toISOString(),
        id: newProjectId(Date.now(), cryptoRandom),
      });
      return store(newUnoProject(blank, { registry: builtinRegistry(), rnd: cryptoRandom }));
    })().finally(() => {
      creating.current = null;
    });
    return creating.current;
  };

  async function startFrom(def: StarterDef, run: boolean) {
    if (creating.current) return;
    setStarting(def);
    setFailed(null);
    try {
      creating.current = loadStarter(def.id, { rnd: cryptoRandom, now: new Date().toISOString(), actor: LOCAL_ACTOR }).then(store);
      const id = await creating.current;
      onOpen(id, run ? { run: true } : undefined);
    } catch {
      setFailed(def);
    } finally {
      creating.current = null;
      setStarting(null);
    }
  }

  function analyse(files: InoFile[], board?: string) {
    const outcome = importIno(files, analyserFor(), { board });
    if (!outcome.ok) {
      const { code, file, limit } = outcome.error;
      setInoError(ts(inoErrorKey(code) as MessageKey<StudioStrings>, { name: file ?? "", max: limit ?? 0 }));
      return null;
    }
    return outcome.value;
  }

  async function readSketch(list: FileList | File[]) {
    const picked = [...list];
    if (picked.length === 0 || reading || creating.current) return;
    setReading(true);
    setInoError(null);
    try {
      const oversized = picked.find((file) => file.size > MAX_FILE_BYTES);
      if (oversized) {
        setInoError(ts("ino.tooBig", { max: LIMITS.sourceBytes }));
        return;
      }
      const files = await Promise.all(picked.map(async (file) => ({ name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) })));
      let imported = analyse(files);
      if (imported && !boardOptions.some((option) => option.id === imported!.board)) imported = analyse(files, DEFAULT_BOARD);
      if (imported) setReview({ files, imported });
    } catch {
      setInoError(ts("ino.notText"));
    } finally {
      setReading(false);
    }
  }

  function changeBoard(board: string) {
    if (!review) return;
    const imported = analyse(review.files, board);
    if (imported) setReview({ files: review.files, imported });
  }

  async function confirmImport() {
    if (!review || creating.current) return;
    const { imported } = review;
    try {
      creating.current = projectFromIno(imported, lang, new Date().toISOString()).then(store);
      const id = await creating.current;
      setReview(null);
      onOpen(id);
    } catch {
      setInoError(ts("row.failed"));
    } finally {
      creating.current = null;
    }
  }

  function dropSketch(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    void readSketch(event.dataTransfer.files);
  }

  const titleOf = (def: StarterDef) => t(def.titleKey as StarterKey);

  return (
    <div className="flex flex-col gap-12">
      <ProjectList
        strings={strings}
        lang={lang}
        host={host}
        hydrate
        onNew={createUno}
        onOpen={onOpen}
        emptyAction={
          <Button variant="primary" onClick={() => void startFrom(STARTERS.find((s) => s.id === FIRST_RUN)!, true)} disabled={starting !== null}>
            {t("starters.first.action")}
          </Button>
        }
      />

      <section aria-labelledby="studio-starters">
        <h2 id="studio-starters" className="text-xl font-semibold text-balance">
          {t("starters.title")}
        </h2>
        <p className="mt-1 max-w-prose text-base text-pretty text-muted">{t("starters.lede")}</p>
        <ul aria-label={t("starters.listLabel")} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {STARTERS.map((def) => (
            <li key={def.id} className="flex">
              <button
                type="button"
                onClick={() => void startFrom(def, false)}
                disabled={starting !== null}
                aria-busy={starting?.id === def.id}
                className="flex w-full flex-col gap-1 rounded-2xl border border-rule bg-surface p-4 text-start motion-fade enabled:hover:bg-hover enabled:active:scale-98 enabled:active:motion-press disabled:cursor-not-allowed disabled:opacity-50 aria-busy:opacity-100 aria-busy:animate-pulse motion-reduce:aria-busy:animate-none"
              >
                <span className="flex items-center justify-between gap-2 text-base font-semibold">
                  {titleOf(def)}
                  <Icon name="arrow-right" size={16} className="shrink-0 text-muted" aria-hidden="true" />
                </span>
                <span className="text-sm text-pretty text-muted">{t(def.descriptionKey as StarterKey)}</span>
              </button>
            </li>
          ))}
        </ul>
        {failed ? (
          <p role="alert" className="mt-4 text-sm text-bad">
            {t("starters.failed", { name: titleOf(failed) })}
          </p>
        ) : null}
      </section>

      <section
        aria-label={ts("ino.import")}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={dropSketch}
        className={`flex flex-wrap items-center gap-3 rounded-2xl border border-dashed p-4 motion-fade ${dragging ? "border-ink bg-hover" : "border-rule"}`}
      >
        <input
          ref={picker}
          type="file"
          multiple
          accept={INO_ACCEPT}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => {
            void readSketch(event.target.files ?? []);
            event.target.value = "";
          }}
        />
        <Button variant="secondary" busy={reading} onClick={() => picker.current?.click()}>
          <Icon name="code" size={16} aria-hidden="true" />
          {ts("ino.import")}
        </Button>
        {inoError ? (
          <p role="alert" className="text-sm text-bad">
            {inoError}
          </p>
        ) : null}
      </section>

      <Dialog
        open={review !== null}
        onClose={() => setReview(null)}
        title={ts("ino.import")}
        description={review?.imported.title}
        closeLabel={ts("dialog.cancel")}
      >
        {review ? (
          <LossReport
            strings={strings}
            lang={lang}
            loss={review.imported.loss}
            board={{
              value: review.imported.board,
              options: boardOptions,
              onChange: changeBoard,
            }}
            onConfirm={() => void confirmImport()}
            onCancel={() => setReview(null)}
            confirmLabel={ts("ino.confirm")}
          />
        ) : null}
      </Dialog>

      <p role="status" className="sr-only">
        {starting ? t("starters.opening", { name: titleOf(starting) }) : ""}
      </p>
    </div>
  );
}
