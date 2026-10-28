"use client";

import { useMemo, type ReactNode } from "react";
import { NotSetUp } from "@/components/settings/NotSetUp";
import { Button, Callout, cx } from "@/components/ui";
import { htmlLang, type Locale } from "@/i18n/config";
import { reloadFeatures, useFeatures } from "@/lib/features";
import { useKeys } from "@/lib/keys";
import type { FailCode } from "@/lib/search/client";
import type { SearchT } from "@/lib/search/messages";

/** Number and money formatting in the page's language. Prices are US store prices, so USD. */
export function useFormat(locale: Locale) {
  return useMemo(() => {
    const tag = htmlLang(locale);
    const money = new Intl.NumberFormat(tag, { style: "currency", currency: "USD" });
    const whole = new Intl.NumberFormat(tag, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
    const one = new Intl.NumberFormat(tag, { maximumFractionDigits: 1, minimumFractionDigits: 1 });
    const int = new Intl.NumberFormat(tag, { maximumFractionDigits: 0 });
    const time = new Intl.DateTimeFormat(tag, { hour: "numeric", minute: "2-digit" });
    return {
      money: (v: number, currency = "USD") =>
        currency === "USD" ? money.format(v) : new Intl.NumberFormat(tag, { style: "currency", currency }).format(v),
      whole: (v: number) => whole.format(v),
      one: (v: number) => one.format(v),
      int: (v: number) => int.format(v),
      time: (iso: string) => time.format(new Date(iso)),
    };
  }, [locale]);
}

export type Format = ReturnType<typeof useFormat>;

/** The panel's heading block. */
export function PanelHead({ id, title, lede, children }: { id: string; title: string; lede: string; children?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-2">
      <div className="min-w-0">
        <h2 id={id} className="font-head text-lg leading-tight">
          {title}
        </h2>
        <p className="mt-1 text-sm text-muted">{lede}</p>
      </div>
      {children}
    </header>
  );
}

/** Shown while a language's strings load: no text yet, so only the shape of a panel. */
export function PanelSkeleton({ className }: { className?: string }) {
  return (
    <div aria-busy="true" className={cx("space-y-3 p-1", className)}>
      <div className="h-5 w-1/2 animate-pulse rounded-ink bg-sunken motion-reduce:animate-none" />
      <div className="h-4 w-3/4 animate-pulse rounded-ink bg-sunken motion-reduce:animate-none" />
      <div className="h-24 animate-pulse rounded-ink bg-sunken motion-reduce:animate-none" />
    </div>
  );
}

export type SearchAvailability = "loading" | "ready" | "needs_key" | "off" | "error";

/** Whether live search can run here: the server has it on (/config.json) and this browser holds a search key. */
export function useSearchAvailability(): SearchAvailability {
  const { status, features } = useFeatures();
  const keys = useKeys();
  if (status === "loading") return "loading";
  if (status === "error") return "error";
  if (!features.search) return "off";
  return keys.search.set ? "ready" : "needs_key";
}

/** The "not set up" box for a panel that can't search: the server has it off, or this browser has no key. */
export function SearchNotSetUp({ availability, what }: { availability: "off" | "needs_key"; what: string }) {
  return <NotSetUp what={what} reason={availability === "off" ? "server_off" : "needs_key"} fix="search" />;
}

/** A failed search: the server's switch-off becomes the "not set up" box, everything else a warning in words that fit the cause. */
export function SearchFailure({ code, t, what, generic, children }: { code: FailCode; t: SearchT; what: string; generic: string; children?: ReactNode }) {
  if (code === "not_configured") return <NotSetUp what={what} reason="server_off" fix="search" />;
  const text = code === "rate_limited" ? t("real.rateLimited") : code === "quota_exhausted" ? t("real.quotaExhausted") : code === "no_key" ? t("real.noKey") : generic;
  return (
    <Callout tone="warn" title={children ? text : undefined}>
      {children ?? text}
    </Callout>
  );
}

/** The "server unreachable" note with a retry. */
export function StatusError({ t }: { t: SearchT }) {
  return (
    <Callout tone="warn" title={t("real.statusError")}>
      <Button size="sm" onClick={reloadFeatures}>
        {t("real.retry")}
      </Button>
    </Callout>
  );
}

/** Host name for a link label: "www.amazon.com" -> "amazon.com". */
export function siteOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Shared props for links that leave iynk. */
export const external = { target: "_blank", rel: "noopener noreferrer" } as const;
