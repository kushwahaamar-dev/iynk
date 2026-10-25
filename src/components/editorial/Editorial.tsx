import type { ReactNode } from "react";
import { cx } from "@/components/ui/cx";

// Shared page grammar for the pages outside the labs: a wide editorial head, then numbered sections split by hairlines.

/** Enter motion: opacity and an 8px rise on first paint, none under reduced motion. */
export const enter =
  "transition-[opacity,translate] duration-500 ease-out starting:translate-y-2 starting:opacity-0 motion-reduce:transition-none motion-reduce:starting:translate-y-0 motion-reduce:starting:opacity-100";

/** The page's outer frame: up to 1440px with fluid gutters. */
export const page = "mx-auto w-full max-w-[1440px] px-[clamp(16px,4vw,56px)]";

/** Small uppercase mono label. ink-kicker keeps the Devanagari and Han override (no caps, no tracking). */
export const eyebrow = "ink-kicker text-[11px] font-medium tracking-[0.08em] sm:text-xs";

const display = "font-body text-[clamp(44px,7vw,104px)] leading-[0.95] font-semibold tracking-[-0.035em] [overflow-wrap:anywhere] hyphens-auto";
export const sectionTitle = "font-body text-[clamp(28px,3.4vw,48px)] leading-[1.02] font-semibold tracking-[-0.02em]";

export function PageHead({
  label,
  title,
  lede,
  aside,
  className,
}: {
  label?: ReactNode;
  title: ReactNode;
  lede?: ReactNode;
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cx("grid grid-cols-1 items-end gap-x-6 gap-y-10 pt-[clamp(40px,7vw,112px)] lg:grid-cols-12", className)}>
      <div className={cx("min-w-0", aside ? "lg:col-span-7" : "lg:col-span-10", enter)}>
        {label ? <p className={eyebrow}>{label}</p> : null}
        <h1 className={cx(display, "mt-5 text-balance")}>{title}</h1>
        {lede ? <div className="mt-7 max-w-[52ch] text-[17px] leading-[1.55] text-muted">{lede}</div> : null}
      </div>
      {aside ? <div className={cx("min-w-0 lg:col-span-5", enter, "delay-100")}>{aside}</div> : null}
    </header>
  );
}

/**
 * A numbered section: the index, title and lede on the left four columns, the content on the right eight.
 * `wide` puts the content under the head across all twelve.
 */
export function Section({
  id,
  index,
  title,
  lede,
  wide,
  children,
  className,
}: {
  id: string;
  index?: string;
  title: ReactNode;
  lede?: ReactNode;
  wide?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section aria-labelledby={id} className={cx("mt-[clamp(72px,10vw,160px)] border-t border-rule pt-6 sm:pt-8", className)}>
      <div className="grid grid-cols-1 gap-x-6 gap-y-8 lg:grid-cols-12">
        <div className={cx("min-w-0", wide ? "lg:col-span-12" : "lg:col-span-4")}>
          {index ? (
            <p className={cx(eyebrow, "tabular")} aria-hidden="true">
              {index}
            </p>
          ) : null}
          <h2 id={id} className={cx(sectionTitle, Boolean(index) && "mt-4")}>
            {title}
          </h2>
          {lede ? <div className="mt-4 max-w-[46ch] text-base leading-[1.55] text-muted">{lede}</div> : null}
        </div>
        <div className={cx("min-w-0", wide ? "lg:col-span-12" : "lg:col-span-8")}>{children}</div>
      </div>
    </section>
  );
}

/** A quiet, honest line for an empty, missing or not-set-up state: a hairline rule and plain text, no box. */
export function Note({ title, children, action }: { title?: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="border-s-2 border-line ps-4">
      {title ? <p className="font-semibold">{title}</p> : null}
      {children ? <div className={cx("max-w-[60ch] text-muted", Boolean(title) && "mt-1")}>{children}</div> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
