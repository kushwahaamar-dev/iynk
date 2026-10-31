"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { version } from "../../../package.json";
import { Button, Callout, Dialog } from "@/components/ui";
import { utf8Encode } from "@/core/canonical";
import { LIMITS } from "@/core/limits";
import { sha256Hex } from "@/core/sha256";
import { exportIno, importIno, lossCodes, wiringCsv, type InoExport, type InoFile, type InoImport } from "@/export/ino";
import { writeIynk } from "@/export/iynk";
import { writeZip } from "@/export/zip";
import type { Locale } from "@/i18n/config";
import type { StudioMessages } from "@/i18n/namespaces";
import { createTranslator, type MessageKey } from "@/i18n/translate";
import { noticeFor } from "@/studio/provenance-notice";
import { navigate } from "@/studio/router";
import type { DocStore } from "@/studio/stores/doc";
import { useStoreSelector } from "@/studio/stores/select";
import { DEFAULT_BOARD, INO_ACCEPT, MAX_FILE_BYTES, boardOptions, projectFromIno } from "./Home";
import { analyserFor, inoErrorKey } from "./inoAnalyser";
import { LossReport } from "./LossReport";
import { ProjectMenu } from "./ProjectMenu";
import { UncheckedNotice } from "./UncheckedNotice";
import { onSaveToFile } from "./wiring/repositoryLink";
import type { Services } from "./wiring/services";

export interface ProjectActions {
  menu: ReactNode;
  /** The dialogs and the hidden file field the menu opens. Mount them anywhere in the workspace. */
  dialogs: ReactNode;
  canExportIno(): boolean;
  exportIno(): void;
  importIno(): void;
}

type Props = {
  doc: DocStore;
  services: Services;
  messages: StudioMessages;
  lang: Locale;
  /** Called with the failure code of the version made before a file is saved, or null when it was made. The save goes on. */
  onVersionFailed(code: string | null): void;
  onOpenHistory(): void;
};

type Review = { files: InoFile[]; imported: InoImport };

const fileStem = (title: string) => title.replace(/[^\p{L}\p{N}_-]+/gu, "-").replace(/^-+|-+$/g, "") || "project";

function download(bytes: Uint8Array, name: string, type: string): void {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

const isAbort = (cause: unknown) => cause instanceof DOMException && cause.name === "AbortError";

export function useProjectActions({ doc, services, messages, lang, onVersionFailed, onOpenHistory }: Props): ProjectActions {
  const { studio } = messages;
  const t = useMemo(() => createTranslator(lang, studio, `${lang}/studio`), [lang, studio]);
  const readOnly = useStoreSelector(doc, (s) => s.readOnly);
  const arduinoBoard = useStoreSelector(doc, (s) => s.state.boards.find((b) => b.firmware?.language === "arduino-cpp")?.id);
  const [exporting, setExporting] = useState<InoExport | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [unchecked, setUnchecked] = useState<number | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  const busy = useRef(false);

  async function saveFile() {
    const { host, files } = services;
    const state = doc.getState().state;
    setProblem(null);
    const made = await onSaveToFile(studio.history.fileLabel);
    onVersionFailed(made.ok ? null : made.error);
    try {
      await host.save("manual");
      await files.saveToFile(await files.exportProject(state.id, "iynk"), `${fileStem(state.meta.title)}.iynk`);
      await files.markFileCopy(state.id, true);
    } catch (cause) {
      if (!isAbort(cause)) setProblem(t("row.failed"));
    }
  }

  function startExport() {
    const { show, count } = noticeFor(doc.getState().state, "export");
    if (show) return setUnchecked(count);
    buildExport();
  }

  function buildExport() {
    if (arduinoBoard === undefined) return setProblem(t("ino.exportBlocked"));
    const built = exportIno(doc.getState().state, arduinoBoard, { exportedAt: new Date().toISOString(), appVersion: version });
    if (!built.ok) return setProblem(t(inoErrorKey(built.error.code) as MessageKey<typeof studio>));
    setProblem(null);
    setExporting(built.value);
  }

  function confirmExport() {
    if (!exporting) return;
    const bundle = [...exporting.files.map((f) => ({ path: f.path, data: utf8Encode(f.text) })), { path: `${exporting.folder}/wiring.csv`, data: utf8Encode(exporting.wiringCsv) }];
    const bytes = writeZip(bundle);
    download(bytes, `${exporting.folder}.zip`, "application/zip");
    doc.session.recordExport({ format: "ino", at: new Date().toISOString(), appVersion: version, sha256: sha256Hex(bytes), revision: doc.getState().revision, loss: lossCodes(exporting.loss) });
    setExporting(null);
  }

  function exportCsv() {
    const state = doc.getState().state;
    download(utf8Encode(wiringCsv(state)), `${fileStem(state.meta.title)}-wiring.csv`, "text/csv");
  }

  function analyse(files: InoFile[], board?: string): InoImport | null {
    const outcome = importIno(files, analyserFor(), { board });
    if (outcome.ok) return outcome.value;
    const { code, file, limit } = outcome.error;
    setProblem(t(inoErrorKey(code) as MessageKey<typeof studio>, { name: file ?? "", max: limit ?? 0 }));
    return null;
  }

  async function readSketch(list: FileList | null) {
    const picked = [...(list ?? [])];
    if (picked.length === 0) return;
    setProblem(null);
    try {
      if (picked.some((file) => file.size > MAX_FILE_BYTES)) return setProblem(t("ino.tooBig", { max: LIMITS.sourceBytes }));
      const files = await Promise.all(picked.map(async (file) => ({ name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) })));
      let imported = analyse(files);
      if (imported && !boardOptions.some((option) => option.id === imported!.board)) imported = analyse(files, DEFAULT_BOARD);
      if (imported) setReview({ files, imported });
    } catch {
      setProblem(t("ino.notText"));
    }
  }

  function changeBoard(board: string) {
    if (!review) return;
    const imported = analyse(review.files, board);
    if (imported) setReview({ files: review.files, imported });
  }

  async function confirmImport() {
    if (!review || busy.current) return;
    busy.current = true;
    try {
      const project = await projectFromIno(review.imported, lang, new Date().toISOString());
      const outcome = await services.files.importBytes(writeIynk(project), `${project.meta.title}.iynk`);
      if (!outcome.ok) throw new Error(outcome.error.message);
      setReview(null);
      navigate({ kind: "project", id: outcome.id, autorun: false });
    } catch {
      setProblem(t("row.failed"));
    } finally {
      busy.current = false;
    }
  }

  const close = studio.layout.close;
  const menu = (
    <ProjectMenu
      strings={studio}
      canExportIno={arduinoBoard !== undefined}
      canImportIno={!readOnly}
      onSaveFile={() => void saveFile()}
      onExportIno={startExport}
      onImportIno={() => picker.current?.click()}
      onExportCsv={exportCsv}
      onOpenHistory={onOpenHistory}
    />
  );

  const dialogs = (
    <>
      <input ref={picker} type="file" multiple accept={INO_ACCEPT} className="hidden" tabIndex={-1} aria-hidden="true" onChange={(event) => {
        void readSketch(event.target.files);
        event.target.value = "";
      }} />
      {problem ? (
        <div className="fixed inset-x-4 bottom-4 z-overlay flex items-start gap-2 sm:inset-x-auto sm:end-4 sm:max-w-sm">
          <Callout tone="danger" live className="min-w-0 flex-1">
            {problem}
          </Callout>
          <Button size="sm" variant="ghost" onClick={() => setProblem(null)}>
            {studio.banner.dismiss}
          </Button>
        </div>
      ) : null}
      <Dialog open={exporting !== null} onClose={() => setExporting(null)} title={t("ino.export")} closeLabel={close} size="lg">
        {exporting ? <LossReport strings={studio} lang={lang} loss={exporting.loss} onConfirm={confirmExport} onCancel={() => setExporting(null)} confirmLabel={t("ino.export")} /> : null}
      </Dialog>
      <Dialog open={unchecked !== null} onClose={() => setUnchecked(null)} title={t("ino.export")} closeLabel={close}>
        {unchecked !== null ? (
          <UncheckedNotice
            count={unchecked}
            action="export"
            messages={studio}
            lang={lang}
            continueLabel={t("ino.export")}
            onCancel={() => setUnchecked(null)}
            onContinue={() => {
              setUnchecked(null);
              buildExport();
            }}
          />
        ) : null}
      </Dialog>
      <Dialog open={review !== null} onClose={() => setReview(null)} title={t("ino.import")} closeLabel={close} size="lg">
        {review ? (
          <LossReport
            strings={studio}
            lang={lang}
            loss={review.imported.loss}
            board={{ value: review.imported.board, options: boardOptions, onChange: changeBoard }}
            onConfirm={() => void confirmImport()}
            onCancel={() => setReview(null)}
            confirmLabel={t("ino.confirm")}
          />
        ) : null}
      </Dialog>
    </>
  );

  return { menu, dialogs, canExportIno: () => arduinoBoard !== undefined, exportIno: startExport, importIno: () => picker.current?.click() };
}
