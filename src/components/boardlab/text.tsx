"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/namespaces";
import { createTranslator, type Translate } from "@/i18n/translate";

export type BoardLabMessages = Messages["boardlab"];
type ContentT = (key: string, params?: Record<string, string | number>) => string;

type TextValue = {
  locale: Locale;
  /** UI strings (src/i18n/messages/<lang>/boardlab.json). */
  t: Translate<BoardLabMessages>;
  /** The board's prose (src/i18n/content/<lang>/boards/<id>.json), by TextKey. */
  tc: ContentT;
  /** True when the prose has this key (optional notes). */
  has: (key: string | undefined) => key is string;
};

const TextContext = createContext<TextValue | null>(null);

function lookup(tree: unknown, key: string): unknown {
  let node = tree;
  for (const part of key.split(".")) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return node;
}

export function BoardLabText({
  locale,
  messages,
  text,
  children,
}: {
  locale: Locale;
  messages: BoardLabMessages;
  text: Record<string, unknown>;
  children: ReactNode;
}) {
  const value = useMemo<TextValue>(
    () => ({
      locale,
      t: createTranslator(locale, messages, `${locale}/boardlab`),
      tc: createTranslator(locale, text, `${locale}/boards`) as unknown as ContentT,
      has: (key): key is string => !!key && typeof lookup(text, key) === "string",
    }),
    [locale, messages, text],
  );
  return <TextContext.Provider value={value}>{children}</TextContext.Provider>;
}

export function useText(): TextValue {
  const value = useContext(TextContext);
  if (!value) throw new Error("Board Lab components must render inside <BoardLabText>.");
  return value;
}
