"use client";

import { Toggle } from "@/components/ui/Toggle";
import { useCommonT } from "@/i18n/client";
import { setSetting } from "@/lib/settings/settings";
import { useSettings } from "@/lib/settings/hooks";

/** What the labs count and the switch to stop it (BUILD-PLAN §3.2 item 9: anonymous, opt-out). It lives in Settings. */
export function UsageToggle({ className }: { className?: string }) {
  const t = useCommonT();
  const { telemetry } = useSettings();
  return (
    <div className={className} data-testid="usage-toggle">
      <Toggle label={t("usage.toggle")} description={t("usage.body")} checked={telemetry} onChange={(on) => setSetting("telemetry", on)} />
    </div>
  );
}
