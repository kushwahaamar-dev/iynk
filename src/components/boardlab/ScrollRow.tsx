"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cx } from "@/components/ui/cx";

type Props = {
  /** Set for a row of plain text: while it scrolls it takes a tab stop under this name, so a keyboard can scroll it. */
  label?: string;
  className?: string;
  children: ReactNode;
  "data-testid"?: string;
};

/** One row that scrolls sideways when it can't fit (German, a phone), with a fade at the end while there is more. */
export function ScrollRow({ label, className, children, "data-testid": testId }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [scrolls, setScrolls] = useState(false);
  const [more, setMore] = useState(false);

  useLayoutEffect(() => {
    const row = ref.current;
    if (!row) return;
    const measure = () => {
      setScrolls(row.scrollWidth > row.clientWidth + 2);
      setMore(row.scrollLeft + row.clientWidth < row.scrollWidth - 2);
    };
    measure();
    // The row's own size changes with the page; its content changes as the figure reports.
    const resize = new ResizeObserver(measure);
    resize.observe(row);
    const content = new MutationObserver(measure);
    content.observe(row, { childList: true, subtree: true, characterData: true });
    row.addEventListener("scroll", measure, { passive: true });
    return () => {
      resize.disconnect();
      content.disconnect();
      row.removeEventListener("scroll", measure);
    };
  }, []);

  return (
    <div
      ref={ref}
      role={label ? "group" : undefined}
      aria-label={label}
      tabIndex={label && scrolls ? 0 : undefined}
      data-more={more || undefined}
      data-testid={testId}
      className={cx(
        // Positioned, so its visually hidden labels (absolute) sit inside it and don't widen the page by the
        // scrolled-off width. The fade would mask the focus ring, so a focused row drops it.
        "relative flex shrink-0 flex-nowrap items-center gap-1.5 overflow-x-auto [scrollbar-width:none] data-more:not-focus-visible:[mask-image:linear-gradient(to_right,#000_calc(100%-3rem),transparent)] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {children}
    </div>
  );
}
