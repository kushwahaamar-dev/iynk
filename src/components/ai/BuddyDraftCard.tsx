"use client";

import { useId, useState } from "react";
import type { KeyboardEvent } from "react";
import type { BuddyDraft } from "@/ai/tools/buddy-draft";
import type { AiT } from "@/ai/messages";
import { Button, Select, TextArea } from "@/components/ui";

/** The partner's draft message to a buddy, in a box the person edits. Nothing leaves here until they press Send in the chat. */
export function BuddyDraftCard({
  draft,
  buddies,
  canLink,
  t,
  onUse,
  onDismiss,
  onAddLink,
}: {
  draft: BuddyDraft;
  buddies: { alias: string }[];
  canLink: boolean;
  t: AiT;
  onUse(d: BuddyDraft): void;
  onDismiss(): void;
  onAddLink(): void;
}) {
  const titleId = useId();
  const [text, setText] = useState(draft.text);
  const [buddy, setBuddy] = useState(draft.buddy ?? buddies[0]?.alias);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key !== "Escape") return;
    event.stopPropagation();
    onDismiss();
  }

  return (
    <section aria-labelledby={titleId} onKeyDown={onKeyDown} className="space-y-3 rounded-2xl bg-surface p-3">
      <h3 id={titleId} className="text-sm font-semibold">
        {t("draft.title")}
      </h3>
      {buddies.length === 0 ? (
        <p className="text-sm text-muted">{t("draft.noBuddies")}</p>
      ) : (
        <Select label={t("draft.buddy")} value={buddy} onChange={(e) => setBuddy(e.target.value)}>
          {buddies.map((b) => (
            <option key={b.alias} value={b.alias}>
              {b.alias}
            </option>
          ))}
        </Select>
      )}
      <TextArea
        label={t("draft.title")}
        hideLabel
        rows={5}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setCopied(false);
        }}
      />
      {canLink ? (
        !draft.includeLink && (
          <Button size="sm" variant="secondary" onClick={onAddLink}>
            {t("draft.addLink")}
          </Button>
        )
      ) : (
        <p className="text-xs text-muted">{t("draft.noLink")}</p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={onDismiss}>
          {t("draft.dismiss")}
        </Button>
        <Button size="sm" variant="secondary" onClick={copy} aria-live="polite">
          {copied ? t("draft.copied") : t("draft.copy")}
        </Button>
        {buddies.length > 0 && (
          <Button size="sm" variant="primary" disabled={text.trim() === ""} onClick={() => onUse({ buddy, text: text.trim(), includeLink: draft.includeLink })}>
            {t("draft.use")}
          </Button>
        )}
      </div>
      <p className="text-xs text-muted">{t("draft.sentByYou")}</p>
    </section>
  );
}
