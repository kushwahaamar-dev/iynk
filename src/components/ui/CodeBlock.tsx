"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cx } from "./cx";
import { tokenLines, type CodeLang } from "./highlight";
import { Icon } from "./icons";

type CodeBlockProps = {
  code: string;
  lang?: CodeLang;
  /** Shown in the header, e.g. "Betaflight CLI" or "blink.ino". */
  title?: string;
  /** Accessible name of the scrollable code region. */
  label: string;
  copyLabel: string;
  copiedLabel: string;
  lineNumbers?: boolean;
  /** 1-based line numbers to mark. */
  highlight?: readonly number[];
  className?: string;
};

/** Read-only, highlighted code with a copy button. Long lines scroll inside the block. */
export function CodeBlock({ code, lang = "text", title, label, copyLabel, copiedLabel, lineNumbers = false, highlight, className }: CodeBlockProps) {
  const lines = useMemo(() => tokenLines(code.replace(/\n$/, ""), lang), [code, lang]);
  const marked = useMemo(() => new Set(highlight ?? []), [highlight]);
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <figure className={cx("overflow-hidden rounded-ink border-2 border-line bg-[var(--code-bg)] text-[var(--code-fg)] shadow-ink-sm", className)}>
      <figcaption className="flex min-h-11 items-center gap-2 border-b-2 border-line bg-sunken py-1 ps-3.5 pe-1">
        <span className="min-w-0 flex-1 truncate ink-kicker">{title}</span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 font-body text-sm font-semibold text-ink hover:bg-surface"
        >
          <Icon name={copied ? "check" : "copy"} size={16} />
          <span aria-live="polite">{copied ? copiedLabel : copyLabel}</span>
        </button>
      </figcaption>
      <pre tabIndex={0} aria-label={label} className="overflow-x-auto py-3 font-ui text-sm leading-6">
        <code className="block min-w-max">
          {lines.map((tokens, index) => (
            <span
              key={index}
              className={cx("block pe-4", lineNumbers ? "ps-0" : "ps-4", marked.has(index + 1) && "bg-[var(--code-line)] shadow-[inset_3px_0_0_var(--color-mustard)]")}
            >
              {lineNumbers ? (
                <span aria-hidden="true" className="inline-block w-10 select-none pe-3 text-end text-[var(--code-cm)]">
                  {index + 1}
                </span>
              ) : null}
              {tokens.length === 0 ? "​" : null}
              {tokens.map((token, j) =>
                token.kind === "plain" ? (
                  token.text
                ) : (
                  <span key={j} className={`tok-${token.kind}`}>
                    {token.text}
                  </span>
                ),
              )}
              {"\n"}
            </span>
          ))}
        </code>
      </pre>
    </figure>
  );
}
