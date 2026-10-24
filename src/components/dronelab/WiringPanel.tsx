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
  const end = (id: string) => (
    <Button
      size="sm"
      variant="secondary"
      aria-pressed={sel === id}
      aria-label={t("wiring.selectEnd", { short: short(id) })}
      onClick={() => dispatch({ type: "select", id })}
    >
      {short(id)}
    </Button>
  );

  return (
    <div className="space-y-4">
      <h2 className="text-xl">{t("wiring.title")}</h2>
      <p className="text-muted">{t("wiring.lede")}</p>
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
            <li key={kind} className="flex items-center gap-1.5 font-ui text-xs">
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

      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-line font-ui text-xs uppercase tracking-wider">
              <th scope="col" className="py-1.5 text-start">
                {t("wiring.from")}
              </th>
              <th scope="col" className="py-1.5 text-start">
                {t("wiring.to")}
              </th>
              <th scope="col" className="py-1.5 text-start">
                {t("wiring.kind")}
              </th>
              <th scope="col" className="py-1.5 text-start">
                {t("wiring.label")}
              </th>
            </tr>
          </thead>
          <tbody>
            {content.wiring.map((wire) => (
              <tr key={`${wire.from}-${wire.to}`} className="border-b border-rule align-top">
                <td className="py-2 pe-2">{end(wire.from)}</td>
                <td className="py-2 pe-2">{end(wire.to)}</td>
                <td className="py-2 pe-2">
                  <span className="flex items-center gap-1.5 font-ui text-xs">
                    <span
                      aria-hidden="true"
                      className="inline-block h-1 w-5 rounded"
                      style={{ background: KIND_COLOR[wire.kind] }}
                    />
                    {t(`wiring.kinds.${wire.kind}`)}
                  </span>
                </td>
                <td className="py-2">
                  <span className="font-ui text-xs font-bold">{wire.label}</span>
                  <p className="mt-0.5 text-sm text-muted">{ct(wire.note)}</p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
