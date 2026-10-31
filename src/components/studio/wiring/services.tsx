"use client";

import { createContext, useContext, useMemo, useSyncExternalStore, type ReactElement, type ReactNode } from "react";
import { openFile, saveToFile } from "@/local/files";
import { createProjectHost, type ProjectHost } from "@/local/project-host";
import { createSimHost, type SimHost } from "@/sim-host/host";

export type FilesLike = {
  exportProject: ProjectHost["files"]["exportProject"];
  importBytes: ProjectHost["files"]["importBytes"];
  markFileCopy: ProjectHost["files"]["markFileCopy"];
  saveToFile: typeof saveToFile;
  openFile: typeof openFile;
};

export type Services = {
  host: ProjectHost;
  library: ProjectHost["library"];
  files: FilesLike;
  sim: SimHost;
};

export function createServices({ host = createProjectHost(), sim = createSimHost() }: { host?: ProjectHost; sim?: SimHost } = {}): Services {
  const { exportProject, importBytes, markFileCopy } = host.files;
  return { host, library: host.library, files: { exportProject, importBytes, markFileCopy, saveToFile, openFile }, sim };
}

export async function disposeServices({ host, sim }: Services): Promise<void> {
  await Promise.allSettled([host.kill(), sim.kill()]);
}

const ServicesContext = createContext<Services | null>(null);

export function ServicesProvider({ factory = createServices, children }: { factory?: () => Services; children: ReactNode }): ReactElement | null {
  const store = useMemo(() => {
    const slot: { current: Services | null } = { current: null };
    return {
      subscribe(notify: () => void) {
        const made = factory();
        slot.current = made;
        notify();
        return () => {
          slot.current = null;
          void disposeServices(made);
        };
      },
      snapshot: () => slot.current,
    };
  }, [factory]);
  const services = useSyncExternalStore(store.subscribe, store.snapshot, () => null);

  return services ? <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider> : null;
}

export function useServices(): Services {
  const services = useContext(ServicesContext);
  if (!services) throw new Error("useServices needs a ServicesProvider above it");
  return services;
}
