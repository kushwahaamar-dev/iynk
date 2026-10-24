"use client";

import { useEffect, useRef } from "react";

const COLORS = ["var(--color-tomato)", "var(--color-mustard)", "var(--color-mint)", "var(--color-cobalt)", "var(--color-blush)"];
const PIECES = 36;

/** A one-shot burst of inked paper scraps. Skipped when the reader prefers less motion. */
export function Confetti() {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = box.current;
    if (!host || typeof host.animate !== "function" || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const animations: Animation[] = [];
    for (let i = 0; i < PIECES; i++) {
      const piece = document.createElement("span");
      const size = 6 + (i % 4) * 2;
      piece.style.cssText = `position:absolute;left:50%;top:30%;width:${size}px;height:${size * 0.6}px;background:${COLORS[i % COLORS.length]};border:1.5px solid var(--color-ink);border-radius:2px`;
      host.appendChild(piece);
      const angle = (i / PIECES) * Math.PI * 2;
      const reach = 70 + (i % 5) * 22;
      const dx = Math.cos(angle) * reach;
      const dy = Math.sin(angle) * reach * 0.6;
      animations.push(
        piece.animate(
          [
            { transform: "translate(-50%, 0) rotate(0deg)", opacity: 1 },
            { transform: `translate(calc(-50% + ${dx}px), ${dy}px) rotate(${180 + i * 23}deg)`, opacity: 1, offset: 0.55 },
            { transform: `translate(calc(-50% + ${dx * 1.15}px), ${dy + 140}px) rotate(${360 + i * 31}deg)`, opacity: 0 },
          ],
          { duration: 1300 + (i % 6) * 90, easing: "cubic-bezier(0.2, 0.7, 0.3, 1)", fill: "forwards" },
        ),
      );
    }
    return () => {
      for (const animation of animations) animation.cancel();
      host.replaceChildren();
    };
  }, []);

  return <div ref={box} aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden" />;
}
