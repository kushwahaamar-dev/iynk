import "server-only";
import type { Locale } from "@/i18n/config";

/** English names, the way prompts and Muse Voice Transcribe's languageBias name languages. */
export const LANGUAGE_NAMES: Record<Locale, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  zh: "Simplified Chinese",
  hi: "Hindi",
};

/** Muse Voice Transcribe lists Mandarin Chinese among its 25 languages. */
export const TRANSCRIBE_LANGUAGES: Record<Locale, string> = { ...LANGUAGE_NAMES, zh: "Mandarin Chinese" };

/** Untrusted text (names, chat, bench dumps) goes inside a fence the model is told to treat as data. */
export function quoted(label: string, text: string): string {
  const safe = text.replaceAll("<<<", "‹‹‹").replaceAll(">>>", "›››");
  return `${label}:\n<<<\n${safe}\n>>>`;
}
