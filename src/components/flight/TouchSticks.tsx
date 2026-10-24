"use client";

import { useRef, useState, type PointerEvent } from "react";
import type { TouchStick } from "@/lib/flight/input";

type StickProps = {
  label: string;
  short: string;
  /** Springs back to the centre on release (false for a manual throttle's vertical axis). */
  springY: boolean;
  /** Where the knob sits with no finger on it (y, -1..1, up positive). */
  restY: number;
  onChange: (v: TouchStick | null) => void;
  side: "left" | "right";
};

const SIZE = 118, TRAVEL = 40;

function Stick({ label, short, springY, restY, onChange, side }: StickProps) {
  const [knob, setKnob] = useState<TouchStick | null>(null);
  const start = useRef<{ id: number; x: number; y: number; ky: number } | null>(null);
  const shown = knob ?? { x: 0, y: restY };

  const move = (e: PointerEvent<HTMLDivElement>) => {
    const s = start.current;
    if (!s || s.id !== e.pointerId) return;
    let x = (e.clientX - s.x) / TRAVEL;
    // a manual throttle starts from where its knob is, so touching it does not jump the throttle
    let y = s.ky - (e.clientY - s.y) / TRAVEL;
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    const v = { x, y };
    setKnob(v);
    onChange(v);
  };
  const end = (e: PointerEvent<HTMLDivElement>) => {
    if (start.current?.id !== e.pointerId) return;
    start.current = null;
    const rest = { x: 0, y: springY ? 0 : (knob?.y ?? restY) };
    setKnob(springY ? null : rest);
    onChange(null);
  };

  return (
    <div
      role="group"
      aria-label={label}
      className={`pointer-events-auto absolute bottom-3 ${side === "left" ? "left-3" : "right-3"} touch-none select-none`}
      style={{ width: SIZE, height: SIZE }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        start.current = { id: e.pointerId, x: e.clientX, y: e.clientY, ky: springY ? 0 : shown.y };
        move(e);
      }}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <div className="absolute inset-0 rounded-full border-2 border-[var(--ink,#231e16)] bg-[rgba(242,239,231,.72)] shadow-[2px_2px_0_var(--ink,#231e16)]" />
      <div
        className="absolute rounded-full border-2 border-[var(--ink,#231e16)] bg-[#ef6a4c]"
        style={{ width: 38, height: 38, left: SIZE / 2 - 19 + shown.x * TRAVEL, top: SIZE / 2 - 19 - shown.y * TRAVEL }}
      />
      <span aria-hidden className="absolute -top-5 left-0 right-0 text-center text-[10px] font-bold tracking-wider">
        {short}
      </span>
    </div>
  );
}

export function TouchSticks({
  climb,
  manualThrottle,
  labels,
  onLeft,
  onRight,
}: {
  climb: boolean;
  manualThrottle: number;
  labels: { left: string; right: string; leftShort: string; rightShort: string };
  onLeft: (v: TouchStick | null) => void;
  onRight: (v: TouchStick | null) => void;
}) {
  return (
    <div className="pointer-events-none absolute inset-0">
      <Stick
        key={climb ? "climb" : "manual"}
        side="left"
        label={labels.left}
        short={labels.leftShort}
        springY={climb}
        restY={climb ? 0 : manualThrottle * 2 - 1}
        onChange={onLeft}
      />
      <Stick side="right" label={labels.right} short={labels.rightShort} springY restY={0} onChange={onRight} />
    </div>
  );
}
