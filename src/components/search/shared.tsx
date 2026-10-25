"use client";

import { useMemo, type ReactNode } from "react";
import { Button, Callout, cx } from "@/components/ui";
import { htmlLang, type Locale } from "@/i18n/config";
import { reloadFeatures, useFeatures } from "@/lib/features";
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

export type SearchAvailability = "loading" | "ready" | "off" | "error";

/** Whether live search works on this deployment (GET /api/status). */
export function useSearchAvailability(): SearchAvailability {
  const { status, features } = useFeatures();
  if (status === "loading") return "loading";
  if (status === "error") return "error";
  return features.search ? "ready" : "off";
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
