"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { Locale } from "@/i18n/config";
import type { StudioMessages } from "@/i18n/namespaces";
import { openDb } from "@/local/db";
import { createIndexedDbPartsRepository, partKey } from "@/local/parts-store";
import type { PartRecord, PartsRepository } from "@/local/parts-store";
import { getAppRegistry } from "@/parts/builtin";
import { digestOf } from "@/parts/descriptor";
import type { Descriptor } from "@/parts/descriptor";
import { navigate, readRoute, routeHash, subscribeRoute, type PartsRoute, type StudioRoute } from "@/studio/router";
import { Home } from "./Home";
import { Workspace } from "./Workspace";
import { ServicesProvider } from "./wiring/services";

const Diagnostics = dynamic(() => import("./Diagnostics").then((m) => m.Diagnostics), {
  ssr: false,
  loading: () => <div className="mt-4 min-h-32" aria-busy="true" />,
});

const PartEditor = dynamic(() => import("./PartEditor").then((m) => m.PartEditor), {
  ssr: false,
  loading: () => <div className="mt-4 min-h-64" aria-busy="true" />,
});

const HOME: StudioRoute = { kind: "home" };

export interface StudioEntryProps {
  messages: StudioMessages;
  lang: Locale;
}

function PartsEditorRoute({ route, messages, lang }: { route: PartsRoute; messages: StudioMessages; lang: Locale }) {
  const [store, setStore] = useState<{ repo: PartsRepository; records: Map<string, PartRecord> } | "failed" | null>(null);

  useEffect(() => {
    let gone = false;
    let db: IDBDatabase | undefined;
    openDb()
      .then(async (opened) => {
        db = opened;
        const repo = createIndexedDbPartsRepository(opened);
        const records = new Map((await repo.list()).map((rec) => [rec.key, rec]));
        if (!gone) setStore({ repo, records });
      })
      .catch(() => !gone && setStore("failed"));
    return () => {
      gone = true;
      db?.close();
    };
  }, []);

  const library = useMemo(() => {
    if (store === null || store === "failed") return null;
    const { repo, records } = store;
    return {
      existingKeys: (): ReadonlySet<string> => new Set(records.keys()),
      get: (id: string, version: string): Descriptor | undefined => records.get(partKey(id, version))?.descriptor ?? getAppRegistry().get(id, version),
      async save(def: Descriptor, files: ReadonlyMap<string, Blob>) {
        const assets = def.visual.assets ?? [];
        const rec: PartRecord = {
          key: partKey(def.id, def.version),
          id: def.id,
          version: def.version,
          descriptor: def,
          digest: digestOf(def),
          trust: "local",
          addedAt: new Date().toISOString(),
          files: Object.fromEntries(assets.map((a) => [a.path, a.sha256])),
        };
        const blobs = new Map(assets.flatMap((a) => (files.has(a.path) ? [[a.sha256, files.get(a.path)!] as const] : [])));
        const done = await repo.putMany([rec], blobs);
        if (!done.ok) return "conflict" as const;
        if (done.results[0] === "added") records.set(rec.key, rec);
        return done.results[0];
      },
    };
  }, [store]);

  if (store === "failed") return <p role="alert" className="mt-4 text-base text-bad">{messages.parteditor.save.failed}</p>;
  if (!library) return <div className="mt-4 min-h-64" aria-busy="true" />;
  return (
    <PartEditor
      baseKey={route.kind === "parts-edit" ? route.key : undefined}
      library={library}
      onSaved={(def) => getAppRegistry().add(def, { origin: "local-user" })}
      onClose={() => navigate({ kind: "home" })}
      messages={messages.parteditor}
      lang={lang}
    />
  );
}

export function StudioEntry({ messages, lang }: StudioEntryProps) {
  const strings = messages.studio;
  const route = useSyncExternalStore(subscribeRoute, readRoute, () => HOME);
  const [opened, setOpened] = useState(false);

  return (
    <ServicesProvider>
      {route.kind === "parts-new" || route.kind === "parts-edit" ? (
        <PartsEditorRoute key={routeHash(route)} route={route} messages={messages} lang={lang} />
      ) : route.kind === "project" ? (
        <Workspace projectId={route.id} autorun={route.autorun} messages={messages} lang={lang} />
      ) : (
        <>
          <Home
            messages={messages.studioHome}
            strings={strings}
            lang={lang}
            onOpen={(id, opts) => navigate({ kind: "project", id, autorun: opts?.run === true })}
          />
          <details
            className="mt-16 border-t border-rule pt-4"
            data-testid="diagnostics"
            onToggle={(e) => e.currentTarget.open && setOpened(true)}
          >
            <summary className="cursor-pointer text-base font-semibold">{strings.diag.title}</summary>
            {opened ? <Diagnostics strings={strings} lang={lang} /> : null}
          </details>
        </>
      )}
    </ServicesProvider>
  );
}
