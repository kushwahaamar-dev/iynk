"use client";

import { Button, Icon, Select, type IconName } from "@/components/ui";
import { LOSS, type LossItem, type LossSeverity } from "@/export/loss";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/namespaces";
import { createTranslator } from "@/i18n/translate";

export interface LossReportProps {
  strings: Messages["studio"];
  lang: Locale;
  loss: readonly LossItem[];
  /** For an import: the board the project will be made on, and the boards it can be made on. */
  board?: { value: string; options: { id: string; label: string }[]; onChange(id: string): void };
  onConfirm(): void;
  onCancel(): void;
  confirmLabel: string;
}

const SEVERITY_ORDER: readonly LossSeverity[] = ["error", "warning", "info"];
const LOOK: Record<LossSeverity, { icon: IconName; ink: string }> = {
  error: { icon: "danger", ink: "text-bad" },
  warning: { icon: "warn", ink: "text-warn" },
  info: { icon: "info", ink: "text-info" },
};
const ANALYSER_CODES: ReadonlySet<string> = new Set([LOSS.unsupported, LOSS.unsupportedInclude]);
const LINE_IN_PATH = /:(\d+):\d+$/;

/** What an import or export changes, worst first, with the board choice for an import and the buttons to go on. */
export function LossReport({ strings, lang, loss, board, onConfirm, onCancel, confirmLabel }: LossReportProps) {
  const t = createTranslator(lang, strings, `${lang}/studio`);
  const sorted = SEVERITY_ORDER.flatMap((severity) => loss.filter((item) => item.severity === severity));
  const boardLabel = board?.options.find((option) => option.id === board.value)?.label ?? board?.value;

  function describe(item: LossItem): string {
    const line = item.path === undefined ? undefined : LINE_IN_PATH.exec(item.path)?.[1];
    return line === undefined ? item.message : t("ino.unsupported", { line, message: item.message });
  }

  return (
    <div className="flex flex-col gap-4">
      {board ? (
        <Select label={t("ino.lossBoard", { board: boardLabel ?? "" })} value={board.value} onChange={(event) => board.onChange(event.target.value)}>
          {board.options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </Select>
      ) : null}

      <section aria-labelledby="loss-title" className="flex flex-col gap-2">
        <h3 id="loss-title" className="text-base font-semibold text-balance">
          {t("ino.lossTitle")}
        </h3>
        {sorted.length === 0 ? (
          <p className="text-sm text-muted">{t("ino.lossNone")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {sorted.map((item, index) => (
              <li key={`${item.code}-${item.path ?? index}`} className="flex items-start gap-2 text-sm text-pretty">
                <Icon name={LOOK[item.severity].icon} size={16} className={`mt-0.5 shrink-0 ${LOOK[item.severity].ink}`} aria-hidden="true" />
                <span className="min-w-0 break-words">{describe(item)}</span>
              </li>
            ))}
          </ul>
        )}
        {loss.some((item) => ANALYSER_CODES.has(item.code)) ? <p className="text-sm text-muted">{t("ino.firstOnly")}</p> : null}
      </section>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          {t("ino.cancel")}
        </Button>
        <Button variant="primary" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
}
