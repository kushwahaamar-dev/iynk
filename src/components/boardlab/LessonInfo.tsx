"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { cx } from "@/components/ui/cx";
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

/** The lesson's quick quiz: each answer a full-width row, and a reason with every answer once checked. */
export function Quiz({ quiz }: { quiz: NonNullable<Lesson["quiz"]> }) {
  const { t, tc } = useText();
  const [picks, setPicks] = useState<Record<string, number>>({});
  const [checked, setChecked] = useState(false);
  const score = quiz.questions.filter((q) => picks[q.id] === q.answer).length;
  return (
    <div className="flex flex-col gap-5" data-testid="lesson-quiz">
      {quiz.questions.map((q) => {
        const right = picks[q.id] === q.answer;
        return (
          <fieldset key={q.id} className="flex flex-col gap-1">
            <legend className="mb-1 text-base font-semibold leading-snug">{tc(q.q)}</legend>
            {q.options.map((o, i) => {
              const picked = picks[q.id] === i;
              return (
                <label
                  key={o}
                  className={cx(
                    "flex min-h-11 cursor-pointer items-center gap-3 rounded-ink-sm border-[1.5px] px-3 py-2 text-sm leading-snug",
                    checked && picked ? (right ? "on-fill border-good bg-good-bg" : "on-fill border-bad bg-bad-bg") : picked ? "border-ink" : "border-rule hover:bg-sunken",
                  )}
                >
                  <input
                    type="radio"
                    className="size-4 shrink-0"
                    name={`${quiz.id}-${q.id}`}
                    checked={picked}
                    onChange={() => {
                      setPicks({ ...picks, [q.id]: i });
                      setChecked(false);
                    }}
                  />
                  <span>{tc(o)}</span>
                </label>
              );
            })}
            {checked && (
              <p className={cx("mt-1 text-sm", right ? "text-good" : "text-bad")}>
                <strong className="font-semibold">{right ? t("lesson.quizRight") : t("lesson.quizWrong")}</strong> {tc(q.why)}
              </p>
            )}
          </fieldset>
        );
      })}
      <div className="flex items-center gap-3">
        <Button size="sm" variant="secondary" onClick={() => setChecked(true)} disabled={Object.keys(picks).length < quiz.questions.length}>
          {t("lesson.quizCheck")}
        </Button>
        {checked && (
          <span role="status" className="text-sm font-semibold">
            {t("lesson.quizScore", { score, total: quiz.questions.length })}
          </span>
        )}
      </div>
    </div>
  );
}

/** The lesson's reading: overview, pins, how the code works, specifications and hints (the quiz lives in the rail). */
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
              <dl className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                {lesson.specs.map((s) => (
                  <div key={s.label} className="border-t-[1.5px] border-rule py-2">
                    <dt className="ink-label">{tc(s.label)}</dt>
                    <dd className="font-medium">{tc(s.value)}</dd>
                  </div>
                ))}
              </dl>
            ),
          },
        ]
      : []),
    ...(lesson.hints.length > 0 ? [{ id: "hints", label: t("lesson.hints"), content: <Hints hints={lesson.hints} /> }] : []),
  ];
  return (
    <section data-testid="lesson-info">
      <Tabs label={tc(lesson.title)} tabs={tabs} defaultValue="overview" phoneGrid />
    </section>
  );
}
