"use client";

import { useId, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import type { WorldInput } from "@/content/schema";
import { controlFor } from "@/lib/boardlab/inputs";
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
    <Button
      aria-pressed={pressed}
      className="w-full touch-none justify-between text-start"
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
    </Button>
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
        className="h-11 w-full"
        min={input.min}
        max={input.max}
        step={input.step}
        value={value}
        onChange={(e) => store.dispatch({ type: "input/set", id: input.id, value: Number(e.target.value) })}
      />
    </label>
  );
}

function Requests({ input, requests, store }: { input: WorldInput; requests: { value: number; label: string }[]; store: BoardLabStore }) {
  const { tc } = useText();
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="text-sm font-semibold">{tc(input.label)}</legend>
      <div className="flex flex-wrap gap-2">
        {requests.map((r) => (
          <Button key={r.value} size="sm" variant="secondary" className="tabular font-mono" onClick={() => store.dispatch({ type: "input/request", id: input.id, value: r.value })}>
            {r.label}
          </Button>
        ))}
      </div>
    </fieldset>
  );
}

/** The world around the board: buttons to hold, switches to flip, sensors to slide, a phone to send requests. */
export function WorldPanel({ store, inputs }: { store: BoardLabStore; inputs: WorldInput[] }) {
  const { t, tc } = useText();
  const id = useId();
  const values = useLab(store, (s) => s.inputs);
  const controls = inputs.map((input) => ({ input, control: controlFor(input) })).filter((c) => c.control.kind !== "none");
  if (controls.length === 0) return null;
  return (
    <section aria-labelledby={`${id}-title`} className="flex flex-col gap-3" data-testid="world-panel">
      <h3 id={`${id}-title`} className="sr-only">
        {t("world.title")}
      </h3>
      <p className="text-sm text-muted">{t("world.lede")}</p>
      <ul className="flex flex-col gap-3">
        {controls.map(({ input, control }) => (
          <li key={input.id}>
            {control.kind === "hold" ? (
              <HoldButton input={input} store={store} />
            ) : control.kind === "requests" ? (
              <Requests input={input} requests={control.requests} store={store} />
            ) : control.kind === "switch" ? (
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
