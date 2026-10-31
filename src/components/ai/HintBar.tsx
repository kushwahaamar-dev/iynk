"use client";

import { useState } from "react";
import type { Level } from "@/ai/hints";
import type { Mode } from "@/ai/modes";
import { Button } from "@/components/ui";
import type { AiT } from "./ToolCard";

type HintBarProps = {
  mode: Mode;
  level: Level;
  holdMe: boolean;
  showFixIt: boolean;
  showApply: boolean;
  busy: boolean;
  t: AiT;
  onAnother(): void;
  onShow(confirmed: boolean): void;
  onFixIt(): void;
  onApply(): void;
};

/** The hint ladder in one row: where the person is on it, and the buttons that climb it. */
export function HintBar({ mode, level, holdMe, showFixIt, showApply, busy, t, onAnother, onShow, onFixIt, onApply }: HintBarProps) {
  const [confirming, setConfirming] = useState(false);
  const teaching = mode === "socratic" || mode === "beginner";

  function show() {
    if (holdMe && !confirming) {
      setConfirming(true);
      return;
    }
    setConfirming(false);
    onShow(holdMe);
  }

  return (
    <div role="group" aria-label={t("ladder.label")} className="flex flex-wrap items-center gap-2">
      {teaching ? (
        <>
          <p className="me-auto text-sm font-semibold tabular-nums">{t("ladder.level", { level })}</p>
          {confirming ? (
            <>
              <p role="alert" className="basis-full text-sm">
                {t("ladder.confirmShow")}
              </p>
              <Button size="sm" variant="primary" disabled={busy} onClick={show}>
                {t("ladder.show")}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
                {t("draft.dismiss")}
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="secondary" disabled={busy || level >= 3} onClick={onAnother}>
                {t("ladder.another")}
              </Button>
              <Button size="sm" variant="secondary" disabled={busy} onClick={show}>
                {t("ladder.show")}
              </Button>
            </>
          )}
        </>
      ) : null}
      {mode === "debugging" ? (
        showFixIt ? (
          <Button size="sm" variant="secondary" disabled={busy} onClick={onFixIt}>
            {t("ladder.fixIt")}
          </Button>
        ) : (
          <p className="text-sm text-muted">{t("ladder.codeWithheld")}</p>
        )
      ) : null}
      {teaching && showApply ? (
        <Button size="sm" variant="primary" disabled={busy} onClick={onApply}>
          {t("ladder.apply")}
        </Button>
      ) : null}
    </div>
  );
}
