"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { Messages } from "@/i18n/namespaces";
import { useLocale } from "@/i18n/client";
import { createTranslator, type Translate } from "@/i18n/translate";
import type { BenchState } from "@/lib/robotics/session";
import type { BenchStore } from "@/lib/robotics/store";
import type { BenchTexts } from "@/lib/robotics/text";

type RoboticsMessages = Messages["robotics"];

/** The part of the robotics namespace the bench workspace renders (primer rule 11). */
export type BenchMessages = Pick<
  RoboticsMessages,
  "bench" | "steps" | "faults" | "status" | "current" | "serial" | "modes" | "tasks" | "quiz" | "keys"
>;

export type BenchT = Translate<BenchMessages>;

export function useBenchT(messages: BenchMessages): BenchT {
  const locale = useLocale();
  return useMemo(() => createTranslator(locale, messages, `${locale}/robotics`), [locale, messages]);
}

/** Item prose by TextKey (already in the page language); {name} placeholders are filled when given. */
export type TextOf = (key: string, params?: Record<string, string | number>) => string;

export function textLookup(texts: BenchTexts): TextOf {
  return (key, params) => {
    const text = texts[key] ?? "";
    if (!params) return text;
    return text.replace(/\{(\w+)\}/g, (whole, name: string) => (params[name] === undefined ? whole : String(params[name])));
  };
}

export function useBenchState(store: BenchStore): BenchState {
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}
