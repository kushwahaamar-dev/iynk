"use client";

import { useMemo } from "react";
import { createTranslator } from "@/i18n/translate";
import { CaptureView, type ScopeProps } from "./Scope";

/** The same capture as the scope with every channel read as a digital pin, plus a note that bus decoding is not built yet. */
export function LogicAnalyser(props: ScopeProps) {
  const { channels, messages, lang } = props;
  const t = useMemo(() => createTranslator(lang, messages, `${lang}/instruments`), [lang, messages]);
  const digital = useMemo(() => channels.map((c) => ({ ...c, kind: "digital" as const })), [channels]);
  return (
    <div className="flex min-h-0 flex-col gap-2" data-testid="logic-analyser">
      <CaptureView {...props} channels={digital} testId="logic" />
      <p className="text-sm text-muted">{t("decoders")}</p>
    </div>
  );
}
