"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/namespaces";
import { createTranslator } from "@/i18n/translate";
import { getAppRegistry } from "@/parts/builtin";
import { versionCompare } from "@/parts/descriptor";
import type { GoldenFixture } from "@/parts/golden";
import { makeModelEnv } from "@/sim/models/kinds";
import type { DocStore } from "@/studio/stores/doc";
import type { SessionStore } from "@/studio/stores/session";
import { useStoreSelector } from "@/studio/stores/select";
import { UpgradeHost } from "./UpgradeDialog";

// The browser build carries no golden fixture files, so the dialog compares descriptors and pins only.
const NO_FIXTURES: ReadonlyMap<string, GoldenFixture> = new Map();

export interface UpgradeOfferProps {
  doc: DocStore;
  session: SessionStore;
  messages: Messages["partinfo"];
  lang: Locale;
}

/** For the one selected part: a button that opens the upgrade dialog when the part registry holds a newer version than the project pins. */
export function UpgradeOffer({ doc, session, messages, lang }: UpgradeOfferProps) {
  const t = useMemo(() => createTranslator(lang, messages, `${lang}/partinfo`), [lang, messages]);
  const state = useStoreSelector(doc, (s) => s.state);
  const readOnly = useStoreSelector(doc, (s) => s.readOnly);
  const selection = useStoreSelector(session, (s) => s.selection);
  const viewId = useStoreSelector(session, (s) => s.viewId);
  const [open, setOpen] = useState(false);
  const registry = getAppRegistry();
  const env = useMemo(() => makeModelEnv((ref, version) => registry.get(ref, version)), [registry]);

  const picked = selection.filter((s) => s.kind === "part" && s.view === viewId);
  const instance = picked.length === 1 ? [...state.boards, ...state.components].find((x) => x.id === picked[0]!.id) : undefined;
  const dep = instance && state.dependencies.components.find((d) => d.ref === instance.definition.ref && d.version === instance.definition.version);
  const from = dep && registry.get(dep.ref, dep.version);
  const to = dep && registry.latest(dep.ref);
  if (!dep || !from || !to || readOnly || versionCompare(to.version, dep.version) <= 0) return null;

  const origin = registry.originOf(to.id, to.version) === "core" ? "builtin" : dep.origin === "embedded" ? "embedded" : "library";
  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        {t("upgrade.button", { version: to.version })}
      </Button>
      {open ? (
        <UpgradeHost
          from={from}
          to={to}
          origin={origin}
          doc={state}
          fixtures={NO_FIXTURES}
          env={env}
          messages={messages}
          commit={(ops, opts) => doc.commit(ops, opts)}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
