import type { Locale } from "./config";

/**
 * The strings figures translate with CF_T, keyed by their English text
 * (src/i18n/figures/<lang>.json). FigureFrame loads them on the client, one
 * chunk per language, and sends them to the figure in the `locale` message.
 */
export async function loadFigureStrings(locale: Locale): Promise<Record<string, string>> {
  try {
    const mod = (await import(`./figures/${locale}.json`)) as { default: Record<string, string> };
    return mod.default;
  } catch (error) {
    throw new Error(`SimLab i18n: missing figure strings src/i18n/figures/${locale}.json.`, { cause: error });
  }
}
