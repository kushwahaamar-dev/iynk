// Browser telemetry is off in B0: events go nowhere. These functions keep their
// names and signatures so every caller still compiles; B1 (F-016) adds the local
// log and the opt-in write behind the same track() call sites.

import type { KnownPayloads, TelemetryData, TelemetryKind } from "./kinds";

type Context = { room?: string; item?: string };
type TallyKind = { [K in keyof KnownPayloads]: KnownPayloads[K] extends { count: number } ? K : never }[keyof KnownPayloads];
type DataFor<K extends TelemetryKind> = K extends keyof KnownPayloads ? KnownPayloads[K] & TelemetryData : TelemetryData;

export function telemetrySession(): string {
  return "";
}

export function setTelemetryContext(next: Context): void {
  void next;
}

export function track<K extends TelemetryKind>(kind: K, data?: DataFor<K>): void {
  void kind;
  void data;
}

export function tally(kind: TallyKind, n = 1): void {
  void kind;
  void n;
}

export function onFlushed(listener: (kinds: ReadonlySet<TelemetryKind>) => void): () => void {
  void listener;
  return () => {};
}

export function flush(): Promise<void> {
  return Promise.resolve();
}
