"use client";

import { useEffect, useId, useRef } from "react";
import type { KeyboardEvent } from "react";
import type { EffectRequest } from "@/ai/tools/effect";
import { Button } from "@/components/ui";
import type { Translate } from "@/i18n/translate";

type EffectMessages = typeof import("@/i18n/messages/en/aiEffects.json");
export type EffectT = Translate<EffectMessages>;

/** What the partner wants to spend searches on: the exact arguments, the cost, and a choice before anything is sent. */
export function EffectCard({
  request,
  onAllow,
  onDeny,
  t,
}: {
  request: EffectRequest;
  onAllow: () => void;
  onDeny: () => void;
  t: EffectT;
}) {
  const titleId = useId();
  const deny = useRef<HTMLButtonElement>(null);
  useEffect(() => deny.current?.focus(), []);

  function onKeyDown(event: KeyboardEvent) {
    if (event.key !== "Escape") return;
    event.stopPropagation();
    onDeny();
  }

  return (
    <section aria-labelledby={titleId} onKeyDown={onKeyDown} className="space-y-3 rounded-2xl bg-surface p-3">
      <h3 id={titleId} className="text-sm font-semibold">
        {t(`tool.${request.tool}`)}
      </h3>
      <div className="space-y-1">
        <p className="text-xs text-muted">{t("argsLabel")}</p>
        <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-sunken p-2 font-mono text-xs">
          {JSON.stringify(request.args, null, 2)}
        </pre>
      </div>
      <p className="text-sm tabular-nums">{t("cost", { count: request.costNote.searchesAtMost })}</p>
      <div className="flex flex-wrap gap-2">
        <Button ref={deny} size="sm" variant="secondary" onClick={onDeny}>
          {t("deny")}
        </Button>
        <Button size="sm" variant="primary" onClick={onAllow}>
          {t("allow")}
        </Button>
      </div>
      <p className="text-xs text-muted">{t("hint")}</p>
    </section>
  );
}
