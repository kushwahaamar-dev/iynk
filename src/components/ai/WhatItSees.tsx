"use client";

import { useId } from "react";
import type { Pack, SourceId } from "@/ai/context/pack";
import { Button, Callout, Dialog, Toggle } from "@/components/ui";
import type { Translate } from "@/i18n/translate";

type InsightMessages = typeof import("@/i18n/messages/en/aiInsight.json");
export type InsightT = Translate<InsightMessages>;

export type PackPreview = Pick<Pack, "text" | "hash8" | "sections" | "tokensEst" | "profile">;

type WhatItSeesProps = {
  preview: PackPreview;
  destination: { host: string; local: boolean };
  onToggle: (id: SourceId, on: boolean) => void;
  onClose: () => void;
  t: InsightT;
};

/** The exact text the next request carries, so a person can read it and switch a source off before anything leaves the browser. */
export function WhatItSees({ preview, destination, onToggle, onClose, t }: WhatItSeesProps) {
  const textId = useId();
  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title={t("what.title")}
      description={t("what.description")}
      closeLabel={t("what.close")}
      footer={
        <Button variant="primary" onClick={onClose}>
          {t("what.close")}
        </Button>
      }
    >
      <div className="space-y-6">
        <Callout tone={destination.local ? "tip" : "note"}>
          {destination.local ? t("what.destinationLocal") : t("what.destinationCloud", { host: destination.host })}
        </Callout>

        <section aria-labelledby={`${textId}-s`} className="space-y-2">
          <h3 id={`${textId}-s`} className="text-base font-semibold">
            {t("what.sources")}
          </h3>
          <ul className="divide-y divide-rule">
            {preview.sections.map((section) => (
              <li key={section.id}>
                <Toggle
                  checked={section.included}
                  onChange={(on) => onToggle(section.id, on)}
                  label={t(`what.source.${section.id}`)}
                  description={t("what.tokens", { count: section.tokens })}
                />
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby={`${textId}-t`} className="space-y-2">
          <h3 id={`${textId}-t`} className="text-base font-semibold">
            {t("what.text")}
          </h3>
          <p className="text-sm text-muted tabular-nums">
            {t("what.total", { count: preview.tokensEst, profile: t(`what.profile.${preview.profile}`) })}
          </p>
          <p className="text-sm text-muted">
            {t("what.hash")} <code className="font-mono text-ink">{preview.hash8}</code>
          </p>
          <pre
            tabIndex={0}
            aria-labelledby={`${textId}-t`}
            className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-sunken p-3 font-mono text-xs"
          >
            {preview.text}
          </pre>
        </section>
      </div>
    </Dialog>
  );
}
