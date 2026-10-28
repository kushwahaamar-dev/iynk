"use client";

import dynamic from "next/dynamic";
import { useState, useSyncExternalStore } from "react";
import type { Locale } from "@/i18n/config";
import type { StudioMessages } from "@/i18n/namespaces";
import { readRoute, subscribeRoute, type StudioRoute } from "@/studio/router";
import { ProjectList } from "./ProjectList";

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

  if (route.kind === "project") {
    return <div data-studio-slot="workspace" role="region" aria-label={strings.shell.workspace} />;
  }

  return (
    <>
      <ProjectList strings={strings} lang={lang} />
      <details
        className="mt-16 border-t border-rule pt-4"
        data-testid="diagnostics"
        onToggle={(e) => e.currentTarget.open && setOpened(true)}
      >
        <summary className="cursor-pointer text-base font-semibold">{strings.diag.title}</summary>
        {opened ? <Diagnostics strings={strings} lang={lang} /> : null}
      </details>
    </>
  );
}
