"use client";

import type { ReactNode } from "react";
import { useCommonT } from "@/i18n/client";
import { cx } from "./cx";
import { VisuallyHidden } from "./VisuallyHidden";

/** One decorative placeholder block; give it the size of what will replace it. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cx("animate-pulse rounded-md bg-hover motion-reduce:animate-none", className)} />
  );
}

/** Wraps skeleton blocks so a screen reader hears the label once instead of every block. */
export function SkeletonGroup({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div role="status" aria-busy="true" className={className}>
      <VisuallyHidden>{label}</VisuallyHidden>
      {children}
    </div>
  );
}

type PageSkeletonKind = "list" | "workspace" | "article";

const CARDS = [0, 1, 2, 3, 4, 5];
const LINES = [0, 1, 2, 3, 4, 5, 6, 7];

function ListSkeleton() {
  return (
    <div className="frame min-h-[calc(100dvh-var(--header-h))] py-12">
      <Skeleton className="h-10 w-2/3 max-w-md" />
      <Skeleton className="mt-4 h-4 w-full max-w-prose" />
      <Skeleton className="mt-2 h-4 w-1/2 max-w-prose" />
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function WorkspaceSkeleton() {
  return (
    <div className="ws">
      <Skeleton className="ws-bar h-10" />
      <div className="ws-stage">
        <Skeleton className="min-h-64 flex-1 rounded-xl" />
      </div>
      <div className="ws-rail">
        <Skeleton className="min-h-48 rounded-xl" />
      </div>
    </div>
  );
}

function ArticleSkeleton() {
  return (
    <div className="frame min-h-[calc(100dvh-var(--header-h))] py-12">
      <div className="max-w-[65ch]">
        <Skeleton className="h-10 w-3/4" />
        <div className="mt-8 space-y-3">
          {LINES.map((i) => (
            <Skeleton key={i} className={cx("h-4", i === LINES.length - 1 ? "w-1/2" : "w-full")} />
          ))}
        </div>
      </div>
    </div>
  );
}

const SHAPES: Record<PageSkeletonKind, () => ReactNode> = {
  list: ListSkeleton,
  workspace: WorkspaceSkeleton,
  article: ArticleSkeleton,
};

/**
 * A route's Suspense fallback, shaped like the page that replaces it. It reads its
 * own label because a fallback cannot await the route's params.
 */
export function PageSkeleton({ kind }: { kind: PageSkeletonKind }) {
  const t = useCommonT();
  const Shape = SHAPES[kind];
  return (
    <SkeletonGroup label={t("state.loading")}>
      <Shape />
    </SkeletonGroup>
  );
}
