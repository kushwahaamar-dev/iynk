"use client";

import { useMemo, useRef, useState } from "react";
import { Button, Icon } from "@/components/ui";
import { cryptoRandom, newProjectId } from "@/core/ids";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/namespaces";
import { createTranslator, type MessageKey } from "@/i18n/translate";
import { writeIynk } from "@/export/iynk";
import { builtinRegistry } from "@/parts/builtin";
import { blankProject } from "@/project/blank";
import type { Project } from "@/project/generated/types";
import { LOCAL_ACTOR, loadStarter, newUnoProject, STARTERS, type StarterDef } from "@/studio/templates";
import { ProjectList, type StudioStrings } from "./ProjectList";
import { useServices } from "./wiring/services";

export interface HomeProps {
  messages: Messages["studioHome"];
  strings: StudioStrings;
  lang: Locale;
  /** Shows a stored project in the editor. `run` asks the workspace to start it. */
  onOpen(id: string, opts?: { run?: boolean }): void;
}

type StarterKey = MessageKey<Messages["studioHome"]>;

const FIRST_RUN = "blink";

export function Home({ messages, strings, lang, onOpen }: HomeProps) {
  const { host, files } = useServices();
  const t = useMemo(() => createTranslator(lang, messages, `${lang}/studioHome`), [lang, messages]);
  const [starting, setStarting] = useState<StarterDef | null>(null);
  const [failed, setFailed] = useState<StarterDef | null>(null);
  const creating = useRef<Promise<string> | null>(null);

  async function store(project: Project): Promise<string> {
    const outcome = await files.importBytes(writeIynk(project), `${project.meta.title}.iynk`);
    if (!outcome.ok) throw new Error(outcome.error.message);
    return outcome.id;
  }

  // Two quick clicks share one creation.
  const createUno = () => {
    creating.current ??= (async () => {
      const blank = blankProject({
        board: "uno",
        title: strings.newName,
        locale: lang,
        actor: LOCAL_ACTOR,
        now: new Date().toISOString(),
        id: newProjectId(Date.now(), cryptoRandom),
      });
      return store(newUnoProject(blank, { registry: builtinRegistry(), rnd: cryptoRandom }));
    })().finally(() => {
      creating.current = null;
    });
    return creating.current;
  };

  async function startFrom(def: StarterDef, run: boolean) {
    if (creating.current) return;
    setStarting(def);
    setFailed(null);
    try {
      creating.current = loadStarter(def.id, { rnd: cryptoRandom, now: new Date().toISOString(), actor: LOCAL_ACTOR }).then(store);
      const id = await creating.current;
      onOpen(id, run ? { run: true } : undefined);
    } catch {
      setFailed(def);
    } finally {
      creating.current = null;
      setStarting(null);
    }
  }

  const titleOf = (def: StarterDef) => t(def.titleKey as StarterKey);

  return (
    <div className="flex flex-col gap-12">
      <ProjectList
        strings={strings}
        lang={lang}
        host={host}
        hydrate
        onNew={createUno}
        onOpen={onOpen}
        emptyAction={
          <Button variant="primary" onClick={() => void startFrom(STARTERS.find((s) => s.id === FIRST_RUN)!, true)} disabled={starting !== null}>
            {t("starters.first.action")}
          </Button>
        }
      />

      <section aria-labelledby="studio-starters">
        <h2 id="studio-starters" className="text-xl font-semibold text-balance">
          {t("starters.title")}
        </h2>
        <p className="mt-1 max-w-prose text-base text-pretty text-muted">{t("starters.lede")}</p>
        <ul aria-label={t("starters.listLabel")} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {STARTERS.map((def) => (
            <li key={def.id} className="flex">
              <button
                type="button"
                onClick={() => void startFrom(def, false)}
                disabled={starting !== null}
                aria-busy={starting?.id === def.id}
                className="flex w-full flex-col gap-1 rounded-2xl border border-rule bg-surface p-4 text-start motion-fade enabled:hover:bg-hover enabled:active:scale-98 enabled:active:motion-press disabled:cursor-not-allowed disabled:opacity-50 aria-busy:opacity-100 aria-busy:animate-pulse motion-reduce:aria-busy:animate-none"
              >
                <span className="flex items-center justify-between gap-2 text-base font-semibold">
                  {titleOf(def)}
                  <Icon name="arrow-right" size={16} className="shrink-0 text-muted" aria-hidden="true" />
                </span>
                <span className="text-sm text-pretty text-muted">{t(def.descriptionKey as StarterKey)}</span>
              </button>
            </li>
          ))}
        </ul>
        {failed ? (
          <p role="alert" className="mt-4 text-sm text-bad">
            {t("starters.failed", { name: titleOf(failed) })}
          </p>
        ) : null}
      </section>

      <p role="status" className="sr-only">
        {starting ? t("starters.opening", { name: titleOf(starting) }) : ""}
      </p>
    </div>
  );
}
