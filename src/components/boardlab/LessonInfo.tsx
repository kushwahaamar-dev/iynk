"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Tabs } from "@/components/ui/Tabs";
import type { Lesson } from "@/content/schema";
import { WireDot } from "./WireInPanel";
import { useText } from "./text";

function Hints({ hints }: { hints: string[] }) {
  const { t, tc } = useText();
  const [shown, setShown] = useState(0);
  return (
    <div className="flex flex-col gap-3">
      <ol className="flex flex-col gap-2">
        {hints.slice(0, shown).map((h, i) => (
          <li key={h}>
            <Callout tone="tip" title={t("lesson.hint", { n: i + 1 })}>
              <p>{tc(h)}</p>
            </Callout>
          </li>
        ))}
      </ol>
      {shown < hints.length && (
        <Button size="sm" variant="secondary" className="self-start" onClick={() => setShown(shown + 1)}>
          {t("lesson.showHint")}
        </Button>
      )}
    </div>
  );
}

function Quiz({ quiz }: { quiz: NonNullable<Lesson["quiz"]> }) {
  const { t, tc } = useText();
  const [picks, setPicks] = useState<Record<string, number>>({});
  const [checked, setChecked] = useState(false);
  const score = quiz.questions.filter((q) => picks[q.id] === q.answer).length;
  return (
    <div className="flex flex-col gap-4">
      {quiz.questions.map((q) => (
        <fieldset key={q.id} className="flex flex-col gap-2">
          <legend className="font-semibold">{tc(q.q)}</legend>
          {q.options.map((o, i) => (
            <label key={o} className="flex min-h-11 items-center gap-2">
              <input type="radio" name={`${quiz.id}-${q.id}`} checked={picks[q.id] === i} onChange={() => setPicks({ ...picks, [q.id]: i })} />
              <span>{tc(o)}</span>
            </label>
          ))}
          {checked && (
            <p className={picks[q.id] === q.answer ? "text-good" : "text-bad"}>
              {picks[q.id] === q.answer ? t("lesson.quizRight") : t("lesson.quizWrong")} {tc(q.why)}
            </p>
          )}
        </fieldset>
      ))}
      <div className="flex items-center gap-3">
        <Button size="sm" onClick={() => setChecked(true)} disabled={Object.keys(picks).length < quiz.questions.length}>
          {t("lesson.quizCheck")}
        </Button>
        {checked && <span role="status">{t("lesson.quizScore", { score, total: quiz.questions.length })}</span>}
      </div>
    </div>
  );
}

/** The lesson's info card: overview, pins, how the code works, specifications, hints and its quiz. */
export function LessonInfo({ lesson }: { lesson: Lesson }) {
  const { t, tc } = useText();
  const tabs = [
    {
      id: "overview",
      label: t("lesson.overview"),
      content: (
        <div className="flex flex-col gap-3">
          <p className="text-lg leading-relaxed">{tc(lesson.lede)}</p>
          {lesson.features.length > 0 && (
            <ul className="flex flex-col gap-2">
              {lesson.features.map((f) => (
                <li key={f.text} className="flex gap-2">
                  <span aria-hidden="true" className="mt-2 inline-block size-2 shrink-0 rounded-full bg-mustard-m" />
                  <span>{tc(f.text)}</span>
                </li>
              ))}
            </ul>
          )}
          {lesson.language === "verilog" && (
            <Callout tone="note">
              <p>{t("lesson.fpgaNote")}</p>
            </Callout>
          )}
        </div>
      ),
    },
    ...(lesson.pins.length > 0
      ? [
          {
            id: "pins",
            label: t("lesson.pins"),
            content: (
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th scope="col" className="py-1 text-start">{t("lesson.pinCol")}</th>
                    <th scope="col" className="py-1 text-start">{t("lesson.toCol")}</th>
                    <th scope="col" className="py-1 text-start">{t("lesson.roleCol")}</th>
                  </tr>
                </thead>
                <tbody>
                  {lesson.pins.map((p) => (
                    <tr key={p.pin} className="border-t border-rule">
                      <td className="py-1.5">
                        <span className="flex items-center gap-2">
                          <WireDot color={p.color} />
                          <code>{p.pin}</code>
                        </span>
                      </td>
                      <td className="py-1.5">{tc(p.to)}</td>
                      <td className="py-1.5">{tc(p.role)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ),
          },
        ]
      : []),
    ...(lesson.steps.length > 0
      ? [
          {
            id: "steps",
            label: t("lesson.steps"),
            content: (
              <ol className="ms-5 flex list-decimal flex-col gap-2">
                {lesson.steps.map((s) => (
                  <li key={s}>{tc(s)}</li>
                ))}
              </ol>
            ),
          },
        ]
      : []),
    ...(lesson.specs.length > 0
      ? [
          {
            id: "specs",
            label: t("lesson.specs"),
            content: (
              <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {lesson.specs.map((s) => (
                  <div key={s.label} className="rounded-md bg-sunken p-2">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{tc(s.label)}</dt>
                    <dd className="font-medium">{tc(s.value)}</dd>
                  </div>
                ))}
              </dl>
            ),
          },
        ]
      : []),
    ...(lesson.hints.length > 0 ? [{ id: "hints", label: t("lesson.hints"), content: <Hints hints={lesson.hints} /> }] : []),
    ...(lesson.quiz ? [{ id: "quiz", label: t("lesson.quiz"), content: <Quiz quiz={lesson.quiz} /> }] : []),
  ];
  return (
    <section className="ink-card p-3 sm:p-4" data-testid="lesson-info">
      <Tabs label={tc(lesson.title)} tabs={tabs} defaultValue="overview" />
    </section>
  );
}
