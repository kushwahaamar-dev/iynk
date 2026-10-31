"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { EditAccess } from "@/collab/authority";
import type { RoomHandle } from "@/collab/join";
import type { CollabInstallDeps, CollabNotice } from "@/collab/install";
import type { LobbyClient } from "@/collab/lobby";
import { attachRunClient, type RunWiring } from "@/collab/run-wiring";
import { makeMyCopy, openShare, parseShareFragment, readOnlyAccess, type OpenedShare } from "@/collab/share-open";
import { Callout, EmptyState, Skeleton, buttonClass } from "@/components/ui";
import type { Locale } from "@/i18n/config";
import type { StudioMessages } from "@/i18n/namespaces";
import type { Actor } from "@/protocol";
import { createTranslator } from "@/i18n/translate";
import { cryptoRandom } from "@/core/ids";
import { startLegacyImport } from "@/lib/learn/facade";
import { openDb } from "@/local/db";
import { createIndexedDbPartsRepository, partKey } from "@/local/parts-store";
import type { PartRecord, PartsRepository } from "@/local/parts-store";
import { getAppRegistry } from "@/parts/builtin";
import { digestOf } from "@/parts/descriptor";
import type { Descriptor, DescriptorOrigin, Trust } from "@/parts/descriptor";
import { partFacts } from "@/parts/facts";
import { DMATH_VERSION } from "@/sim/core/dmath";
import { makeModelEnv } from "@/sim/models/kinds";
import { createSession, type ProjectSession } from "@/project/session";
import { registerCommand, runCommand, type CommandCtx } from "@/studio/commands";
import { navigate, parseHash, readRoute, routeHash, subscribeRoute, type PartsRoute, type StudioRoute } from "@/studio/router";
import { createDocStore, type DocStore } from "@/studio/stores/doc";
import { TEMPLATES } from "../../../content/projects";
import { progressOf, tierOf, useLearnSnapshot } from "./guide/lessonProgress";
import { Home } from "./Home";
import { LabHost, labEntryOf } from "./lab/LabHost";
import { PartPage } from "./PartPage";
import { BannerArea } from "./room/BannerArea";
import { sendCommand } from "./room/BatonControl";
import { RoomProvider, useRoomStatus, type StudioRoomsT } from "./room/RoomDock";
import { RoomMenuEnvProvider, type RoomMenuEnv } from "./room/RoomMenu";
import { RunIndicator } from "./room/RunIndicator";
import { SidePanel } from "./room/SidePanel";
import { Toolbar } from "./room/Toolbar";
import { ShareDialog } from "./ShareDialog";
import { TemplateGallery } from "./TemplateGallery";
import { Workspace } from "./Workspace";
import { ServicesProvider, useServices } from "./wiring/services";
import { openTemplateProject } from "./wiring/templateProject";
import { setRunTarget } from "./wiring/simLink";

const Diagnostics = dynamic(() => import("./Diagnostics").then((m) => m.Diagnostics), {
  ssr: false,
  loading: () => <div className="mt-4 min-h-32" aria-busy="true" />,
});

const PartEditor = dynamic(() => import("./PartEditor").then((m) => m.PartEditor), {
  ssr: false,
  loading: () => <div className="mt-4 min-h-64" aria-busy="true" />,
});

const HOME: StudioRoute = { kind: "home" };
const EDIT: EditAccess = { mode: "edit" };

/** What the rooms code needs from the signed in session; the entry adds the commands, the address bar and the dialogs. */
export type CollabEnv = Omit<
  CollabInstallDeps,
  "registerCommand" | "onHandle" | "onLobby" | "readHash" | "onHash" | "navigate" | "replaceHash" | "onShare" | "onNotice" | "onNeedsEnrolment"
>;

const RUN_VERSIONS = { dmath: String(DMATH_VERSION) };

const TRUST_OF_ORIGIN: Readonly<Record<DescriptorOrigin, Trust>> = { core: "core", "local-user": "local", "imported-pack": "imported" };

export interface StudioEntryProps {
  messages: StudioMessages;
  lang: Locale;
  collab?: CollabEnv;
}

type SharedState =
  | { status: "opening" }
  | { status: "failed"; reason: "gone" | "needs_server" | "invalid" | "network" }
  | { status: "open"; opened: OpenedShare; doc: DocStore; access: EditAccess };

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

function PartInfoRoute({ routeKey, messages, lang }: { routeKey: string; messages: StudioMessages; lang: Locale }) {
  const strings = messages.partinfo;
  const registry = getAppRegistry();
  const at = routeKey.lastIndexOf("@");
  const id = routeKey.slice(0, at);
  const version = routeKey.slice(at + 1);
  const def = registry.get(id, version);
  const origin = registry.originOf(id, version);

  if (!def || !origin) {
    return (
      <EmptyState title={strings.notFound.title} action={<a href="#/" className={buttonClass("secondary")}>{strings.notFound.link}</a>}>
        {strings.notFound.body}
      </EmptyState>
    );
  }
  const trust = TRUST_OF_ORIGIN[origin];
  const facts = partFacts(def, trust, makeModelEnv((ref, v) => registry.get(ref, v)), registry.versions(id));
  return <PartPage facts={facts} messages={strings} lang={lang} onOpenEditor={trust === "local" ? () => navigate({ kind: "parts-edit", key: routeKey }) : undefined} />;
}

function LessonsRoute({ messages, lang }: { messages: StudioMessages; lang: Locale }) {
  const snapshot = useLearnSnapshot();
  const t = useMemo(() => createTranslator(lang, messages.studio, `${lang}/studio`), [lang, messages.studio]);

  useEffect(() => {
    startLegacyImport(() => undefined);
  }, []);

  return (
    <TemplateGallery
      templates={TEMPLATES}
      lang={lang}
      progress={(id) => progressOf(snapshot, id)}
      tier={(id) => {
        const tier = tierOf(snapshot, id);
        return tier ? t("lesson.guide.tier", { tier }) : "";
      }}
      onOpen={(id, opts) => navigate({ kind: "template", id, run: opts.run })}
      messages={messages.studio}
    />
  );
}

/** Opens the learner's copy of a template, making it on the first visit, and goes on to the project. */
function TemplateRoute({ route, messages }: { route: Extract<StudioRoute, { kind: "template" }>; messages: StudioMessages }) {
  const services = useServices();
  const [failed, setFailed] = useState(false);
  const opening = useRef<Promise<string> | null>(null);

  useEffect(() => {
    let live = true;
    opening.current ??= openTemplateProject(route.id, services);
    opening.current.then(
      (projectId) => {
        if (live) navigate({ kind: "project", id: projectId, autorun: route.run }, "replace");
      },
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [route, services]);

  const { workspace } = messages.studio;
  if (failed) {
    return (
      <EmptyState
        title={workspace.errorTitle}
        action={
          <a href="#/lessons" className={buttonClass("secondary")}>
            {workspace.back}
          </a>
        }
      >
        {`${workspace.error} ${route.id}`}
      </EmptyState>
    );
  }
  return (
    <div role="status" aria-busy="true" aria-label={workspace.loading} className="p-4">
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

/** The bench or craft template a stored project was forked from; null for any other project, undefined while it is read. */
function useLabTemplateOf(projectId: string): string | null | undefined {
  const { host } = useServices();
  const [found, setFound] = useState<{ projectId: string; template: string | null } | null>(null);

  useEffect(() => {
    let live = true;
    host.load(projectId).then(
      ({ state }) => {
        const origin = state?.provenance.origin;
        const forked = state && (state.meta.kind === "bench" || state.meta.kind === "craft") && origin?.kind === "fork" ? origin.project : null;
        if (live) setFound({ projectId, template: forked !== null && labEntryOf(forked) ? forked : null });
      },
      () => live && setFound({ projectId, template: null }),
    );
    return () => {
      live = false;
    };
  }, [host, projectId]);

  return found?.projectId === projectId ? found.template : undefined;
}

/** A bench or craft project opens in the lab host, any other project in the editor. */
function ProjectRoute({ route, messages, lang, onCtx }: { route: Extract<StudioRoute, { kind: "project" }>; messages: StudioMessages; lang: Locale; onCtx: (ctx: CommandCtx | null) => void }) {
  const lab = useLabTemplateOf(route.id);
  if (lab === undefined) {
    return (
      <div role="status" aria-busy="true" aria-label={messages.studio.workspace.loading} className="p-4">
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  if (lab !== null) return <LabHost templateId={lab} lang={lang} view={route.view === "fly" ? "fly" : "workshop"} messages={messages} />;
  return <Workspace projectId={route.id} autorun={route.autorun} messages={messages} lang={lang} onCtx={onCtx} />;
}

export function StudioEntry(props: StudioEntryProps) {
  return (
    <ServicesProvider>
      <Studio {...props} />
    </ServicesProvider>
  );
}

function Studio({ messages, lang, collab }: StudioEntryProps) {
  const { library, sim } = useServices();
  const strings = messages.studio;
  const route = useSyncExternalStore(subscribeRoute, readRoute, () => HOME);
  const [opened, setOpened] = useState(false);
  const [sharing, setSharing] = useState<ProjectSession | null>(null);
  const [handle, setHandle] = useState<RoomHandle | null>(null);
  const [notice, setNotice] = useState<CollabNotice | null>(null);
  const [shared, setShared] = useState<SharedState | null>(null);
  const [lobby, setLobby] = useState<LobbyClient | null>(null);
  const [wiring, setWiring] = useState<RunWiring | null>(null);
  const ctx = useRef<CommandCtx | null>(null);
  const setCtx = useCallback((next: CommandCtx | null) => {
    ctx.current = next;
  }, []);
  const rooms = useMemo(() => createTranslator(lang, strings.rooms, `${lang}/studio`), [lang, strings.rooms]);

  useEffect(() => {
    if (!collab) return;
    let live = true;
    let uninstall = () => {};
    void import("@/collab/install").then(({ installCollab }) => {
      if (!live) return;
      uninstall = installCollab({
        ...collab,
        registerCommand,
        readHash: () => window.location.hash,
        onHash: subscribeRoute,
        navigate: (hash) => navigate(parseHash(hash)),
        replaceHash: (hash) => navigate(parseHash(hash), "replace"),
        onShare: setSharing,
        onHandle: setHandle,
        onLobby: setLobby,
        onNotice: setNotice,
        onNeedsEnrolment: () => window.location.assign(`/${lang}/together`),
      });
    });
    return () => {
      live = false;
      uninstall();
    };
  }, [collab, lang]);

  useEffect(() => {
    if (!handle || !collab) return;
    const attached = attachRunClient({
      room: handle.client,
      host: sim,
      self: collab.me.identityId,
      versions: RUN_VERSIONS,
      project: () => ctx.current?.doc.getState().state ?? null,
      confirmedSeq: () => handle.authority.getStatus().confirmedSeq,
    });
    setRunTarget(attached);
    setWiring(attached);
    return () => {
      setRunTarget(null);
      setWiring(null);
      attached.dispose();
    };
  }, [handle, collab, sim]);

  const copyShared = useCallback(
    async (opened: OpenedShare) => {
      const id = await makeMyCopy({ lib: library }, opened);
      navigate({ kind: "project", id, autorun: false });
    },
    [library],
  );

  useEffect(() => {
    let latest = 0;
    const take = () => {
      const link = parseShareFragment(window.location.hash);
      if (!link) return;
      const mine = ++latest;
      navigate({ kind: "shared" }, "replace");
      setShared({ status: "opening" });
      const failed = (reason: "gone" | "needs_server" | "invalid" | "network") => {
        if (mine === latest) setShared({ status: "failed", reason });
      };
      if (!collab) return failed("needs_server");
      openShare(collab.client, link.token).then((result) => {
        if (mine !== latest) return;
        if (!result.ok) return failed(result.reason);
        const { opened } = result;
        const doc = createDocStore(createSession({ state: opened.doc, clock: Date.now, rnd: cryptoRandom }));
        const access = readOnlyAccess(opened, () => copyShared(opened));
        doc.setAccess(access);
        doc.setSaveChip("read-only");
        setShared({ status: "open", opened, doc, access });
      }, () => failed("network"));
    };
    take();
    const off = subscribeRoute(take);
    return () => {
      latest += 1;
      off();
    };
  }, [collab, copyShared]);

  const menuEnv = useMemo<RoomMenuEnv | null>(
    () =>
      collab && lobby
        ? { client: collab.client, lobby, lang, run: (command) => ctx.current && void runCommand(command, ctx.current) }
        : null,
    [collab, lobby, lang],
  );

  const sharedAccess = route.kind === "shared" && shared?.status === "open" ? shared.access : EDIT;

  return (
    <>
      <RoomMenuEnvProvider value={menuEnv}>
        <RoomProvider handle={handle} access={sharedAccess}>
          <Toolbar t={rooms} />
          <BannerArea t={rooms} />
          {handle && wiring && collab ? <RunPanel handle={handle} wiring={wiring} self={collab.me.identityId} messages={messages} lang={lang} /> : null}
          {notice ? (
            <Callout tone="warn" live className="mb-4">
              {rooms(notice)}
            </Callout>
          ) : null}
          {route.kind === "shared" ? (
            <SharedView state={shared} messages={messages} lang={lang} rooms={rooms} />
          ) : route.kind === "parts-new" || route.kind === "parts-edit" ? (
            <PartsEditorRoute key={routeHash(route)} route={route} messages={messages} lang={lang} />
          ) : route.kind === "parts-info" ? (
            <PartInfoRoute key={route.key} routeKey={route.key} messages={messages} lang={lang} />
          ) : route.kind === "lessons" ? (
            <LessonsRoute messages={messages} lang={lang} />
          ) : route.kind === "template" ? (
            labEntryOf(route.id) ? (
              <LabHost key={route.id} templateId={route.id} lang={lang} messages={messages} />
            ) : (
              <TemplateRoute key={routeHash(route)} route={route} messages={messages} />
            )
          ) : route.kind === "project" ? (
            <ProjectRoute route={route} messages={messages} lang={lang} onCtx={setCtx} />
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
          <SidePanel t={rooms} />
        </RoomProvider>
      </RoomMenuEnvProvider>
      {collab && sharing ? (
        <ShareDialog
          open
          onClose={() => setSharing(null)}
          doc={sharing.state}
          lang={lang}
          t={rooms}
          client={collab.client}
          readBlob={collab.readBlob}
        />
      ) : null}
    </>
  );
}

function RunPanel({ handle, wiring, self, messages, lang }: { handle: RoomHandle; wiring: RunWiring; self: Actor; messages: StudioMessages; lang: Locale }) {
  const t = useMemo(() => createTranslator(lang, messages.run, `${lang}/run`), [lang, messages.run]);
  const status = useRoomStatus();
  const people = useMemo(() => (status?.members ?? []).map((m) => ({ actor: m.actor, name: m.name })), [status?.members]);
  return (
    <RunIndicator
      store={wiring.store}
      client={wiring.client}
      t={t}
      self={self}
      host={status?.host ?? null}
      people={people}
      onSetRunner={(to) => sendCommand(handle, "runner.set", { to })}
    />
  );
}

const SHARE_FAILURES = { gone: "share.gone", invalid: "share.gone", needs_server: "share.needsServer", network: "share.networkError" } as const;

function SharedView({ state, messages, lang, rooms }: { state: SharedState | null; messages: StudioMessages; lang: Locale; rooms: StudioRoomsT }) {
  if (!state || state.status === "opening") {
    return (
      <div role="status" aria-busy="true" aria-label={messages.studio.workspace.loading} className="p-4">
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  if (state.status === "failed") {
    return (
      <Callout tone="warn" live className="mb-4">
        {rooms(SHARE_FAILURES[state.reason])}
      </Callout>
    );
  }
  return <Workspace projectId={state.opened.doc.id} autorun={false} messages={messages} lang={lang} shared={state.doc} />;
}
