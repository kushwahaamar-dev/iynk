"use client";

import type { DroneContent, DroneWire } from "@/content/schema";
import { Button } from "@/components/ui/Button";
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
    <button
      type="button"
      aria-pressed={sel === id}
      aria-label={t("wiring.selectEnd", { short: short(id) })}
      onClick={() => dispatch({ type: "select", id })}
      className="-my-2 inline-flex min-h-11 items-center whitespace-nowrap rounded-ink-sm px-1.5 font-ui text-sm font-semibold underline decoration-rule decoration-2 underline-offset-4 hover:bg-sunken hover:decoration-ink aria-pressed:bg-ink aria-pressed:text-paper aria-pressed:no-underline"
    >
      {short(id)}
    </button>
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
            <li key={kind} className="flex items-center gap-1.5 text-xs text-muted">
              <svg width="26" height="6" aria-hidden="true">
                <line
                  x1="1"
                  y1="3"
                  x2="25"
                  y2="3"
                  stroke={KIND_COLOR[kind]}
                  strokeWidth="3"
                  strokeDasharray={DASHED.has(kind) ? "6 4" : undefined}
                />
              </svg>
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
                className="me-1.5 inline-block h-1 w-5 shrink-0 rounded"
                style={{ background: KIND_COLOR[wire.kind] }}
                title={t(`wiring.kinds.${wire.kind}`)}
              />
              <span className="sr-only">{t(`wiring.kinds.${wire.kind}`)}:</span>
              {end(wire.from)}
              <span aria-hidden="true" className="text-muted">
                →
              </span>
              {end(wire.to)}
              <span className="ms-auto ps-2 font-ui text-xs font-semibold text-muted">{wire.label}</span>
            </div>
            <p className="mt-1 text-sm text-muted">{ct(wire.note)}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
