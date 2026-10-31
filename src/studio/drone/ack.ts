const KEY = "iynk:drone:firstflight:v1";

/** The ISO date the first-flight panel was acknowledged, or null. Unavailable storage reads as not acknowledged. */
export function readAck(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function writeAck(iso: string): void {
  try {
    window.localStorage.setItem(KEY, iso);
  } catch {
    // Storage is blocked or full; the panel simply asks again next time.
  }
}
