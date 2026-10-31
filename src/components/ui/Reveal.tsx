"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { cx } from "./cx";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function prefersReducedMotion(): boolean {
  return (
    document.documentElement.dataset.reduceMotion === "true" ||
    (typeof window.matchMedia === "function" && window.matchMedia(REDUCED_MOTION).matches)
  );
}

/**
 * True once the element has entered the viewport, and it stays true. Without an
 * IntersectionObserver, or with reduced motion on, it turns true at once.
 */
export function useRevealOnce(ref: RefObject<Element | null>): boolean {
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined" || prefersReducedMotion()) {
      const frame = requestAnimationFrame(() => setSeen(true));
      return () => cancelAnimationFrame(frame);
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setSeen(true);
        observer.disconnect();
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  return seen;
}

type RevealProps = {
  children: ReactNode;
  /** Milliseconds to wait after entering the viewport, to stagger siblings. */
  delay?: number;
  as?: "div" | "section" | "article" | "li" | "p";
  className?: string;
};

/** Rises 32 px and fades in the first time it scrolls into view. Reduced motion: a plain fade. */
export function Reveal({ children, delay, as: Tag = "div", className }: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const seen = useRevealOnce(ref);
  return (
    <Tag
      ref={ref as RefObject<HTMLDivElement & HTMLLIElement & HTMLParagraphElement>}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={cx(
        "transition-[opacity,translate] duration-(--dur-reveal) ease-(--ease-iynk)",
        seen ? "translate-y-0 opacity-100" : "translate-y-[var(--travel,2rem)] opacity-0",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
