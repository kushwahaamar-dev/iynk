"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { EmptyState, Skeleton, buttonClass } from "@/components/ui";
import type { Locale } from "@/i18n/config";
import type { StudioMessages } from "@/i18n/namespaces";
import type { DocStore } from "@/studio/stores/doc";
import { useOpenProject } from "../wiring/openProject";
import { createPageRevisionPort, linkRepository } from "../wiring/repositoryLink";
import { useServices } from "../wiring/services";
import type { DroneBuilderMessages } from "./DroneBuilder";

const BUILDER_LOADING = () => <Skeleton className="h-96 w-full" />;

const DroneBuilder = dynamic(() => import("./DroneBuilder").then((m) => m.DroneBuilder), { ssr: false, loading: BUILDER_LOADING });

const NAMESPACES = ["drone", "dronebuild", "droneparts", "droneopt"] as const;

async function loadMessages(lang: Locale): Promise<DroneBuilderMessages> {
  const [drone, dronebuild, droneparts, droneopt] = await Promise.all(
    NAMESPACES.map(async (ns) => ((await import(`../../../i18n/messages/${lang}/${ns}.json`)) as { default: unknown }).default),
  );
  return { drone, dronebuild, droneparts, droneopt } as DroneBuilderMessages;
}

type Loaded = { lang: Locale; messages: DroneBuilderMessages | null };

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

function OpenBuilder({ doc, lang, messages, studio }: { doc: DocStore; lang: Locale; messages: DroneBuilderMessages | null | undefined; studio: StudioMessages }) {
  const { host } = useServices();
  useEffect(() => linkRepository(doc, host, { revisions: createPageRevisionPort() }), [doc, host]);

  if (messages === undefined) return <Loading messages={studio} />;
  if (messages === null) {
    return (
      <Notice title={studio.studio.workspace.errorTitle} messages={studio}>
        {studio.studio.workspace.error}
      </Notice>
    );
  }
  return <DroneBuilder doc={doc} lang={lang} messages={messages} />;
}

/** A stored project open in the drone builder. */
export function DroneRoute({ id, lang, messages }: { id: string; lang: Locale; messages: StudioMessages }) {
  const { host } = useServices();
  const project = useOpenProject(id, { host });
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const { workspace } = messages.studio;

  useEffect(() => {
    let live = true;
    loadMessages(lang).then(
      (strings) => live && setLoaded({ lang, messages: strings }),
      () => live && setLoaded({ lang, messages: null }),
    );
    return () => {
      live = false;
    };
  }, [lang]);

  if (project.status === "error") {
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
  if (!project.doc) return <Loading messages={messages} />;
  return <OpenBuilder doc={project.doc} lang={lang} messages={loaded?.lang === lang ? loaded.messages : undefined} studio={messages} />;
}
