"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Meter } from "@/components/ui/Meter";
import { useCommonT, useLocale } from "@/i18n/client";
import { htmlLang } from "@/i18n/config";
import { useKeys } from "@/lib/keys";
import { fetchUsage, type UsageResult } from "@/lib/keys/usage";

type Kind = "ai" | "search";
type Read = { id: string; result: UsageResult | null };

const SLOW_MS = 300;

/** What the server counted for the saved key of this kind, read again whenever the key changes. */
export function UsageMeter({ kind }: { kind: Kind }) {
  const t = useCommonT();
  const locale = useLocale();
  const keys = useKeys();
  const keyTail = keys[kind].set ? keys[kind].tail : null;
  const tokenTail = keys.server.set ? keys.server.tail : null;
  const [attempt, setAttempt] = useState(0);
  const id = `${kind}:${keyTail}:${tokenTail}:${attempt}`;
  const [read, setRead] = useState<Read | null>(null);
  const [slowId, setSlowId] = useState("");
  const number = useMemo(() => new Intl.NumberFormat(htmlLang(locale)), [locale]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => setSlowId(id), SLOW_MS);
    fetchUsage(kind, controller.signal).then((result) => {
      clearTimeout(timer);
      if (!controller.signal.aborted) setRead({ id, result });
    });
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [id, kind]);

  const state = read?.id === id ? read.result : null;
  if (!state) return slowId === id ? <div aria-hidden="true" className="h-8 animate-pulse rounded-lg bg-sunken" /> : null;

  if (!state.ok) {
    if (state.code === "failed") {
      return (
        <div className="flex items-center justify-between gap-3 text-sm">
          <p role="status" className="text-bad">
            {t("meter.failed")}
          </p>
          <Button size="sm" variant="secondary" onClick={() => setAttempt((n) => n + 1)}>
            {t("meter.retry")}
          </Button>
        </div>
      );
    }
    return (
      <p className="text-sm text-muted">
        {t("meter.unavailable")}. {t(state.code === "off" ? "meter.off" : "meter.noKey")}
      </p>
    );
  }

  const { data } = state;
  if (data.cap === 0) return <p className="text-sm text-muted">{t(kind === "ai" ? "meter.aiOff" : "meter.searchOff")}</p>;

  if (data.kind === "ai") {
    const used = number.format(data.today.tokens);
    const cap = number.format(data.cap);
    return (
      <div className="flex flex-col gap-2">
        <Meter
          label={t("meter.tokensToday")}
          value={data.today.tokens}
          max={data.cap}
          valueText={t("meter.ofCap", { used, cap })}
          warn={data.cap * 0.8}
          danger={data.cap}
        />
        <p className="text-sm text-muted tabular-nums">{t("meter.aiLine", { month: number.format(data.monthTotal.tokens) })}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Meter
        label={t("meter.searchesMonth")}
        value={data.monthTotal}
        max={data.cap}
        valueText={t("meter.ofCap", { used: number.format(data.monthTotal), cap: number.format(data.cap) })}
        warn={data.cap * 0.8}
        danger={data.cap}
      />
      <p className="text-sm text-muted tabular-nums">{t("meter.searchLine", { today: number.format(data.today) })}</p>
    </div>
  );
}
