"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { EditAccess } from "@/collab/authority";
import type { RoomHandle } from "@/collab/join";
import type { CollabInstallDeps, CollabNotice } from "@/collab/install";
import { makeMyCopy, openShare, parseShareFragment, readOnlyAccess, type OpenedShare } from "@/collab/share-open";
import { Callout, Skeleton } from "@/components/ui";
import type { Locale } from "@/i18n/config";
import type { StudioMessages } from "@/i18n/namespaces";
import { createTranslator } from "@/i18n/translate";
import { cryptoRandom } from "@/core/ids";
import { createSession, type ProjectSession } from "@/project/session";
import { registerCommand } from "@/studio/commands";
import { navigate, parseHash, readRoute, subscribeRoute, type StudioRoute } from "@/studio/router";
import { createDocStore, type DocStore } from "@/studio/stores/doc";
import { Home } from "./Home";
import { BannerArea } from "./room/BannerArea";
import { RoomProvider, type StudioRoomsT } from "./room/RoomDock";
import { SidePanel } from "./room/SidePanel";
import { Toolbar } from "./room/Toolbar";
import { ShareDialog } from "./ShareDialog";
import { Workspace } from "./Workspace";
import { ServicesProvider, useServices } from "./wiring/services";

const Diagnostics = dynamic(() => import("./Diagnostics").then((m) => m.Diagnostics), {
  ssr: false,
  loading: () => <div className="mt-4 min-h-32" aria-busy="true" />,
});

const HOME: StudioRoute = { kind: "home" };
const EDIT: EditAccess = { mode: "edit" };

/** What the rooms code needs from the signed in session; the entry adds the commands, the address bar and the dialogs. */
export type CollabEnv = Omit<
  CollabInstallDeps,
  "registerCommand" | "onHandle" | "readHash" | "onHash" | "navigate" | "replaceHash" | "onShare" | "onNotice" | "onNeedsEnrolment"
>;

export interface StudioEntryProps {
  messages: StudioMessages;
  lang: Locale;
  collab?: CollabEnv;
}

type SharedState =
  | { status: "opening" }
  | { status: "failed"; reason: "gone" | "needs_server" | "invalid" | "network" }
  | { status: "open"; opened: OpenedShare; doc: DocStore; access: EditAccess };

export function StudioEntry(props: StudioEntryProps) {
  return (
    <ServicesProvider>
      <Studio {...props} />
    </ServicesProvider>
  );
}

function Studio({ messages, lang, collab }: StudioEntryProps) {
  const { library } = useServices();
  const strings = messages.studio;
  const route = useSyncExternalStore(subscribeRoute, readRoute, () => HOME);
  const [opened, setOpened] = useState(false);
  const [sharing, setSharing] = useState<ProjectSession | null>(null);
  const [handle, setHandle] = useState<RoomHandle | null>(null);
  const [notice, setNotice] = useState<CollabNotice | null>(null);
  const [shared, setShared] = useState<SharedState | null>(null);
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
        onNotice: setNotice,
        onNeedsEnrolment: () => window.location.assign(`/${lang}/together`),
      });
    });
    return () => {
      live = false;
      uninstall();
    };
  }, [collab, lang]);

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

  const sharedAccess = route.kind === "shared" && shared?.status === "open" ? shared.access : EDIT;

  return (
    <>
      <RoomProvider handle={handle} access={sharedAccess}>
        <Toolbar t={rooms} />
        <BannerArea t={rooms} />
        {notice ? (
          <Callout tone="warn" live className="mb-4">
            {rooms(notice)}
          </Callout>
        ) : null}
        {route.kind === "shared" ? (
          <SharedView state={shared} messages={messages} lang={lang} rooms={rooms} />
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
        <SidePanel t={rooms} />
      </RoomProvider>
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
