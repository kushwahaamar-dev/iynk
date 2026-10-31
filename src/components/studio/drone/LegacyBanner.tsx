import { Button, Callout } from "@/components/ui";
import type { DroneBuildT } from "./PartPicker";

/** Shown for a craft that still runs on the original calculator. Confirming moves the whole craft to the parts calculator. */
export function LegacyBanner({ onConfirm, t }: { onConfirm(): void; t: DroneBuildT }) {
  return (
    <Callout tone="warn" title={t("legacy.title")}>
      <div className="flex flex-col items-start gap-3">
        <p className="text-pretty">{t("legacy.body")}</p>
        <Button variant="primary" onClick={onConfirm}>
          {t("legacy.confirm")}
        </Button>
      </div>
    </Callout>
  );
}
