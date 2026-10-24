import { htmlLang, type Locale } from "@/i18n/config";

/** "42.180 s" under a minute, "1:02.345" from a minute up, with the locale's decimal mark. */
export function formatLap(ms: number, locale: Locale): string {
  const tag = htmlLang(locale);
  const seconds = ms / 1000;
  if (seconds < 60) {
    return new Intl.NumberFormat(tag, {
      style: "unit",
      unit: "second",
      unitDisplay: "narrow",
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }).format(seconds);
  }
  const minutes = Math.floor(seconds / 60);
  const rest = new Intl.NumberFormat(tag, {
    minimumIntegerDigits: 2,
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
    useGrouping: false,
  }).format(seconds - minutes * 60);
  return `${new Intl.NumberFormat(tag).format(minutes)}:${rest}`;
}

/** Whole numbers in full up to 9,999, compact above ("12K", "1,2 Mio.", "1.2万"). */
export function formatCount(n: number, locale: Locale): string {
  const tag = htmlLang(locale);
  const value = Math.max(0, Math.round(n));
  return value < 10_000
    ? new Intl.NumberFormat(tag).format(value)
    : new Intl.NumberFormat(tag, { notation: "compact", maximumFractionDigits: 1 }).format(value);
}
