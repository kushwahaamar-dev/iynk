"use client";

import { useId } from "react";
import { useCommonT } from "@/i18n/client";
import { setSetting } from "@/lib/settings/settings";
import { useSettings } from "@/lib/settings/hooks";

/** What the labs count and the switch to stop it (BUILD-PLAN §3.2 item 9: anonymous, opt-out). */
export function UsageToggle() {
  const t = useCommonT();
  const id = useId();
  const { telemetry } = useSettings();
  return (
    <section aria-labelledby={`${id}-title`} className="flex flex-col gap-1 text-sm text-muted" data-testid="usage-toggle">
      <h2 id={`${id}-title`} className="font-ui text-xs font-bold uppercase tracking-wide">
        {t("usage.label")}
      </h2>
      <p className="max-w-3xl">{t("usage.body")}</p>
      <label className="inline-flex min-h-11 items-center gap-2 self-start font-bold text-ink">
        <input type="checkbox" className="size-4 accent-current" checked={telemetry} onChange={(event) => setSetting("telemetry", event.target.checked)} />
        {t("usage.toggle")}
      </label>
    </section>
  );
}
