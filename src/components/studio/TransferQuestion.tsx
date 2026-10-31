"use client";

import { useId, useState } from "react";
import { Button, InlineStatus } from "@/components/ui";
import type { Messages } from "@/i18n/namespaces";
import type { Translate } from "@/i18n/translate";
import type { DiagnoseSpec } from "@/sim/faults/seal";

export interface TransferQuestionProps {
  transfer: NonNullable<DiagnoseSpec["transfer"]>;
  t: Translate<Messages["faults"]>;
  onDone(): void;
}

export function TransferQuestion({ transfer, t, onDone }: TransferQuestionProps) {
  const [choice, setChoice] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const ids = useId();
  const correct = choice === transfer.answer;

  return (
    <form
      className="flex flex-col gap-3"
      data-testid="transfer-question"
      onSubmit={(e) => {
        e.preventDefault();
        if (choice !== null) setChecked(true);
      }}
    >
      <fieldset className="flex flex-col gap-2" disabled={checked}>
        <legend className="text-sm font-semibold">{t("diagnose.transferTitle")}</legend>
        <p className="mb-2 max-w-prose text-base text-pretty">{transfer.question}</p>
        {transfer.options.map((option, i) => (
          <label key={i} className="flex items-start gap-2 rounded-lg bg-sunken px-3 py-2 text-base has-checked:bg-hover has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent">
            <input type="radio" name={`${ids}-transfer`} checked={choice === i} onChange={() => setChoice(i)} className="mt-1" />
            <span>{option}</span>
          </label>
        ))}
      </fieldset>
      {checked ? (
        <InlineStatus tone={correct ? "good" : "bad"} live>
          {correct ? t("diagnose.right") : `${t("diagnose.wrong")} ${transfer.options[transfer.answer]}`}
        </InlineStatus>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        {checked ? null : (
          <Button type="submit" variant="primary" disabled={choice === null}>
            {t("diagnose.submit")}
          </Button>
        )}
        <Button variant="ghost" onClick={onDone}>
          {t("diagnose.skip")}
        </Button>
      </div>
    </form>
  );
}
