"use client";

import { useId, type KeyboardEvent } from "react";
import { cx } from "@/components/ui/cx";
import { Toggle } from "@/components/ui/Toggle";
import type { WorldInput } from "@/content/schema";
import type { BoardLabStore } from "@/lib/boardlab/store";
import { useText } from "./text";
import { useLab } from "./useLab";

function HoldButton({ input, store }: { input: WorldInput; store: BoardLabStore }) {
  const { t, tc } = useText();
  const value = useLab(store, (s) => s.inputs[input.id] ?? input.default);
  const pressed = value >= 0.5;
  const set = (v: number) => store.dispatch({ type: "input/set", id: input.id, value: v });
  const onKey = (down: boolean) => (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== " " && e.key !== "Enter") return;
    e.preventDefault();
    if (down && !e.repeat) set(input.max);
    if (!down) set(input.min);
  };
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={cx(
        "touch-target flex w-full touch-none select-none items-center justify-between gap-3 rounded-md border-2 border-line px-3 py-2 text-start font-semibold",
        pressed ? "bg-ink text-paper" : "bg-surface",
      )}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        set(input.max);
      }}
      onPointerUp={() => set(input.min)}
      onPointerCancel={() => set(input.min)}
      onKeyDown={onKey(true)}
      onKeyUp={onKey(false)}
      onBlur={() => pressed && set(input.min)}
    >
      <span>{tc(input.label)}</span>
      <span className="text-sm font-normal">{pressed ? t("world.pressed") : t("world.hold")}</span>
    </button>
  );
}

function Slider({ input, store }: { input: WorldInput; store: BoardLabStore }) {
  const { tc } = useText();
  const value = useLab(store, (s) => s.inputs[input.id] ?? input.default);
  return (
    <label className="flex flex-col gap-1">
      <span className="flex items-baseline justify-between gap-2 text-sm font-semibold">
        <span>{tc(input.label)}</span>
        <output className="font-mono tabular">
          {value}
          {input.unit ? ` ${input.unit}` : ""}
        </output>
      </span>
      <input
        type="range"
        className="h-11 w-full accent-[var(--color-mustard-m)]"
        min={input.min}
        max={input.max}
        step={input.step}
        value={value}
        onChange={(e) => store.dispatch({ type: "input/set", id: input.id, value: Number(e.target.value) })}
      />
    </label>
  );
}

/** The world around the board: buttons to hold, switches to flip, sensors to slide. */
export function WorldPanel({ store, inputs }: { store: BoardLabStore; inputs: WorldInput[] }) {
  const { t, tc } = useText();
  const id = useId();
  const values = useLab(store, (s) => s.inputs);
  if (inputs.length === 0) return null;
  return (
    <section aria-labelledby={`${id}-title`} className="ink-card p-3 sm:p-4" data-testid="world-panel">
      <h3 id={`${id}-title`} className="text-lg">
        {t("world.title")}
      </h3>
      <p className="mt-1 text-sm text-muted">{t("world.lede")}</p>
      <ul className="mt-3 flex flex-col gap-3">
        {inputs.map((input) => (
          <li key={input.id}>
            {input.quantity === "button" || input.gesture === "press" ? (
              <HoldButton input={input} store={store} />
            ) : input.quantity === "switch" ? (
              <Toggle
                checked={(values[input.id] ?? input.default) >= 0.5}
                onChange={(on) => store.dispatch({ type: "input/set", id: input.id, value: on ? input.max : input.min })}
                label={tc(input.label)}
              />
            ) : (
              <Slider input={input} store={store} />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
