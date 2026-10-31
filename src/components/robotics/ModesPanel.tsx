"use client";

import { Button } from "@/components/ui/Button";
import { CodeBlock } from "@/components/ui/CodeBlock";
import type { CodeLang } from "@/components/ui/highlight";
import type { Language, RoboticsContent } from "@/content/schema";
import type { BenchAction } from "@/lib/robotics/session";
import { renderCode, type BenchTexts } from "@/lib/robotics/text";
import type { BenchT, TextOf } from "./messages";

export const CODE_LANG: Record<Language, CodeLang> = {
  "arduino-cpp": "cpp",
  micropython: "python",
  python: "python",
  verilog: "verilog",
};

type Props = {
  bench: RoboticsContent;
  selected: string;
  running: string | null;
  texts: BenchTexts;
  t: BenchT;
  tx: TextOf;
  dispatch: (action: BenchAction) => void;
  headingId: string;
};

export function ModesPanel({ bench, selected, running, texts, t, tx, dispatch, headingId }: Props) {
  const mode = bench.modes.find((m) => m.id === selected) ?? bench.modes[0];
  if (!mode) return null;
  const title = tx(mode.title);
  const isRunning = running === mode.id;

  return (
    <section aria-labelledby={headingId} className="min-w-0">
      <h2 id={headingId} className="text-xl">
        {t("modes.heading")}
      </h2>
      <div role="group" aria-label={t("modes.pick")} className="mt-3 flex flex-wrap gap-2">
        {bench.modes.map((m) => (
          <Button
            key={m.id}
            size="sm"
            variant="secondary"
            aria-pressed={m.id === mode.id}
            onClick={() => dispatch({ type: "mode/select", mode: m.id })}
          >
            {tx(m.title)}
            {running === m.id ? <span className="sr-only"> ({t("modes.running")})</span> : null}
          </Button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button
          size="sm"
          variant="primary"
          aria-label={`${mode.instant ? t("modes.switch") : t("modes.upload")}: ${title}`}
          onClick={() => dispatch({ type: "mode/run", mode: mode.id })}
          disabled={isRunning}
        >
          {mode.instant ? t("modes.switch") : t("modes.upload")}
        </Button>
        <span className="text-xs font-semibold text-muted" aria-live="polite">
          {isRunning ? t("modes.running") : t("modes.selected")}
        </span>
      </div>
      <p className="mt-2 text-sm text-muted">{mode.instant ? t("modes.instant") : t("modes.bytes", { bytes: mode.bytes })}</p>
      <CodeBlock
        className="mt-3"
        code={renderCode(mode.code.source, texts)}
        lang={CODE_LANG[mode.language]}
        title={t("modes.code", { title })}
        label={t("modes.code", { title })}
        copyLabel={t("modes.copy")}
        copiedLabel={t("modes.copied")}
      />
    </section>
  );
}
