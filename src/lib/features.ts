"use client";

import { useSyncExternalStore } from "react";
import type { Features as ServerFeatures } from "@/lib/server/env";
import { fetchConfig, type ConfigDoc } from "@/server-client/probe";

export type Features = ServerFeatures & { hw: boolean };

/**
 * Which hackathon features this deployment has (GET /config.json).
 * The server render and the first client render see "loading" with every
 * feature off; the answer is fetched once per page load and shared by every
 * caller. "error" means the config could not be fetched, which is a different
 * state from a feature that is not set up (a static host has no config at all).
 */
export type FeatureState = { status: "loading" | "ready" | "error"; features: Features };

export const NO_FEATURES: Features = Object.freeze({
  ai: false,
  voice: false,
  search: false,
  realtime: false,
  gemini: false,
  hw: false,
});

const LOADING: FeatureState = Object.freeze({ status: "loading", features: NO_FEATURES });

let state: FeatureState = LOADING;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function publish(next: FeatureState) {
  state = next;
  for (const listener of listeners) listener();
}

function featuresOf(config: ConfigDoc | null): Features {
  // Realtime and hardware stay off until later phases; gemini has no reader.
  return { ...NO_FEATURES, ...config?.modules };
}

async function fetchFeatures(): Promise<void> {
  const result = await fetchConfig();
  publish(result.ok ? { status: "ready", features: featuresOf(result.config) } : { status: "error", features: NO_FEATURES });
}

/** One request at a time, and none once the answer is in. */
function load(): Promise<void> {
  if (state.status === "ready") return Promise.resolve();
  inflight ??= fetchFeatures().finally(() => {
    inflight = null;
  });
  return inflight;
}

/**
 * The same answer outside React (telemetry, plain modules), sharing useFeatures()'s
 * single request. Browser only. Every feature is off when the server can't be reached.
 */
export async function getFeatures(): Promise<Features> {
  await load();
  return state.features;
}

/** Asks again after an error, for a retry button. */
export function reloadFeatures(): void {
  if (state.status === "error") publish(LOADING);
  void load();
}

function onOnline() {
  if (state.status === "error") reloadFeatures();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener("online", onOnline);
  void load();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("online", onOnline);
  };
}

export function useFeatures(): FeatureState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => LOADING,
  );
}
