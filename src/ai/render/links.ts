const URL_IN_TEXT = /https:\/\/[^\s<>"'`)\]]+/g;
const TRAILING_PUNCTUATION = /[.,;:!?]+$/;
const LABEL_LIMIT = 48;

/** The address in its canonical form, or null when it is not https or carries credentials. */
function canonical(raw: string): URL | null {
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && !url.username && !url.password ? url : null;
  } catch {
    return null;
  }
}

/** The https addresses a thread has seen from tools and the registry: the only ones the partner's answer may link to. */
export function createSeenUrls() {
  const seen = new Set<string>();
  return {
    add(text: string) {
      for (const match of text.matchAll(URL_IN_TEXT)) {
        const url = canonical(match[0].replace(TRAILING_PUNCTUATION, ""));
        if (url) seen.add(url.href);
      }
    },
    has(url: string): boolean {
      const parsed = canonical(url);
      return parsed !== null && seen.has(parsed.href);
    },
    list(): string[] {
      return [...seen];
    },
  };
}

export type SeenUrls = ReturnType<typeof createSeenUrls>;

/** What the confirm step shows: a short label, the domain as the browser will resolve it, and the whole address. */
export function displayLink(url: string): { label: string; domain: string; full: string } {
  const parsed = canonical(url);
  if (!parsed) return { label: url, domain: "", full: url };
  const path = parsed.pathname === "/" ? "" : parsed.pathname;
  const label = `${parsed.hostname}${path}`;
  return {
    label: label.length > LABEL_LIMIT ? `${label.slice(0, LABEL_LIMIT - 1)}…` : label,
    domain: parsed.hostname,
    full: parsed.href,
  };
}
