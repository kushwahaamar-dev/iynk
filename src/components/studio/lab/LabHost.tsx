"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Callout, EmptyState, Skeleton, buttonClass } from "@/components/ui";
import type { Locale } from "@/i18n/config";
import type { StudioMessages } from "@/i18n/namespaces";
import { learnStore } from "@/lib/learn/facade";
import { LAB_TEMPLATES, type LabTemplateEntry } from "../../../../content/projects";
import type { DocStore } from "@/studio/stores/doc";
import { createPageRevisionPort, linkRepository } from "../wiring/repositoryLink";
import { useOpenProject } from "../wiring/openProject";
import { useServices } from "../wiring/services";
import { openTemplateProject } from "../wiring/templateProject";
import { challengePool, loadLab, type LabData } from "./loadLab";

export type LabHostProps = {
  templateId: string;
  lang: Locale;
  view?: "workshop" | "fly";
  messages: StudioMessages;
};

const PANEL_LOADING = () => <Skeleton className="h-96 w-full" />;

const BenchPanel = dynamic(() => import("./BenchPanel").then((m) => m.BenchPanel), { ssr: false, loading: PANEL_LOADING });
const CraftPanel = dynamic(() => import("./CraftPanel").then((m) => m.CraftPanel), { ssr: false, loading: PANEL_LOADING });

type LabEntry = LabTemplateEntry & { lab: "robotics" | "drone"; kind: "bench" | "craft" };

/** The bench and craft templates; a practice task opens in the ordinary editor. */
export function labEntryOf(templateId: string): LabEntry | undefined {
  return LAB_TEMPLATES.find((e): e is LabEntry => e.id === templateId && e.kind !== "task");
}

const loadEntry = ({ entry, lang }: { entry: LabEntry; lang: Locale }) => loadLab(entry.lab, lang, entry.catalogue.id);

type Loaded<T> = { state: "loading" } | { state: "failed" } | { state: "ready"; value: T };

/** Runs `load` for `arg` and keeps the answer; a null `arg` loads nothing. */
function useLoaded<A, T>(arg: A | null, load: (arg: A) => Promise<T | null>): Loaded<T> {
  const [done, setDone] = useState<{ arg: A; value: T | null } | null>(null);
  useEffect(() => {
    if (arg === null) return;
    let live = true;
    load(arg).then(
      (value) => live && setDone({ arg, value }),
      () => live && setDone({ arg, value: null }),
    );
    return () => {
      live = false;
    };
  }, [arg, load]);
  if (done === null || done.arg !== arg) return { state: "loading" };
  return done.value === null ? { state: "failed" } : { state: "ready", value: done.value };
}

function Notice({ title, children, messages }: { title: string; children: string; messages: StudioMessages }) {
  return (
    <EmptyState
      title={title}
      action={
        <a href="#/" className={buttonClass("secondary")}>
          {messages.studio.workspace.back}
        </a>
      }
    >
      {children}
    </EmptyState>
  );
}

function Loading({ messages }: { messages: StudioMessages }) {
  return (
    <div role="status" aria-busy="true" aria-label={messages.studio.workspace.loading} className="p-4">
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

/** A bench or a craft open as the learner's own project, with the lab panel where the canvas would be. */
export function LabHost({ templateId, lang, view = "workshop", messages }: LabHostProps) {
  const entry = useMemo(() => labEntryOf(templateId), [templateId]);
  if (!entry) {
    return (
      <Notice title={messages.studio.workspace.missingTitle} messages={messages}>
        {messages.studio.workspace.missing}
      </Notice>
    );
  }
  return <OpenLab key={templateId} entry={entry} lang={lang} view={view} messages={messages} />;
}

function OpenLab({ entry, lang, view, messages }: { entry: LabEntry; lang: Locale; view: "workshop" | "fly"; messages: StudioMessages }) {
  const services = useServices();
  const [fork, setFork] = useState<string | "failed" | null>(null);
  const opening = useRef<Promise<string> | null>(null);
  const roomLink = useSearchParams()?.has("room") === true;

  useEffect(() => {
    let live = true;
    opening.current ??= openTemplateProject(entry.id, services);
    opening.current.then(
      (id) => live && setFork(id),
      () => live && setFork("failed"),
    );
    return () => {
      live = false;
    };
  }, [entry.id, services]);

  const project = useOpenProject(fork === "failed" ? null : fork, { host: services.host });
  const wanted = useMemo(() => ({ entry, lang }), [entry, lang]);
  const data = useLoaded(wanted, loadEntry);
  const { workspace } = messages.studio;

  if (fork === "failed" || project.status === "error") {
    return (
      <Notice title={workspace.errorTitle} messages={messages}>
        {workspace.error}
      </Notice>
    );
  }
  if (project.status === "missing" || project.status === "lost") {
    const lost = project.status === "lost";
    return (
      <Notice title={lost ? workspace.lostTitle : workspace.missingTitle} messages={messages}>
        {lost ? workspace.lost : workspace.missing}
      </Notice>
    );
  }
  if (data.state === "failed") {
    return (
      <Notice title={workspace.missingTitle} messages={messages}>
        {workspace.missing}
      </Notice>
    );
  }
  if (!project.doc || data.state === "loading") return <Loading messages={messages} />;

  return (
    <div data-lab-host={entry.id} className="flex flex-col gap-4">
      {roomLink ? <Callout>{messages.studio.lab.roomLinkNote}</Callout> : null}
      <LabPanel doc={project.doc} data={data.value} lang={lang} view={view} messages={messages} />
    </div>
  );
}

function LabPanel({ doc, data, lang, view, messages }: { doc: DocStore; data: LabData; lang: Locale; view: "workshop" | "fly"; messages: StudioMessages }) {
  const { host } = useServices();
  const learn = useMemo(() => learnStore(), []);
  const pool = useLoaded(view === "fly" && data.kind === "craft" ? lang : null, challengePool);

  useEffect(() => linkRepository(doc, host, { revisions: createPageRevisionPort() }), [doc, host]);

  if (data.kind === "bench") return <BenchPanel doc={doc} setup={data.setup} messages={data.messages} />;
  if (view === "fly" && pool.state === "loading") return <Loading messages={messages} />;
  return (
    <CraftPanel
      doc={doc}
      learn={learn}
      content={data.content}
      text={data.text}
      messages={data.messages}
      flightMessages={data.flightMessages}
      pool={pool.state === "ready" ? pool.value : []}
      lang={lang}
      view={view}
    />
  );
}
