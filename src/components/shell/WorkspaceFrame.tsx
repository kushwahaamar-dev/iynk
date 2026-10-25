import type { ComponentProps, ReactNode } from "react";
import { cx } from "@/components/ui/cx";

type WorkspaceFrameProps = {
  /** A <WorkspaceBar>. */
  bar: ReactNode;
  /** The figure column: one toolbar row, a <FigureFrame fill>, overlays, at most one readout row or <StageDrawer>. */
  stage: ReactNode;
  /** One <Panel>, usually holding <Tabs fill>. */
  rail: ReactNode;
  /** Reading material after the workspace, in the normal page scroll. */
  below?: ReactNode;
  /** Under lg: "sticky" pins the stage under the header while the rail scrolls; "full" gives it the screen (the fly range). */
  phoneStage?: "sticky" | "full";
  /** E.g. "[--rail-w:clamp(24rem,34vw,38rem)]" for a wider rail. */
  className?: string;
} & Omit<ComponentProps<"div">, "className" | "children">;

/**
 * A lab page as a workspace: from 1024 px the bar, the figure and the rail fill
 * the screen under the header and the rail scrolls inside itself; below that the
 * figure stays pinned on screen while the rail scrolls past it. The grid lives in
 * globals.css (.ws, .ws-bar, .ws-stage, .ws-rail, .ws-below).
 */
export function WorkspaceFrame({ bar, stage, rail, below, phoneStage = "sticky", className, ...rest }: WorkspaceFrameProps) {
  return (
    <div data-frame="workspace" data-phone-stage={phoneStage} className={className} {...rest}>
      <div className="ws">
        <div className="ws-bar min-w-0">{bar}</div>
        <div className="ws-stage">{stage}</div>
        <div className="ws-rail">{rail}</div>
      </div>
      {below ? <div className="ws-below">{below}</div> : null}
    </div>
  );
}
