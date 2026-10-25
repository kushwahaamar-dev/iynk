import Link from "next/link";
import type { ComponentProps, CSSProperties, ReactNode } from "react";
import { cx } from "@/components/ui/cx";
import "./marketing.css";

export const typeClass = { display: "mk-display", title: "mk-title", eyebrow: "mk-eyebrow", rise: "mk-rise" };

/** The editorial frame: up to 1440px, with gutters that grow with the screen. */
export function Wrap({ className, ...rest }: ComponentProps<"div">) {
  return <div className={cx("mx-auto w-full max-w-[1440px] px-[clamp(16px,4vw,56px)]", className)} {...rest} />;
}

/** The delay for a `typeClass.rise` element, which fades and lifts in once on load (not under reduced motion). */
export function riseDelay(ms: number): CSSProperties {
  return { "--rise-delay": `${ms}ms` } as CSSProperties;
}

/**
 * A message with one *starred* word set in the serif italic. The stars come from the message, so each language
 * picks its own word.
 */
export function Accent({ text }: { text: string }) {
  return text.split("*").map((part, i) =>
    i % 2 === 1 ? (
      <em key={i} className="mk-accent">
        {part}
      </em>
    ) : (
      part
    ),
  );
}

/** A section's number, title and an optional aside, over a hairline. */
export function SectionHead({ n, id, title, aside }: { n: string; id: string; title: string; aside?: ReactNode }) {
  return (
    <header className="grid grid-cols-12 items-end gap-x-6 gap-y-4 border-t border-rule pt-6">
      <p aria-hidden="true" className={cx(typeClass.eyebrow, "col-span-12 tabular md:col-span-2")}>
        {n}
      </p>
      <h2 id={id} className={cx(typeClass.title, "col-span-12 md:col-span-7")}>
        {title}
      </h2>
      {aside ? <div className="col-span-12 md:col-span-3 md:justify-self-end">{aside}</div> : null}
    </header>
  );
}

function Arrow({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
      <path d="M2.5 8h10.5M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** The one solid action on a screen: an ink pill. */
export function CtaLink({ className, children, ...rest }: ComponentProps<typeof Link>) {
  return (
    <Link
      className={cx(
        "group/cta inline-flex min-h-12 max-w-full items-center gap-3 rounded-full bg-ink px-6 py-3 text-[15px] font-medium leading-tight text-paper no-underline transition-[background-color,transform] duration-200 ease-out hover:bg-ink/88 active:translate-y-px",
        className,
      )}
      {...rest}
    >
      <span>{children}</span>
      <Arrow className="shrink-0 transition-transform duration-200 ease-out group-hover/cta:translate-x-0.5 motion-reduce:transition-none" />
    </Link>
  );
}

/** A quiet action: words, a hairline underline and an arrow. */
export function ArrowLink({ className, children, ...rest }: ComponentProps<typeof Link>) {
  return (
    <Link
      className={cx(
        "group/arrow inline-flex min-h-11 max-w-full items-center gap-2 text-[15px] font-medium leading-tight text-ink no-underline",
        className,
      )}
      {...rest}
    >
      <span className="underline decoration-rule decoration-1 underline-offset-[6px] transition-[text-decoration-color] duration-200 group-hover/arrow:decoration-ink">
        {children}
      </span>
      <Arrow className="shrink-0 transition-transform duration-200 ease-out group-hover/arrow:translate-x-0.5 motion-reduce:transition-none" />
    </Link>
  );
}
