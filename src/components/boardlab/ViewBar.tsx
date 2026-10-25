"use client";

import type { FigureHandle } from "@/components/figure/protocol";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
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

// The figure's own buttons the host draws itself (the power select, the views, Break it).
const HOST_DRAWN = ["power", "view", "break"];
// A lesson's Run is the upload, and building the board is the board page's Assembly: these stay off a lesson's figure.
export const LESSON_HIDDEN = [...HOST_DRAWN, "upload", "strip", "pnp", "mat", "place", "solder", "remove"];

/** After every `ready`: hide the figure's copies of controls this page already has, so each shows once. */
export function hideHostDrawn(figure: FigureHandle | null, buttons: { id: string }[] | undefined, ids: readonly string[] = HOST_DRAWN): void {
  const hide = (buttons ?? []).map((b) => b.id).filter((id) => ids.includes(id));
  if (figure && hide.length) figure.sendCustom("chrome", { hide });
}

type Props = {
  store: BoardLabStore;
  board: BoardModel;
  figure: () => FigureHandle | null;
  /** Views this page can show (a lesson without a circuit has no breadboard). */
  views: BoardView[];
  /** The variants this page offers; a switch appears when there are two or more. */
  variants: BoardModel["variants"];
  xr: boolean;
  onXr: (on: boolean) => void;
  yaw: number;
  onYaw: (yaw: number) => void;
};

const fieldClass = "ink-field min-h-9 shrink-0 py-0 [@media(pointer:coarse)]:min-h-11";

/**
 * The stage toolbar, one row that scrolls sideways when it can't fit: views,
 * exploded and see-through, quarter turns, the variant and the power plug.
 * The board's state is drawn by the figure; here it is a live region only.
 */
export function ViewBar({ store, board, figure, views, variants, xr, onXr, yaw, onYaw }: Props) {
  const { t } = useText();
  const view = useLab(store, (s) => s.view);
  const exploded = useLab(store, (s) => s.exploded);
  const power = useLab(store, (s) => s.power);
  const variant = useLab(store, (s) => s.variant);
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

  return (
    <div
      className="-mx-1 flex shrink-0 flex-nowrap items-center gap-1.5 overflow-x-auto px-1 py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      data-testid="viewbar"
    >
      <SegmentedControl
        label={t("view.label")}
        size="sm"
        value={view}
        onChange={(v) => store.dispatch({ type: "view/set", view: v })}
        options={views.map((v) => ({ value: v, label: t(`view.${v}`) }))}
      />
      <Button
        size="sm"
        variant="secondary"
        className="shrink-0 whitespace-nowrap"
        aria-pressed={exploded}
        aria-keyshortcuts="X"
        onClick={() => store.dispatch({ type: "exploded/set", on: !exploded })}
      >
        {t("view.exploded")}
      </Button>
      <Button
        size="sm"
        variant="secondary"
        className="shrink-0 whitespace-nowrap"
        aria-pressed={xr}
        aria-keyshortcuts="T"
        onClick={() => {
          onXr(!xr);
          figure()?.send("xr", { on: !xr });
        }}
      >
        {t("view.seeThrough")}
      </Button>
      <span className="flex shrink-0 items-center rounded-full border-[1.5px] border-rule">
        <IconButton icon="rotate-left" size="sm" label={t("view.turnLeft")} onClick={() => turn(-90)} />
        <IconButton icon="reset" size="sm" label={t("view.resetView")} onClick={resetView} />
        <IconButton icon="rotate-right" size="sm" label={t("view.turnRight")} onClick={() => turn(90)} />
      </span>
      {variants.length > 1 && (
        <label className="shrink-0">
          <span className="sr-only">{t("board.variant")}</span>
          <select className={fieldClass} value={variant ?? variants[0].figureVariant} onChange={(e) => store.dispatch({ type: "variant/set", id: e.target.value })}>
            {variants.map((v) => (
              <option key={v.id} value={v.figureVariant}>
                {v.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {board.power.length > 0 && (
        <label className="shrink-0">
          {/* "USB-B cable (5.5 V)" or "Unplugged" says what it is; the name is for screen readers. */}
          <span className="sr-only">{t("view.supply.label")}</span>
          <select className={fieldClass} value={power ?? ""} onChange={(e) => store.dispatch({ type: "power/set", source: e.target.value || null })}>
            <option value="">{t("view.supply.unplugged")}</option>
            {board.power.map((p) => (
              <option key={p.id} value={p.id}>
                {t(`connector.${p.connector}` as Parameters<typeof t>[0], { volts: p.volts })}
              </option>
            ))}
          </select>
        </label>
      )}
      {/* The figure draws the status big; this keeps it readable for screen readers and tests. */}
      <span role="status" aria-label={t("view.statusLabel")} className="sr-only" data-testid="board-status">
        {statusText}
      </span>
    </div>
  );
}
