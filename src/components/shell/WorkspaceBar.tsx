import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { Icon, type IconName } from "@/components/ui/icons";

const LAB_ICON = { cobalt: "board", mint: "robot", tomato: "drone" } as const satisfies Record<string, IconName>;

type WorkspaceBarProps = {
  /** Where "back" goes: a text link from md, the chevron alone below (the label stays its name). */
  back: { href: string; label: string };
  /** "Lesson 2 of 16", "Fig. 01 · Freestyle · Betaflight 2026.6.2". */
  kicker?: ReactNode;
  /** The page's h1. */
  title: ReactNode;
  /** Which lab this is: its icon sits before the kicker. */
  tone?: keyof typeof LAB_ICON;
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
      <ButtonLink href={back.href} variant="ghost" size="sm" className="-ms-2 min-h-11 min-w-11 shrink-0 text-muted hover:text-ink md:justify-start">
        <Icon name="chevron-left" size={16} />
        <span className="max-md:sr-only max-w-[14rem] truncate">{back.label}</span>
      </ButtonLink>
      <div className="min-w-0 flex-[1_1_12rem]">
        {kicker || tone ? (
          <div className="kicker flex min-w-0 items-center gap-2">
            {tone ? <Icon name={LAB_ICON[tone]} size={16} className="shrink-0" /> : null}
            {kicker ? <span className="min-w-0 truncate">{kicker}</span> : null}
          </div>
        ) : null}
        <h1 className="text-xl font-semibold lg:text-2xl">{title}</h1>
      </div>
      {status ? <div className="flex shrink-0 flex-wrap items-center gap-2">{status}</div> : null}
      {actions ? <div className="ms-auto flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
