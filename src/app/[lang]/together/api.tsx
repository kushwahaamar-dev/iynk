"use client";

import type { ReactNode } from "react";
import type { TogetherT } from "@/components/realtime/messages";
import { Button, Callout } from "@/components/ui";
import type { FeatureState, Features } from "@/lib/features";

/** A same-origin room link as a path the router can push. */
export function roomPath(link: string): string {
  const url = new URL(link);
  return `${url.pathname}${url.search}`;
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; code: string };

/** POST JSON to one of our routes; errors come back as their H2 code, never thrown. */
export async function postJson<T = unknown>(url: string, body: unknown): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => null)) as (T & { error?: { code?: string } }) | null;
    if (!res.ok || data === null) return { ok: false, code: data?.error?.code ?? `http_${res.status}` };
    return { ok: true, data };
  } catch {
    return { ok: false, code: "network" };
  }
}

/** Loading, unreachable and "not set up on this deployment" states around a feature's UI. */
export function FeatureGate({
  t,
  state,
  needs,
  notSetUp,
  onRetry,
  children,
}: {
  t: TogetherT;
  state: FeatureState;
  needs: (keyof Features)[];
  notSetUp: string;
  onRetry: () => void;
  children: ReactNode;
}) {
  if (state.status === "loading") return <div aria-busy="true" className="h-32 animate-pulse rounded-ink bg-sunken motion-reduce:animate-none" />;
  if (state.status === "error") {
    return (
      <Callout tone="warn" live>
        <span className="flex flex-wrap items-center gap-2">
          {t("lobby.buddies.failed")}
          <Button size="sm" onClick={onRetry}>
            {t("lobby.retry")}
          </Button>
        </span>
      </Callout>
    );
  }
  if (!needs.every((feature) => state.features[feature])) {
    return (
      <Callout variant="quiet" title={t("lobby.notSetUp")}>
        <span className="mt-0.5 block">{notSetUp}</span>
      </Callout>
    );
  }
  return children;
}
