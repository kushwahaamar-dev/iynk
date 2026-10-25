import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { typeClass } from "@/components/marketing";
import { cx } from "@/components/ui/cx";

// Shared page grammar for the pages outside the labs: a wide editorial head, then numbered sections split by hairlines.

/** Enter motion: opacity and an 8px rise on first paint, none under reduced motion. */
export const enter =
  "transition-[opacity,translate] duration-500 ease-out starting:translate-y-2 starting:opacity-0 motion-reduce:transition-none motion-reduce:starting:translate-y-0 motion-reduce:starting:opacity-100";

/** The page's outer frame: up to 1440px with fluid gutters. */
export const page = "mx-auto w-full max-w-[1440px] px-[clamp(16px,4vw,56px)]";

/** Small uppercase mono label. ink-kicker keeps the Devanagari and Han override (no caps, no tracking). */
export const eyebrow = "ink-kicker text-[11px] font-medium tracking-[0.08em] sm:text-xs";

// The landing's type classes, so every page head and section title is set the same way (and Devanagari gets its air).
const display = cx(typeClass.display, "[overflow-wrap:anywhere] hyphens-auto");
export const sectionTitle = typeClass.title;

/** Form fields on these pages: the lab's ink-field with a 1px line, a soft corner and the body weight. */
export const quietField =
  "min-h-12 rounded-[10px] border border-muted/70 bg-surface text-[15px] font-normal normal-case tracking-normal transition-[border-color] duration-150 hover:border-ink";
export const field = cx("ink-field w-full", quietField);
export const area = cx(field, "min-h-20 py-3 pe-4 text-base leading-[1.5]");

type ActionKind = "primary" | "secondary";
type ActionSize = "lg" | "sm";

// The landing's call to action: one ink pill per screen, everything else a hairline pill. Replaces the raised
// mustard lab buttons on the pages outside the labs.
const actionBase =
  "inline-flex max-w-full select-none items-center justify-center gap-2 rounded-full text-center font-medium leading-tight no-underline transition-[background-color,border-color,opacity] duration-150 ease-out " +
  "disabled:cursor-not-allowed disabled:opacity-45 aria-disabled:cursor-not-allowed aria-disabled:opacity-45";
const actionKinds: Record<ActionKind, string> = {
  primary: "border border-transparent bg-ink text-paper hover:bg-ink/85",
  secondary: "border border-muted/60 bg-transparent text-ink hover:border-ink hover:bg-sunken/60",
};
const actionSizes: Record<ActionSize, string> = {
  lg: "min-h-12 px-6 text-[15px]",
  sm: "min-h-10 px-4 text-sm [@media(pointer:coarse)]:min-h-11",
};

export function actionClass(kind: ActionKind = "secondary", size: ActionSize = "lg", className?: string) {
  return cx(actionBase, actionKinds[kind], actionSizes[size], className);
}

export function Action({ kind, size, className, type = "button", ...rest }: ComponentProps<"button"> & { kind?: ActionKind; size?: ActionSize }) {
  return <button type={type} className={actionClass(kind, size, className)} {...rest} />;
}

export function ActionLink({ kind, size, className, ...rest }: ComponentProps<typeof Link> & { kind?: ActionKind; size?: ActionSize }) {
  return <Link className={actionClass(kind, size, className)} {...rest} />;
}

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
    <header className={cx("grid grid-cols-1 items-end gap-x-6 gap-y-10 pt-[clamp(40px,6vw,96px)] lg:grid-cols-12", className)}>
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
