"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { legacyCause } from "@/content/faults/legacy-map";
import type { BoardId } from "@/content/ids";
import { boardLoaders } from "@/content/index.generated";
import type { FailureMode } from "@/content/schema";
import { builtinRegistry } from "@/parts/builtin";
import type { Project } from "@/project/generated/types";
import type { TemplateEntry } from "@/project/guided/plan";
import { buildSimNetlist } from "@/sim-host";
import { causeMeta } from "@/sim/faults/causes";
import { listCandidates } from "@/sim/faults/generate";
import { buildNetView } from "@/sim/faults/netlist-view";
import { faultOffers, type FaultLookup, type FaultOffers } from "@/studio/guide/lesson-faults";
import type { DocStore } from "@/studio/stores/doc";

const registry = builtinRegistry();
const NO_OFFERS: FaultOffers = { own: [], more: [], unmapped: [] };

type BoardFailures = { key: string; failures: FailureMode[]; text: unknown };

function describe(descriptorId: string) {
  const [ref = "", version = ""] = descriptorId.split("@");
  return registry.get(ref, version);
}

function textAt(tree: unknown, key: string): string | undefined {
  let node = tree;
  for (const part of key.split(".")) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : undefined;
}

function useBoardFailures(board: string | undefined, lang: string): BoardFailures | null {
  const [loaded, setLoaded] = useState<BoardFailures | null>(null);
  const key = `${board}/${lang}`;

  useEffect(() => {
    const load = board === undefined ? undefined : boardLoaders[board as BoardId];
    if (!load) return;
    let live = true;
    const text = import(`@/i18n/content/${lang}/boards/${board}.json`).catch(() => import(`@/i18n/content/en/boards/${board}.json`));
    void Promise.all([load(), text]).then(
      ([content, strings]) => live && setLoaded({ key, failures: content.default.failures, text: strings.default }),
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, [board, lang, key]);

  return loaded?.key === key ? loaded : null;
}

/**
 * The faults a lesson offers, taken from the failures of its board in the catalogue. A failure is offered when the
 * simulator models its cause and the project has a fault of that cause to switch on.
 */
export function useLessonFaults({ doc, project, template, lang, labels }: {
  doc: DocStore;
  project: Project;
  template: TemplateEntry | undefined;
  lang: string;
  labels: { trigger: string; repair: string };
}) {
  const source = useBoardFailures(template?.board, lang);
  const settled = useDeferredValue(project);

  const candidates = useMemo(() => {
    if (!source) return [];
    const view = buildNetView(buildSimNetlist(settled, registry).net, describe);
    return listCandidates(settled, view, Object.fromEntries(settled.sources.map((s) => [s.path, s.content])));
  }, [source, settled]);

  const offers = useMemo(() => {
    if (!template || !source) return NO_OFFERS;
    const taken = new Set<string>();
    const lookup: FaultLookup = (_board, failureId) => {
      const failure = source.failures.find((f) => f.id === failureId);
      if (!failure) return null;
      const { cause_id, symptom_ids } = legacyCause(failure);
      const meta = causeMeta(cause_id);
      if (!meta?.modelled || meta.seat !== "SIM") return null;
      const candidate = candidates.find((c) => c.causeId === cause_id && !taken.has(c.fault.id));
      if (!candidate) return null;
      taken.add(candidate.fault.id);
      return { faultId: candidate.fault.id, causeId: cause_id, symptomId: symptom_ids[0] ?? "part-dead", title: textAt(source.text, failure.title) ?? failureId };
    };
    return faultOffers(template.id, template.board, lookup, lang);
  }, [template, source, candidates, lang]);

  const set = useCallback(
    (faultId: string, on: boolean) => {
      const fault = doc.getState().state.simulation.faults.find((f) => f.id === faultId) ?? candidates.find((c) => c.fault.id === faultId)?.fault;
      if (fault) doc.commit([{ k: "fault.set", fault: { ...fault, enabled: on } }], { label: on ? labels.trigger : labels.repair });
    },
    [doc, candidates, labels],
  );

  const breakFailure = useCallback(
    (failureId: string) => {
      const offer = [...offers.own, ...offers.more].find((o) => o.failureId === failureId);
      if (offer) set(offer.faultId, true);
    },
    [offers, set],
  );

  /** The figure state of the failure behind the fault that is on, so the lens shows what the catalogue shows. */
  const figureFault = useMemo(() => {
    const on = new Set(project.simulation.faults.filter((f) => f.enabled).map((f) => f.id));
    const offer = [...offers.own, ...offers.more].find((o) => on.has(o.faultId));
    const figure = offer && source?.failures.find((f) => f.id === offer.failureId)?.figure;
    return figure?.type === "set" ? figure.state : null;
  }, [project.simulation.faults, offers, source]);

  return { offers, set, breakFailure, figureFault };
}
