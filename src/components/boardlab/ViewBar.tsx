"use client";

import type { FigureHandle } from "@/components/figure/protocol";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import type { BoardLabStore, BoardView } from "@/lib/boardlab/store";
import type { BoardModel } from "./model";
import { useText } from "./text";
import { useLab } from "./useLab";

export const VIEWS: BoardView[] = ["board", "breadboard", "schematic", "power"];

/** The camera yaw the figure started at, from its `ready` message. */
export function homeYaw(figure: FigureHandle | null): number {
  const info = figure?.info() as { view?: { yaw?: number } } | null | undefined;
  return typeof info?.view?.yaw === "number" ? info.view.yaw : 45;
}

type Props = {
  store: BoardLabStore;
  board: BoardModel;
  figure: () => FigureHandle | null;
  /** Views this lesson can show (a lesson without a circuit has no breadboard). */
  views: BoardView[];
  xr: boolean;
  onXr: (on: boolean) => void;
  yaw: number;
  onYaw: (yaw: number) => void;
};

/** View tabs, exploded and see-through switches, quarter turns, the power plug and the live status. */
export function ViewBar({ store, board, figure, views, xr, onXr, yaw, onYaw }: Props) {
  const { t } = useText();
  const view = useLab(store, (s) => s.view);
  const exploded = useLab(store, (s) => s.exploded);
  const power = useLab(store, (s) => s.power);
  const status = useLab(store, (s) => s.figure.status);

  const turn = (deg: number) => {
    const next = yaw + deg;
    onYaw(next);
    figure()?.send("view", { yaw: next, ms: 600 });
  };
  const resetView = () => {
    const home = homeYaw(figure());
    onYaw(home);
    figure()?.send("view", { yaw: home, ms: 900 });
  };
  const statusText = typeof status === "string" && ["off", "no-power", "powered", "running", "uploading", "brownout", "fault"].includes(status) ? t(`view.status.${status}` as Parameters<typeof t>[0]) : null;
  const statusTone = status === "running" ? "bg-good-bg text-good" : status === "fault" || status === "brownout" ? "bg-bad-bg text-bad" : "bg-sunken text-muted";

  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="viewbar">
      <SegmentedControl
        label={t("view.label")}
        size="sm"
        value={view}
        onChange={(v) => store.dispatch({ type: "view/set", view: v })}
        options={views.map((v) => ({ value: v, label: t(`view.${v}`) }))}
      />
      <Button size="sm" variant={exploded ? "ink" : "secondary"} aria-pressed={exploded} onClick={() => store.dispatch({ type: "exploded/set", on: !exploded })}>
        {t("view.exploded")}
      </Button>
      <Button
        size="sm"
        variant={xr ? "ink" : "secondary"}
        aria-pressed={xr}
        onClick={() => {
          onXr(!xr);
          figure()?.send("xr", { on: !xr });
        }}
      >
        {t("view.seeThrough")}
      </Button>
      <span className="flex items-center gap-1">
        <Button size="sm" variant="ghost" onClick={() => turn(-90)} title={t("view.turnLeft")}>
          <span aria-hidden="true">↺</span>
          <span className="sr-only">{t("view.turnLeft")}</span>
        </Button>
        <Button size="sm" variant="ghost" onClick={resetView} title={t("view.resetView")}>
          <span aria-hidden="true">⌖</span>
          <span className="sr-only">{t("view.resetView")}</span>
        </Button>
        <Button size="sm" variant="ghost" onClick={() => turn(90)} title={t("view.turnRight")}>
          <span aria-hidden="true">↻</span>
          <span className="sr-only">{t("view.turnRight")}</span>
        </Button>
      </span>
      {board.power.length > 0 && (
        <label className="flex min-w-0 max-w-full items-center gap-2 text-sm">
          <span className="shrink-0">{t("view.supply.label")}</span>
          {/* Longer translations ("Alimentación", "Cable USB-B (5,5 V)") must not widen a phone page. */}
          <select
            className="ink-field h-11 min-w-0 py-0 text-sm"
            value={power ?? ""}
            onChange={(e) => store.dispatch({ type: "power/set", source: e.target.value || null })}
          >
            <option value="">{t("view.supply.unplugged")}</option>
            {board.power.map((p) => (
              <option key={p.id} value={p.id}>
                {t(`connector.${p.connector}` as Parameters<typeof t>[0], { volts: p.volts })}
              </option>
            ))}
          </select>
        </label>
      )}
      {statusText && (
        <span role="status" aria-label={t("view.statusLabel")} className={cx("ms-auto rounded-full px-3 py-1 text-sm font-semibold", statusTone)} data-testid="board-status">
          {statusText}
        </span>
      )}
    </div>
  );
}
