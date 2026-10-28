"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Wrap } from "@/components/editorial/Editorial";
import { splitWords } from "./tagline-words";
import "./tagline.css";

function motionIsOff(): boolean {
  return (
    typeof IntersectionObserver === "undefined" ||
    document.documentElement.dataset.reduceMotion === "true" ||
    (typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches)
  );
}

/** A large statement whose words go from faint to full colour as they cross 60 percent of the viewport height. */
export function TaglineReveal({ text, locale }: { text: string; locale: string }) {
  const pieces = useMemo(() => splitWords(text, locale), [text, locale]);
  const wordCount = useMemo(() => pieces.filter((piece) => piece.word).length, [pieces]);
  const rootRef = useRef<HTMLParagraphElement>(null);
  const [lit, setLit] = useState<ReadonlySet<number>>(() => new Set());

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const everyWord = () => new Set(Array.from({ length: wordCount }, (_, index) => index));
    if (motionIsOff()) {
      const frame = requestAnimationFrame(() => setLit(everyWord()));
      return () => cancelAnimationFrame(frame);
    }
    const done = new Set<number>();
    const observer = new IntersectionObserver(
      (entries) => {
        const before = done.size;
        for (const entry of entries) {
          const passed = entry.isIntersecting || entry.boundingClientRect.top < (entry.rootBounds?.bottom ?? 0);
          if (!passed) continue;
          done.add(Number((entry.target as HTMLElement).dataset.word));
          observer.unobserve(entry.target);
        }
        if (done.size === before) return;
        setLit(new Set(done));
        if (done.size === wordCount) observer.disconnect();
      },
      { rootMargin: "0px 0px -40% 0px" },
    );
    root.querySelectorAll("[data-word]").forEach((word) => observer.observe(word));
    return () => observer.disconnect();
  }, [wordCount]);

  let index = 0;
  return (
    <section className="flex min-h-[60svh] items-center py-24">
      <Wrap>
        <p
          ref={rootRef}
          className="mx-auto max-w-[680px] text-4xl font-semibold tracking-tight text-balance md:text-5xl lg:text-6xl lang-air"
        >
          {pieces.map((piece, position) => {
            if (!piece.word) return piece.text;
            const word = index++;
            return (
              <span key={position} data-word={word} data-lit={lit.has(word)} className="tagline-word">
                {piece.text}
              </span>
            );
          })}
        </p>
      </Wrap>
    </section>
  );
}
