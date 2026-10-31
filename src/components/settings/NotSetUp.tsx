"use client";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useCommonT } from "@/i18n/client";
import { OPEN_KEYS_EVENT } from "./KeysDialog";

export type NotSetUpReason = "server_off" | "needs_key";

/** The one "not set up" box: what is missing and the single step that fixes it. `what` is a plain noun like "Prices". */
export function NotSetUp({ what, reason, fix = "ai", className }: { what: string; reason: NotSetUpReason; fix?: "ai" | "search"; className?: string }) {
  const t = useCommonT();
  const needsKey = reason === "needs_key";
  return (
    <div data-testid="not-set-up" data-reason={reason} className={className}>
      <EmptyState
        icon="info"
        title={t(needsKey ? "notSetUp.needsKey" : "notSetUp.serverOff", { what })}
        className="rounded-lg bg-sunken p-4!"
        action={
          needsKey ? (
            <Button size="sm" onClick={() => window.dispatchEvent(new CustomEvent(OPEN_KEYS_EVENT))}>
              {t("notSetUp.openKeys")}
            </Button>
          ) : null
        }
      >
        {t(needsKey ? `notSetUp.fix.${fix}` : "notSetUp.fix.server")}
      </EmptyState>
    </div>
  );
}
