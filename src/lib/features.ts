"use client";

import { useSyncExternalStore } from "react";
import { openDb } from "@/local/db";
import { idbProfileStore as idbAiProfileStore } from "@/local/ai-profiles";
import { fetchConfig, probeServer, type ConfigDoc } from "@/server-client/probe";
import { idbProfileStore, openServerDb, resolveServerUrl } from "@/server-client/profile";

export type Features = { ai: boolean; search: boolean; hw: boolean };

/**
 * What this browser and its server can do. `ai` is on when the person has saved a provider profile, `search` when
 * their server (the saved one, else the one in GET /config.json) offers the search proxy. The server render and the
 * first client render see "loading" with every feature off; the answer is fetched once per page load and shared by
 * every caller. "error" means the config could not be fetched, which is a different state from a feature that is
 * not set up (a static host has no config at all).
 */
export type FeatureState = { status: "loading" | "ready" | "error"; features: Features };

export const NO_FEATURES: Features = Object.freeze({
  ai: false,
  search: false,
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

async function hasProfile(): Promise<boolean> {
  try {
    return (await idbAiProfileStore(await openDb()).list()).length > 0;
  } catch {
    return false;
  }
}

async function hasSearchProxy(config: ConfigDoc | null): Promise<boolean> {
  try {
    const url = resolveServerUrl(config, await idbProfileStore(openServerDb).read());
    return url !== null && (await probeServer(url)).info?.features.searchProxy === true;
  } catch {
    return false;
  }
}

async function featuresOf(config: ConfigDoc | null): Promise<Features> {
  // Hardware stays off until a later phase.
  const [ai, search] = await Promise.all([hasProfile(), hasSearchProxy(config)]);
  return { ...NO_FEATURES, ai, search };
}

async function fetchFeatures(): Promise<void> {
  const result = await fetchConfig();
  publish(result.ok ? { status: "ready", features: await featuresOf(result.config) } : { status: "error", features: NO_FEATURES });
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
