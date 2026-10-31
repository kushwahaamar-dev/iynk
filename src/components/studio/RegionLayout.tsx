"use client";

import { Component, useState, useSyncExternalStore, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { Button, Callout, Icon, Panel, Sheet, Tabs, type TabItem } from "@/components/ui";
import type { Messages } from "@/i18n/namespaces";
import { useStoreSelector } from "@/studio/stores/select";
import type { UiState, UiStore } from "@/studio/stores/ui";

const WIDE_QUERY = "(min-width: 768px)";
const DOCK_MIN_PX = 80;
const DOCK_MAX_PX = 640;
const KEY_STEP_PX = 16;
const PAGE_STEP_PX = 64;

type StudioStrings = Messages["studio"];
type Region = keyof StudioStrings["layout"]["regions"];

function subscribeWide(listener: () => void): () => void {
  if (typeof window.matchMedia !== "function") return () => {};
  const query = window.matchMedia(WIDE_QUERY);
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}

const isWide = () => typeof window.matchMedia !== "function" || window.matchMedia(WIDE_QUERY).matches;

interface BoundaryProps {
  name: string;
  messages: StudioStrings;
  children: ReactNode;
}

/** Contains a render error to one region and offers to mount it again. The document is never touched. */
export class RegionBoundary extends Component<BoundaryProps, { failed: boolean; attempt: number }> {
  state = { failed: false, attempt: 0 };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    const { name, messages, children } = this.props;
    if (!this.state.failed) return <div key={this.state.attempt} className="flex min-h-0 flex-1 flex-col">{children}</div>;
    return (
      <div role="alert" className="flex flex-1 flex-col items-start gap-2 p-4">
        <Callout tone="danger">{messages.layout.boundary.failed.replace("{name}", name)}</Callout>
        <Button size="sm" onClick={() => this.setState(({ attempt }) => ({ failed: false, attempt: attempt + 1 }))}>
          <Icon name="refresh" size={16} />
          {messages.layout.boundary.reload.replace("{name}", name)}
        </Button>
      </div>
    );
  }
}

export interface RegionLayoutProps {
  top: ReactNode;
  /** The guide tab exists only for a project that has a guide, the robot tab only for a robot. */
  left: Record<Exclude<UiState["leftRail"], "guide" | "robot">, ReactNode> & { guide?: ReactNode; robot?: ReactNode };
  centre: ReactNode;
  right: Record<Exclude<UiState["rightRail"], "robotChecks">, ReactNode> & { robotChecks?: ReactNode };
  dock: Record<Exclude<UiState["dock"], "pid" | "loopTiming">, ReactNode> & { pid?: ReactNode; loopTiming?: ReactNode };
  /** The names of the tabs that `messages` has no name for. */
  tabLabels?: Partial<Record<UiState["leftRail"] | UiState["rightRail"] | UiState["dock"], string>>;
  ui: UiStore;
  messages: StudioStrings;
}

function DockSeparator({ ui, messages }: Pick<RegionLayoutProps, "ui" | "messages">) {
  const height = useStoreSelector(ui, (s) => s.dockHeightPx);
  const [drag, setDrag] = useState<{ y: number; height: number } | null>(null);
  const resize = (px: number) => ui.set("dockHeightPx", Math.min(DOCK_MAX_PX, Math.max(DOCK_MIN_PX, px)));

  // The dock sits under the canvas: up makes it taller.
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = { ArrowUp: KEY_STEP_PX, ArrowDown: -KEY_STEP_PX, PageUp: PAGE_STEP_PX, PageDown: -PAGE_STEP_PX }[event.key];
    if (step === undefined) return;
    event.preventDefault();
    resize(height + step);
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    setDrag({ y: event.clientY, height });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      aria-label={messages.layout.separator}
      aria-valuenow={height}
      aria-valuemin={DOCK_MIN_PX}
      aria-valuemax={DOCK_MAX_PX}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={(event) => drag && resize(drag.height + drag.y - event.clientY)}
      onPointerUp={() => setDrag(null)}
      onPointerCancel={() => setDrag(null)}
      className="group flex h-4 shrink-0 cursor-row-resize touch-none items-center justify-center rounded-lg outline-none focus-visible:outline-2 focus-visible:outline-(--focus)"
    >
      <span aria-hidden="true" className="h-1 w-12 rounded-full bg-rule motion-fade group-hover:bg-muted group-focus-visible:bg-muted" />
    </div>
  );
}

function Rail<K extends string>({ region, order, panels, value, onChange, messages, tabLabels }: {
  region: Region;
  order: readonly K[];
  panels: Partial<Record<K, ReactNode>>;
  value: K;
  onChange: (id: K) => void;
  messages: StudioStrings;
  tabLabels: RegionLayoutProps["tabLabels"];
}) {
  const labels: Record<string, string | undefined> = { guide: messages.lesson.guide.title, ...messages.layout.tabs, ...messages.rail, ...tabLabels };
  const shown = order.filter((id) => id === order[0] || panels[id] != null);
  const tabs: TabItem[] = shown.map((id) => ({ id, label: labels[id]!, content: panels[id] }));
  return <Tabs fill className="flex-1" label={messages.layout.regions[region]} tabs={tabs} value={shown.includes(value) ? value : shown[0]!} onChange={(id) => onChange(id as K)} />;
}

const LEFT_ORDER: readonly UiState["leftRail"][] = ["palette", "files", "outline", "robot"];
const GUIDED_LEFT_ORDER: readonly UiState["leftRail"][] = ["guide", ...LEFT_ORDER];
const RIGHT_ORDER: readonly UiState["rightRail"][] = ["inspector", "problems", "models", "history", "checks", "partner", "robotChecks"];
const DOCK_ORDER: readonly UiState["dock"][] = ["code", "serial", "faults", "pid", "loopTiming"];

/** The five regions of the workspace. Under 768 px the canvas keeps the room and each rail opens as a drawer. */
export function RegionLayout({ top, left, centre, right, dock, ui, messages, tabLabels }: RegionLayoutProps) {
  const t = messages.layout;
  const wide = useSyncExternalStore(subscribeWide, isWide, () => true);
  const leftRail = useStoreSelector(ui, (s) => s.leftRail);
  const rightRail = useStoreSelector(ui, (s) => s.rightRail);
  const dockTab = useStoreSelector(ui, (s) => s.dock);
  const dockHeight = useStoreSelector(ui, (s) => s.dockHeightPx);
  const [drawer, setDrawer] = useState<"left" | "right" | null>(null);

  const guarded = (region: Region, node: ReactNode) => (
    <RegionBoundary name={t.regions[region]} messages={messages}>
      {node}
    </RegionBoundary>
  );

  const guided = left.guide != null;
  const leftNode = (
    <Rail
      region="left"
      order={guided ? GUIDED_LEFT_ORDER : LEFT_ORDER}
      panels={left}
      value={leftRail}
      onChange={(id) => ui.set("leftRail", id)}
      messages={messages}
      tabLabels={tabLabels}
    />
  );
  const rightNode = <Rail region="right" order={RIGHT_ORDER} panels={right} value={rightRail} onChange={(id) => ui.set("rightRail", id)} messages={messages} tabLabels={tabLabels} />;

  return (
    <div className="flex h-[calc(100dvh-var(--header-h))] min-h-96 flex-col gap-2 p-2">
      <div role="group" aria-label={t.regions.top} className="shrink-0">
        {guarded("top", top)}
      </div>
      {wide ? null : (
        <div className="flex flex-wrap items-center gap-2">
          <Callout tone="note">{t.narrow}</Callout>
          <Button size="sm" onClick={() => setDrawer("left")}>
            {t.open.replace("{name}", t.regions.left)}
          </Button>
          <Button size="sm" onClick={() => setDrawer("right")}>
            {t.open.replace("{name}", t.regions.right)}
          </Button>
        </div>
      )}
      <div className={wide ? "grid min-h-0 flex-1 grid-cols-[12rem_minmax(0,1fr)_14rem] gap-2 lg:grid-cols-[16rem_minmax(0,1fr)_20rem]" : "flex min-h-0 flex-1 flex-col"}>
        {wide ? <Panel aria-label={t.regions.left}>{guarded("left", leftNode)}</Panel> : null}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <Panel aria-label={t.regions.canvas} className="flex-1">
            {guarded("canvas", centre)}
          </Panel>
          <DockSeparator ui={ui} messages={messages} />
          <Panel aria-label={t.regions.dock} className="shrink-0" style={{ height: dockHeight }}>
            {guarded("dock", <Rail region="dock" order={DOCK_ORDER} panels={dock} value={dockTab} onChange={(id) => ui.set("dock", id)} messages={messages} tabLabels={tabLabels} />)}
          </Panel>
        </div>
        {wide ? <Panel aria-label={t.regions.right}>{guarded("right", rightNode)}</Panel> : null}
      </div>
      {wide ? null : (
        <>
          <Sheet open={drawer === "left"} onClose={() => setDrawer(null)} title={t.regions.left} closeLabel={t.close} side="start">
            {guarded("left", leftNode)}
          </Sheet>
          <Sheet open={drawer === "right"} onClose={() => setDrawer(null)} title={t.regions.right} closeLabel={t.close} side="end">
            {guarded("right", rightNode)}
          </Sheet>
        </>
      )}
    </div>
  );
}
