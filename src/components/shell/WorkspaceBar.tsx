import Link from "next/link";
import type { ReactNode } from "react";
import { cx } from "@/components/ui/cx";
import { Icon } from "@/components/ui/icons";

const SWATCH = { cobalt: "bg-cobalt", mint: "bg-mint", tomato: "bg-tomato" } as const;

type WorkspaceBarProps = {
  /** Where "back" goes: a text link from md, the chevron alone below (the label stays its name). */
  back: { href: string; label: string };
  /** "Lesson 2 of 16", "Fig. 01 · Freestyle · Betaflight 2026.6.2". */
  kicker?: ReactNode;
  /** The page's h1. */
  title: ReactNode;
  /** The lab's one colour touch: a small swatch before the kicker. */
  tone?: keyof typeof SWATCH;
  /** A Done pill, compact progress, the untranslated chip. */
  status?: ReactNode;
  /** The right end, in this order: the page's primary, Sound, ?, Lab tools. */
  actions?: ReactNode;
  className?: string;
};

/** The workspace's title row: back, the kicker over the title, status, then the actions. */
export function WorkspaceBar({ back, kicker, title, tone, status, actions, className }: WorkspaceBarProps) {
  return (
    <div className={cx("flex min-h-14 flex-wrap items-center gap-x-4 gap-y-1", className)}>
      <Link
        href={back.href}
        className="-ms-2 inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1 rounded-full px-2 font-body text-sm font-semibold text-muted no-underline hover:bg-sunken hover:text-ink md:justify-start"
      >
        <Icon name="chevron-left" size={18} />
        <span className="max-md:sr-only max-w-[14rem] truncate">{back.label}</span>
      </Link>
      <div className="min-w-0 flex-[1_1_12rem]">
        {kicker || tone ? (
          <div className="ink-kicker flex min-w-0 items-center gap-2">
            {tone ? <span aria-hidden="true" className={cx("size-2.5 shrink-0 rounded-[3px] border-[1.5px] border-line", SWATCH[tone])} /> : null}
            {kicker ? <span className="min-w-0 truncate">{kicker}</span> : null}
          </div>
        ) : null}
        <h1 className="font-head text-xl leading-tight lg:text-2xl">{title}</h1>
      </div>
      {status ? <div className="flex shrink-0 flex-wrap items-center gap-2">{status}</div> : null}
      {actions ? <div className="ms-auto flex shrink-0 items-center gap-1.5">{actions}</div> : null}
    </div>
  );
}
