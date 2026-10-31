import { useSyncExternalStore } from "react";
import type { SimHost } from "@/sim-host/host";
import type { ProbeSpec, Reading, TraceChunk } from "@/sim/probe/tap";

interface Latest {
  reading: Reading | null;
  chunk: TraceChunk | null;
}

export function createProbeClient(host: Pick<SimHost, "probes">) {
  const latest = new Map<string, Latest>();
  const listeners = new Map<string, Set<() => void>>();
  const stops = new Map<string, () => void>();

  const notify = (id: string) => listeners.get(id)?.forEach((fn) => fn());

  const subscribeTo = (id: string) => (fn: () => void) => {
    const set = listeners.get(id) ?? new Set();
    listeners.set(id, set.add(fn));
    return () => void set.delete(fn);
  };

  const update = (id: string, next: Partial<Latest>) => {
    latest.set(id, { reading: null, chunk: null, ...latest.get(id), ...next });
    notify(id);
  };

  return {
    async add(spec: ProbeSpec): Promise<void> {
      await host.probes.add(spec);
      const offReading = host.probes.watch(spec.id, (reading) => update(spec.id, { reading }));
      const offChunks = host.probes.subscribe(spec.id, 0, (chunk) => update(spec.id, { chunk }));
      stops.set(spec.id, () => {
        offReading();
        offChunks();
      });
    },
    remove(id: string): void {
      stops.get(id)?.();
      stops.delete(id);
      latest.delete(id);
      host.probes.remove(id);
      notify(id);
    },
    useReading(id: string): Reading | null {
      return useSyncExternalStore(subscribeTo(id), () => latest.get(id)?.reading ?? null, () => null);
    },
    useChunks(id: string): TraceChunk | null {
      return useSyncExternalStore(subscribeTo(id), () => latest.get(id)?.chunk ?? null, () => null);
    },
  };
}
