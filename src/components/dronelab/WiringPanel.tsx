"use client";

import type { DroneContent, DroneWire } from "@/content/schema";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/icons";
import type { DroneLabAction } from "@/lib/dronelab/store";
import type { ContentT, DroneLabT } from "./text";

// Same colours as the figure's wiring sheet (docs/FIGURES-DRONE.md §9).
const KIND_COLOR: Record<DroneWire["kind"], string> = {
  power: "#e2483d",
  ground: "var(--ink)",
  phase: "#f08a2b",
  signal: "#43a35a",
  video: "#f2c230",
  rf: "#5a82c6",
};
const DASHED = new Set<DroneWire["kind"]>(["signal", "rf"]);

type Props = {
  content: DroneContent;
  sheet: "wiring" | null;
  sel: string | null;
  ready: boolean;
  t: DroneLabT;
  ct: ContentT;
  dispatch(action: DroneLabAction): void;
};

export function WiringPanel({ content, sheet, sel, ready, t, ct, dispatch }: Props) {
  const short = (id: string) => content.parts.find((p) => p.id === id)?.short ?? id;
  // an end of a wire: a text button that selects the part on the figure (both ends light up)
  const end = (id: string) => (
    <Button
      variant="ghost"
      size="sm"
      aria-pressed={sel === id}
      aria-label={t("wiring.selectEnd", { short: short(id) })}
      onClick={() => dispatch({ type: "select", id })}
      className="whitespace-nowrap px-2 py-1 font-ui tabular underline decoration-rule underline-offset-4 aria-pressed:no-underline"
    >
      {short(id)}
    </Button>
  );

  return (
    <div className="space-y-4">
      <h2 className="sr-only">{t("wiring.title")}</h2>
      <p className="text-sm text-muted">{t("wiring.lede")}</p>
      <Button
        variant={sheet === "wiring" ? "ink" : "primary"}
        aria-pressed={sheet === "wiring"}
        disabled={!ready}
        onClick={() => dispatch({ type: "sheet", sheet: sheet === "wiring" ? null : "wiring" })}
        data-testid="wiring-toggle"
      >
        {sheet === "wiring" ? t("wiring.hide") : t("wiring.show")}
      </Button>

      <ul className="flex flex-wrap gap-3" aria-label={t("wiring.kind")}>
        {(Object.keys(KIND_COLOR) as DroneWire["kind"][])
          .filter((kind) => content.wiring.some((w) => w.kind === kind))
          .map((kind) => (
            <li key={kind} className="flex items-center gap-2 text-xs text-muted">
              <span
                aria-hidden="true"
                className="w-6 shrink-0"
                style={{ borderTop: `3px ${DASHED.has(kind) ? "dashed" : "solid"} ${KIND_COLOR[kind]}` }}
              />
              {t(`wiring.kinds.${kind}`)}
            </li>
          ))}
      </ul>

      <ul className="divide-y divide-rule" aria-label={t("wiring.title")}>
        {content.wiring.map((wire) => (
          <li key={`${wire.from}-${wire.to}`} className="py-3">
            <div className="flex flex-wrap items-center gap-x-1 gap-y-1">
              <span
                aria-hidden="true"
                className="me-2 inline-block h-1 w-6 shrink-0 rounded-sm"
                style={{ background: KIND_COLOR[wire.kind] }}
                title={t(`wiring.kinds.${wire.kind}`)}
              />
              <span className="sr-only">{t(`wiring.kinds.${wire.kind}`)}:</span>
              {end(wire.from)}
              <Icon name="arrow-right" size={16} className="shrink-0 text-muted" />
              {end(wire.to)}
              <span className="ms-auto ps-2 font-ui tabular text-xs font-semibold text-muted">{wire.label}</span>
            </div>
            <p className="mt-1 text-sm text-muted">{ct(wire.note)}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
