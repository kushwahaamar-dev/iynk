"use client";

import { useId, useMemo, useState } from "react";
import { Button, Chip, InlineStatus } from "@/components/ui";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/namespaces";
import { createTranslator } from "@/i18n/translate";
import type { Evidence } from "@/project/diagnosis";
import { buildOptions, optionSeed, outcomeOf, toDiagnosis, type PickRecord } from "@/sim/faults/diagnose";
import type { ladderFor } from "@/sim/faults/hints";
import { useStoreSelector } from "@/studio/stores/select";
import type { DiagnoseStore } from "@/studio/stores/diagnose";
import { DiagnosisRecord } from "./DiagnosisRecord";
import { HintLadder } from "./HintLadder";
import { TransferQuestion } from "./TransferQuestion";

export interface DiagnosePanelProps {
  store: DiagnoseStore;
  ladder: ReturnType<typeof ladderFor>;
  messages: Messages["faults"];
  lang: Locale;
  /** True once `bench-check` results exist for this cause. */
  benchChecked: boolean;
  logOn: boolean;
  onOpenSettings(): void;
  /** The newest multimeter reading or serial line, ready to pin; null when there is none. */
  latestEvidence: Evidence | null;
  /** Puts the multimeter probes on the two points of a reading shortcut. */
  onMeasure(a: string, b: string): void;
}

const CONFIDENCE: readonly NonNullable<PickRecord["confidence"]>[] = ["guess", "think", "sure"];

export function DiagnosePanel({ store, ladder, messages, lang, benchChecked, logOn, onOpenSettings, latestEvidence, onMeasure }: DiagnosePanelProps) {
  const t = useMemo(() => createTranslator(lang, messages, `${lang}/faults`), [lang, messages]);
  const { session, lastRemedy, error } = useStoreSelector(store, (s) => s);
  const [choice, setChoice] = useState<number | null>(null);
  const [confidence, setConfidence] = useState<PickRecord["confidence"]>();
  const [transferDone, setTransferDone] = useState(false);
  const ids = useId();
  const options = useMemo(() => (session ? buildOptions(session.spec, optionSeed(session.projectId)) : []), [session?.spec, session?.projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (session === null) return null;
  const { spec, state } = session;
  const done = state === "verified" || state === "revealed";
  const lastPick = session.picks.at(-1);
  const diagnosis = toDiagnosis(session);
  const picked = choice === null ? undefined : options[choice];

  return (
    <section aria-labelledby={`${ids}-title`} className="flex min-h-0 flex-col gap-4" data-testid="diagnose-panel">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={`${ids}-title`} className="text-lg font-semibold text-balance">
          {t("diagnose.title")}
        </h2>
        <Chip tone={done ? "good" : "neutral"}>{t(`diagnose.state.${state}`)}</Chip>
      </header>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">{t("diagnose.symptomHeading")}</h3>
        <p className="max-w-prose text-base text-pretty">{spec.symptom.text}</p>
        {done ? null : <p className="text-sm text-muted">{t("diagnose.sealedInfo")}</p>}
      </div>

      {spec.readings && !done ? (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">{t("diagnose.readings")}</h3>
          <ul className="flex flex-wrap gap-2">
            {spec.readings.map((r) => (
              <li key={`${r.a}:${r.b}`}>
                <Button size="sm" variant="secondary" onClick={() => onMeasure(r.a, r.b)}>
                  {r.label}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">{t("diagnose.notes")}</h3>
        {session.notes.length === 0 ? (
          <p className="text-sm text-muted">{t("diagnose.notesEmpty")}</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {session.notes.map((e, i) => (
              <li key={i} className="font-ui tabular break-all">
                {t(`evidence.kind.${e.kind}`)} {e.ref}: {e.value}
                {e.unit ? ` ${e.unit}` : ""}
              </li>
            ))}
          </ul>
        )}
        {done ? null : (
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="secondary" disabled={latestEvidence === null} onClick={() => latestEvidence && store.note(latestEvidence)}>
              {t("diagnose.addToNotes")}
            </Button>
            {latestEvidence === null ? <span className="text-sm text-muted">{t("diagnose.nothingToNote")}</span> : null}
          </div>
        )}
      </div>

      {state === "presented" || state === "observing" ? (
        <div className="flex flex-col gap-2">
          {lastPick && !lastPick.correct ? (
            <InlineStatus tone="bad" live>
              {t("diagnose.wrong")} {t("diagnose.wrongWhy")}
            </InlineStatus>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" disabled={state === "presented"} onClick={() => store.dispatch({ t: "diagnose" })}>
              {lastPick ? t("diagnose.tryAgain") : t("diagnose.diagnoseNow")}
            </Button>
            {state === "presented" ? <span className="text-sm text-muted">{t("diagnose.runFirst")}</span> : null}
          </div>
        </div>
      ) : null}

      {state === "picking" ? (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!picked) return;
            store.pick(picked.cause_id, confidence);
            setChoice(null);
            setConfidence(undefined);
          }}
        >
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-semibold">{t("diagnose.pickHeading")}</legend>
            {options.map((o, i) => (
              <label key={i} className="flex items-start gap-2 rounded-lg bg-sunken px-3 py-2 text-base has-checked:bg-hover has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent">
                <input type="radio" name={`${ids}-cause`} checked={choice === i} onChange={() => setChoice(i)} className="mt-1" />
                <span>{o.label}</span>
              </label>
            ))}
          </fieldset>
          <fieldset className="flex flex-wrap items-center gap-4">
            <legend className="mb-2 text-sm font-semibold">{t("diagnose.confidenceLabel")}</legend>
            {CONFIDENCE.map((c) => (
              <label key={c} className="flex items-center gap-2 text-sm">
                <input type="radio" name={`${ids}-confidence`} checked={confidence === c} onChange={() => setConfidence(c)} />
                {t(`diagnose.confidence.${c}`)}
              </label>
            ))}
          </fieldset>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" variant="primary" disabled={!picked}>
              {t("diagnose.submit")}
            </Button>
            <Button variant="ghost" onClick={() => store.dispatch({ t: "giveUp" })}>
              {t("diagnose.giveUp")}
            </Button>
          </div>
        </form>
      ) : null}

      {state === "fixing" ? (
        <div className="flex flex-col gap-2">
          <InlineStatus tone="good" live>
            {t("diagnose.right")} {spec.kind === "built-wrong" ? t("diagnose.editable") : null}
          </InlineStatus>
          {spec.kind === "injected" && spec.remedies ? (
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold">{t("diagnose.remedyHeading")}</h3>
              <ul className="flex flex-col gap-2">
                {spec.remedies.map((r) => (
                  <li key={r.id}>
                    <Button size="sm" variant="secondary" onClick={() => store.chooseRemedy(r.id)}>
                      {r.text}
                    </Button>
                  </li>
                ))}
              </ul>
              {lastRemedy ? (
                <InlineStatus tone={lastRemedy.correct ? "good" : "bad"} live>
                  {lastRemedy.correct ? t("diagnose.remedyApplied") : t("diagnose.remedyWrong")}
                </InlineStatus>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted">{t("diagnose.rightNext")}</p>
          )}
          {error ? <InlineStatus tone="bad" live>{error}</InlineStatus> : null}
        </div>
      ) : null}

      {done ? (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">{t("diagnose.explanationHeading")}</h3>
          <p className="max-w-prose text-base text-pretty">{spec.explanation}</p>
        </div>
      ) : (
        <HintLadder levels={ladder} opened={session.hintLevel} onOpen={(level) => store.dispatch({ t: "hint", level })} messages={messages} lang={lang} />
      )}

      {state === "verified" && spec.transfer && !transferDone ? <TransferQuestion transfer={spec.transfer} t={t} onDone={() => setTransferDone(true)} /> : null}

      {diagnosis ? (
        <DiagnosisRecord diagnosis={diagnosis} outcome={outcomeOf(session)} projectId={session.projectId} benchChecked={benchChecked} logOn={logOn} messages={messages} lang={lang} onOpenSettings={onOpenSettings} />
      ) : null}

      <p className="text-sm text-muted">{benchChecked ? t("fidelity.checked") : t("fidelity.notChecked")}</p>

      {done ? null : (
        <div>
          <Button size="sm" variant="ghost" onClick={() => store.dispatch({ t: "showCause" })}>
            {t("diagnose.showCause")}
          </Button>
        </div>
      )}
    </section>
  );
}
