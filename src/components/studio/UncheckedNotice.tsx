"use client";

import { Button, Callout } from "@/components/ui";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/namespaces";
import { createTranslator } from "@/i18n/translate";
import type { NoticeAction } from "@/studio/provenance-notice";

export interface UncheckedNoticeProps {
  count: number;
  action: NoticeAction;
  onContinue(): void;
  onCancel(): void;
  messages: Messages["studio"];
  lang: Locale;
  continueLabel: string;
}

/** Tells the sender how much third-party text is still unreviewed. It never blocks: Continue goes on. */
export function UncheckedNotice({ count, action, onContinue, onCancel, messages, lang, continueLabel }: UncheckedNoticeProps) {
  const t = createTranslator(lang, messages, `${lang}/studio`);
  const note = action === "export" ? "lesson.guide.provenance.exportNote" : "lesson.guide.provenance.shareNote";

  return (
    <div className="flex flex-col gap-4">
      <Callout tone="warn" title={t("lesson.guide.provenance.unchecked", { n: count })}>
        {t(note, { n: count })}
      </Callout>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          {t("dialog.cancel")}
        </Button>
        <Button variant="primary" onClick={onContinue}>
          {continueLabel}
        </Button>
      </div>
    </div>
  );
}
