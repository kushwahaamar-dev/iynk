"use client";

import { useMemo } from "react";
import type { Locale } from "@/i18n/config";
import type { StudioMessages } from "@/i18n/namespaces";
import { createTranslator } from "@/i18n/translate";
import { useStoreSelector } from "@/studio/stores/select";
import type { AnnounceLine, Announcer } from "@/studio/tools/keyboard";

export interface LiveRegionProps {
  announcer: Announcer;
  messages: StudioMessages;
  lang: Locale;
}

/** Two regions screen readers watch, one per politeness. They are always mounted, so the first line is read too. */
export function LiveRegion({ announcer, messages, lang }: LiveRegionProps) {
  const lines = useStoreSelector(announcer.lines, (s) => s);
  const translators = useMemo(
    () => new Map(Object.entries(messages).map(([name, tree]) => [name, createTranslator(lang, tree, `${lang}/${name}`)])),
    [messages, lang],
  );

  // A key reads "namespace.path.to.text".
  function say({ key, args }: AnnounceLine): string {
    const dot = key.indexOf(".");
    const t = translators.get(key.slice(0, dot)) as ((path: string, args?: AnnounceLine["args"]) => string) | undefined;
    if (!t) throw new Error(`Announcement key "${key}" names no Studio namespace`);
    return t(key.slice(dot + 1), args);
  }

  const lineOf = (line: AnnounceLine) => <p key={line.id}>{say(line)}</p>;

  return (
    <>
      <div role="status" aria-live="polite" aria-atomic="false" className="sr-only">
        {lines.filter((line) => line.politeness === "polite").map(lineOf)}
      </div>
      <div role="alert" aria-live="assertive" aria-atomic="false" className="sr-only">
        {lines.filter((line) => line.politeness === "assertive").map(lineOf)}
      </div>
    </>
  );
}
