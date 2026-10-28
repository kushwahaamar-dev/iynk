import type { ComponentProps, ReactNode } from "react";
import { cx } from "./cx";

type PanelProps = Omit<ComponentProps<"section">, "title"> & {
  title?: ReactNode;
  /** Id for the title, so the section can be named by it. */
  titleId?: string;
  /** Controls at the end of the title row. */
  actions?: ReactNode;
  /** Classes for the body (default: padded and scrolling). */
  bodyClassName?: string;
};

/**
 * The one box of a pane: a workspace rail, a drawer's body. Everything inside
 * is rows and space, never another card. Without a title the body is the whole
 * panel, which is how a rail holding `<Tabs fill>` uses it.
 */
export function Panel({ title, titleId, actions, className, bodyClassName, children, ...rest }: PanelProps) {
  return (
    <section
      aria-labelledby={title && titleId ? titleId : undefined}
      // overflow-clip, not hidden: it clips the same but is no scroll container, so a sticky tab list inside still
      // sticks to the page on a phone (ws-sticky-tabs).
      className={cx("flex min-h-0 flex-col overflow-clip rounded-2xl border border-rule bg-surface", className)}
      {...rest}
    >
      {title || actions ? (
        <div className="flex min-h-12 shrink-0 items-center gap-2 border-b border-rule px-4">
          {title ? (
            <h2 id={titleId} className="min-w-0 flex-1 truncate text-base font-semibold">
              {title}
            </h2>
          ) : (
            <span className="flex-1" />
          )}
          {actions}
        </div>
      ) : null}
      <div className={cx(title || actions ? "min-h-0 flex-1 overflow-y-auto p-4" : "flex min-h-0 flex-1 flex-col", bodyClassName)}>{children}</div>
    </section>
  );
}
