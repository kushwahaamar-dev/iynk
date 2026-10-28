"use client";

import dynamic from "next/dynamic";
import { useState, useSyncExternalStore } from "react";
import type { Locale } from "@/i18n/config";
import type { StudioMessages } from "@/i18n/namespaces";
import { navigate, readRoute, subscribeRoute, type StudioRoute } from "@/studio/router";
import { Home } from "./Home";
import { Workspace } from "./Workspace";
import { ServicesProvider } from "./wiring/services";

const Diagnostics = dynamic(() => import("./Diagnostics").then((m) => m.Diagnostics), {
  ssr: false,
  loading: () => <div className="mt-4 min-h-32" aria-busy="true" />,
});

const HOME: StudioRoute = { kind: "home" };

export interface StudioEntryProps {
  messages: StudioMessages;
  lang: Locale;
}

export function StudioEntry({ messages, lang }: StudioEntryProps) {
  const strings = messages.studio;
  const route = useSyncExternalStore(subscribeRoute, readRoute, () => HOME);
  const [opened, setOpened] = useState(false);

  return (
    <ServicesProvider>
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
    </ServicesProvider>
  );
}
