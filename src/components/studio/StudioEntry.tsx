"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { EditAccess } from "@/collab/authority";
import type { RoomHandle } from "@/collab/join";
import type { CollabInstallDeps, CollabNotice } from "@/collab/install";
import { Callout } from "@/components/ui";
import type { Locale } from "@/i18n/config";
import type { StudioMessages } from "@/i18n/namespaces";
import { createTranslator } from "@/i18n/translate";
import type { ProjectSession } from "@/project/session";
import { registerCommand } from "@/studio/commands";
import { navigate, parseHash, readRoute, subscribeRoute, type StudioRoute } from "@/studio/router";
import { Home } from "./Home";
import { BannerArea } from "./room/BannerArea";
import { RoomProvider } from "./room/RoomDock";
import { SidePanel } from "./room/SidePanel";
import { Toolbar } from "./room/Toolbar";
import { ShareDialog } from "./ShareDialog";
import { Workspace } from "./Workspace";
import { ServicesProvider } from "./wiring/services";

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

export function StudioEntry({ messages, lang, collab }: StudioEntryProps) {
  const strings = messages.studio;
  const route = useSyncExternalStore(subscribeRoute, readRoute, () => HOME);
  const [opened, setOpened] = useState(false);
  const [sharing, setSharing] = useState<ProjectSession | null>(null);
  const [handle, setHandle] = useState<RoomHandle | null>(null);
  const [notice, setNotice] = useState<CollabNotice | null>(null);
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

  return (
    <ServicesProvider>
      <RoomProvider handle={handle} access={EDIT}>
        <Toolbar t={rooms} />
        <BannerArea t={rooms} />
        {notice ? (
          <Callout tone="warn" live className="mb-4">
            {rooms(notice)}
          </Callout>
        ) : null}
        {route.kind === "project" ? (
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
    </ServicesProvider>
  );
}
