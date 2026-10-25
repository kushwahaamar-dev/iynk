"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Select } from "@/components/ui";
import type { Messages } from "@/i18n/namespaces";
import { CHANNELS, DEFAULT_PAD, learnAxis, padSticks, type Channel, type PadMapping } from "@/lib/flight/input";

type T = Messages["flight"]["gamepad"];
const fill = (s: string, p: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(p[k] ?? ""));

type Learn = { kind: "axis"; channel: Channel; rest: number[] } | { kind: "button"; which: "arm" | "fpv" | "reset" } | null;

/** Live gamepad readout with axis and button learning. */
export function GamepadPanel({ t, mapping, onChange }: { t: T; mapping: PadMapping; onChange: (m: PadMapping) => void }) {
  const [pad, setPad] = useState<{ name: string; axes: number[]; buttons: boolean[] } | null>(null);
  const [learn, setLearn] = useState<Learn>(null);
  const learnRef = useRef<Learn>(null);
  const mapRef = useRef(mapping);
  useEffect(() => {
    learnRef.current = learn;
    mapRef.current = mapping;
  });

  useEffect(() => {
    let raf = 0;
    let shown = "";
    const tick = () => {
      const gp = typeof navigator !== "undefined" && navigator.getGamepads ? [...navigator.getGamepads()].find((g) => g) : null;
      if (gp) {
        const axes = gp.axes.map((a) => Math.round(a * 100) / 100);
        const buttons = gp.buttons.map((b) => b.pressed);
        // re-render only when the readout changes, not on every frame
        const sig = `${gp.id}|${axes.join()}|${buttons.map(Number).join("")}`;
        if (sig !== shown) {
          shown = sig;
          setPad({ name: gp.id, axes, buttons });
        }
        const l = learnRef.current;
        if (l?.kind === "axis") {
          const got = learnAxis(l.rest, axes);
          if (got) {
            onChange({ ...mapRef.current, axes: { ...mapRef.current.axes, [l.channel]: got } });
            setLearn(null);
          }
        } else if (l?.kind === "button") {
          const b = buttons.findIndex((p) => p);
          if (b >= 0) {
            onChange({ ...mapRef.current, [l.which]: b });
            setLearn(null);
          }
        }
      } else if (shown) {
        shown = "";
        setPad(null);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onChange]);

  const sticks = pad ? padSticks(pad.axes, mapping) : null;
  const axisOptions = Array.from({ length: Math.max(4, pad?.axes.length ?? 4) }, (_, i) => i);

  return (
    <section aria-labelledby="flight-gp-title" className="text-sm">
      <h3 id="flight-gp-title" className="mb-2 font-head text-lg">
        {t.title}
      </h3>
      <p aria-live="polite" className="mb-2">
        {pad ? fill(t.found, { name: pad.name }) : t.none}
      </p>
      {learn && (
        <p role="status" className="mb-2 font-semibold">
          {learn.kind === "axis" ? fill(t.listening, { channel: t.channels[learn.channel] }) : t.pressButton}
        </p>
      )}
      <table className="w-full border-collapse text-start">
        <thead>
          <tr className="border-b-[1.5px] border-rule text-xs text-muted">
            <th scope="col">{t.channel}</th>
            <th scope="col">{t.axis}</th>
            <th scope="col">{t.invert}</th>
            <th scope="col">{t.live}</th>
            <th scope="col">
              <span className="sr-only">{t.listen}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {CHANNELS.map((c) => {
            const v = sticks ? (c === "throttle" ? sticks.throttle : (sticks[c] + 1) / 2) : 0.5;
            return (
              <tr key={c} className="border-b border-rule">
                <th scope="row" className="pe-2 text-start font-semibold">
                  {t.channels[c]}
                </th>
                <td>
                  <Select
                    label={`${t.channels[c]}: ${t.axis}`}
                    hideLabel
                    value={mapping.axes[c].axis}
                    onChange={(e) => onChange({ ...mapping, axes: { ...mapping.axes, [c]: { ...mapping.axes[c], axis: Number(e.target.value) } } })}
                    className="!min-h-9 !w-auto py-0 text-sm"
                  >
                    {axisOptions.map((i) => (
                      <option key={i} value={i}>
                        {fill(t.axisN, { n: i })}
                      </option>
                    ))}
                  </Select>
                </td>
                <td>
                  <input
                    type="checkbox"
                    className="size-5 accent-tomato"
                    aria-label={`${t.channels[c]}: ${t.invert}`}
                    checked={mapping.axes[c].invert}
                    onChange={(e) => onChange({ ...mapping, axes: { ...mapping.axes, [c]: { ...mapping.axes[c], invert: e.target.checked } } })}
                  />
                </td>
                <td className="w-24">
                  <meter aria-label={`${t.channels[c]}: ${t.live}`} min={0} max={1} value={v} className="w-20" />
                </td>
                <td>
                  <Button size="sm" variant="ghost" disabled={!pad} onClick={() => setLearn({ kind: "axis", channel: c, rest: pad?.axes ?? [] })}>
                    {t.listen}
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="mt-2 flex flex-wrap gap-2">
        {(["arm", "fpv", "reset"] as const).map((w) => (
          <Button key={w} size="sm" variant="secondary" disabled={!pad} onClick={() => setLearn({ kind: "button", which: w })}>
            {t[`${w}Button`]}: {fill(t.buttonN, { n: mapping[w] })}
          </Button>
        ))}
        <label className="flex min-h-11 items-center gap-2">
          {t.deadband}
          <input
            type="range"
            min={0}
            max={0.25}
            step={0.01}
            value={mapping.deadband}
            onChange={(e) => onChange({ ...mapping, deadband: Number(e.target.value) })}
            className="w-28 accent-tomato"
          />
          <output className="tabular font-ui">{mapping.deadband.toFixed(2)}</output>
        </label>
        <Button size="sm" variant="ghost" onClick={() => onChange(DEFAULT_PAD)}>
          {t.resetMap}
        </Button>
      </div>
    </section>
  );
}
