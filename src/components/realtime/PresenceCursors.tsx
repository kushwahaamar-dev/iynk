"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { cx } from "@/components/ui";
import { useRoom, type CursorPoint } from "@/lib/realtime";
import { useTogetherT } from "./messages";
import { setPointing, usePointing } from "./pointing";

const FADE_MS = 4000;

type Seen = CursorPoint & { at: number };

/**
 * Others' pointers over the figure. Place it inside the figure's positioned
 * box. The figure is an iframe, so your own pointer is shared only in "point"
 * mode, which lays a pointing surface over it (arrow keys move, Esc ends).
 * The room bar turns point mode on; the figure only shows the way out, since
 * its corners belong to the figure's own buttons and readout.
 */
export function PresenceCursors({ className }: { className?: string }) {
  const room = useRoom();
  const t = useTogetherT();
  const [seen, setSeen] = useState<Record<string, Seen>>({});
  const pointing = usePointing();
  const [mine, setMine] = useState<CursorPoint>({ x: 0.5, y: 0.5 });
  const surface = useRef<HTMLDivElement>(null);
  const onCursor = room?.onCursor;
  const sendCursor = room?.sendCursor;

  useEffect(() => {
    if (!onCursor) return;
    return onCursor((from, point) => {
      setSeen((current) => {
        const next = { ...current };
        if (point) next[from] = { ...point, at: Date.now() };
        else delete next[from];
        return next;
      });
    });
  }, [onCursor]);

  // Drop pointers that went quiet.
  useEffect(() => {
    if (Object.keys(seen).length === 0) return;
    const timer = setTimeout(() => {
      const cutoff = Date.now() - FADE_MS;
      setSeen((current) => Object.fromEntries(Object.entries(current).filter(([, p]) => p.at >= cutoff)));
    }, 1000);
    return () => clearTimeout(timer);
  }, [seen]);

  useEffect(() => {
    if (!pointing) return;
    surface.current?.focus();
    return () => sendCursor?.(null);
  }, [pointing, sendCursor]);

  // Leaving the room or the page ends point mode.
  useEffect(() => () => setPointing(false), []);

  if (!room || !t) return null;

  const share = (point: CursorPoint) => {
    setMine(point);
    room.sendCursor(point);
  };

  const onMove = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    share({ x: (event.clientX - box.left) / box.width, y: (event.clientY - box.top) / box.height });
  };

  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 0.1 : 0.02;
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (event.key === "Escape") {
      setPointing(false);
      return;
    }
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    share({ x: Math.min(1, Math.max(0, mine.x + move[0])), y: Math.min(1, Math.max(0, mine.y + move[1])) });
  };

  const people = new Map(room.peers.map((peer) => [peer.id, peer]));

  return (
    <div className={cx("pointer-events-none absolute inset-0 z-10", className)}>
      {pointing ? (
        <div
          ref={surface}
          tabIndex={0}
          role="application"
          aria-label={t("cursors.surface")}
          onPointerMove={onMove}
          onPointerLeave={() => room.sendCursor(null)}
          onKeyDown={onKey}
          className="pointer-events-auto absolute inset-0 cursor-crosshair rounded-ink bg-[rgb(118_160_226/0.08)] outline-2 outline-offset-[-4px] outline-cobalt outline-dashed"
        />
      ) : null}
      <ul aria-label={t("cursors.label")} className="absolute inset-0">
        {Object.entries(seen).map(([id, point]) => {
          const peer = people.get(id);
          if (!peer) return null;
          return (
            <li
              key={id}
              className="absolute -translate-x-0.5 -translate-y-0.5 transition-[left,top] duration-75 ease-linear motion-reduce:transition-none"
              style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }}
            >
              <svg aria-hidden="true" viewBox="0 0 16 16" className="size-5 drop-shadow-[1px_1px_0_var(--shadow-c)]">
                <path d="M2 1.5l11 6.2-4.7 1.2-2 4.6z" fill={peer.color} stroke="var(--color-ink-fixed)" strokeWidth="1.4" strokeLinejoin="round" />
              </svg>
              <span className="ml-3 inline-block -translate-y-1 rounded-full border-2 border-line px-1.5 text-xs leading-4 font-bold text-ink-fixed" style={{ backgroundColor: peer.color }}>
                {peer.name}
              </span>
            </li>
          );
        })}
      </ul>
      {pointing ? (
        <button
          type="button"
          onClick={() => setPointing(false)}
          className="pointer-events-auto absolute top-3 left-1/2 inline-flex min-h-9 -translate-x-1/2 items-center gap-1.5 rounded-full bg-ink px-3 text-sm font-semibold text-paper [@media(pointer:coarse)]:min-h-11"
        >
          <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
            <path d="M3 2l9 5-4 1-1.6 4z" />
          </svg>
          {t("cursors.stop")}
        </button>
      ) : null}
    </div>
  );
}
