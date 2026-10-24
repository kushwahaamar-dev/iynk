"use client";

import { useCallback, useEffect, useState } from "react";
import { reloadFeatures, useFeatures } from "@/lib/features";

type FeedStatus = "loading" | "ready" | "error" | "off";

type Feed<T> = { status: FeedStatus; data: T | null; refresh: () => void };

type Loaded<T> = { url: string; status: Exclude<FeedStatus, "loading">; data: T | null };

/**
 * GETs one of the hx:data routes once the db feature is known to be on, again on
 * refresh(), when the tab becomes visible, and every `pollMs` while it is. A 503
 * means "not set up on this deployment". A failed refresh keeps the last good data.
 */
export function useFeed<T>(url: string, { pollMs }: { pollMs?: number } = {}): Feed<T> {
  const { status: featureStatus, features } = useFeatures();
  const enabled = featureStatus === "ready" && features.db;
  const [loaded, setLoaded] = useState<Loaded<T> | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => {
    if (featureStatus === "error") reloadFeatures();
    else setTick((n) => n + 1);
  }, [featureStatus]);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    fetch(url, { signal: controller.signal, headers: { accept: "application/json" } })
      .then(async (res) => {
        if (res.status === 503) return setLoaded({ url, status: "off", data: null });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setLoaded({ url, status: "ready", data: (await res.json()) as T });
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setLoaded((prev) => ({ url, status: "error", data: prev?.url === url ? prev.data : null }));
      });
    return () => controller.abort();
  }, [url, enabled, tick]);

  useEffect(() => {
    if (!enabled) return;
    const again = () => {
      if (document.visibilityState === "visible") setTick((n) => n + 1);
    };
    document.addEventListener("visibilitychange", again);
    const timer = pollMs ? setInterval(again, pollMs) : undefined;
    return () => {
      document.removeEventListener("visibilitychange", again);
      if (timer) clearInterval(timer);
    };
  }, [enabled, pollMs]);

  if (featureStatus === "loading") return { status: "loading", data: null, refresh };
  if (featureStatus === "error") return { status: "error", data: null, refresh };
  if (!features.db) return { status: "off", data: null, refresh };
  if (!loaded || loaded.url !== url) return { status: "loading", data: null, refresh };
  if (loaded.status === "error" && loaded.data) return { status: "ready", data: loaded.data, refresh };
  return { status: loaded.status, data: loaded.data, refresh };
}
