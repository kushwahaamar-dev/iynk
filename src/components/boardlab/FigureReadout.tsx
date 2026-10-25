"use client";

import { cx } from "@/components/ui/cx";
import type { BoardLabStore, BoardView } from "@/lib/boardlab/store";
import { useText } from "./text";
import { useLab } from "./useLab";

type Meas = Record<string, { kind?: string; i_mA?: number; state?: string }>;

// The bench's per-LED measurement states (FIGURES-BENCH §13).
const MEAS_STATES = ["ok", "off", "burnt", "reverse", "open"];

// The views that draw the board (its own LEDs) and the circuit on the breadboard; the power tree draws neither.
const DRAWS_BOARD: BoardView[] = ["board", "breadboard"];
const DRAWS_CIRCUIT: BoardView[] = ["breadboard", "schematic"];

/**
 * What the figure shows, as text: on-board LEDs on or off, and each circuit
 * LED's current and state (lit, dark, burnt, backwards), for the parts the
 * current view draws. Colour in the figure is never the only way to read it.
 */
export function FigureReadout({ store, leds }: { store: BoardLabStore; leds: { id: string; label: string }[] }) {
  const { t } = useText();
  const view = useLab(store, (s) => s.view);
  const reported = useLab(store, (s) => s.figure.leds) as Record<string, number> | undefined;
  const circuit = useLab(store, (s) => s.figure.circuit);
  const meas = useLab(store, (s) => s.figure.meas) as Meas | undefined;
  const ledItems = DRAWS_BOARD.includes(view) ? leds.filter((l) => reported && l.id in reported) : [];
  // The circuit solver measures every part (motors, transistors, diodes...); the LED lines are the ones this reads.
  // Its last measurement outlives the circuit, so a figure without one (the board page) lists none.
  const measItems = circuit && DRAWS_CIRCUIT.includes(view) ? Object.entries(meas ?? {}).filter(([, m]) => !m.kind || m.kind === "led") : [];
  if (ledItems.length === 0 && measItems.length === 0) return null;
  return (
    <ul aria-label={t("readout.label")} className="flex shrink-0 gap-1.5 font-ui text-xs" data-testid="figure-readout">
      {ledItems.map((l) => {
        const on = Number(reported![l.id]) > 0;
        return (
          <li key={l.id} className={cx("whitespace-nowrap rounded-full border-[1.5px] px-2.5 py-1", on ? "border-mustard-m bg-mustard/25" : "border-rule")} data-led={l.id} data-on={on ? 1 : 0}>
            {t(on ? "readout.ledOn" : "readout.ledOff", { led: l.label })}
          </li>
        );
      })}
      {measItems.map(([part, m]) => {
        const state = m.state && MEAS_STATES.includes(m.state) ? m.state : "off";
        return (
          <li key={part} className={cx("whitespace-nowrap rounded-full border-[1.5px] px-2.5 py-1", state === "burnt" ? "on-fill border-bad bg-bad-bg" : state === "ok" ? "border-good" : "border-rule")} data-part={part} data-state={state}>
            {t(`readout.part.${state}` as Parameters<typeof t>[0], { part, ma: Math.round((m.i_mA ?? 0) * 10) / 10 })}
          </li>
        );
      })}
    </ul>
  );
}
