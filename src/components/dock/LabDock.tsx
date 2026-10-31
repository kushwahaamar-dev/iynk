"use client";

import dynamic from "next/dynamic";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { DOCK_TABS, type DockTab, type LabDockProps } from "@/components/dock/types";
import { PanelSkeleton, useSearchAvailability } from "@/components/search/shared";
import { NotSetUp } from "@/components/settings/NotSetUp";
import { Button, Icon, IconButton, Sheet, Tabs, useIsClient } from "@/components/ui";
import { useCommonT } from "@/i18n/client";
import { useFeatures, type Features } from "@/lib/features";

// Phones, including 390×844. Matches the header's md breakpoint.
const PHONE_QUERY = "(max-width: 767px)";

const TAB_FLAG: Record<DockTab, "hw" | null> = {
  real: null,
  hardware: "hw",
};

const TAB_LABEL = {
  real: "dock.tabs.real",
  hardware: "dock.tabs.hardware",
} as const;

function tabShown(tab: DockTab, features: Features): boolean {
  const flag = TAB_FLAG[tab];
  return flag === null || features[flag] === true;
}

function isDockTab(value: string): value is DockTab {
  return (DOCK_TABS as readonly string[]).includes(value);
}

const loading = () => <PanelSkeleton />;
const HardwareTwinPanel = dynamic(() => import("@/components/hw/HardwareTwinPanel").then((m) => m.HardwareTwinPanel), { loading });
const RealBuildPanel = dynamic(() => import("@/components/search/RealBuildPanel").then((m) => m.RealBuildPanel), { loading });
const NearbyPanel = dynamic(() => import("@/components/search/NearbyPanel").then((m) => m.NearbyPanel), { loading });
const VideoHelp = dynamic(() => import("@/components/search/VideoHelp").then((m) => m.VideoHelp), { loading });

function RealTab(lab: LabDockProps) {
  const search = useSearchAvailability();
  return (
    <div className="flex flex-col gap-6 [&>*+*]:border-t [&>*+*]:border-rule [&>*+*]:pt-6">
      <RealBuildPanel {...lab} />
      {search === "off" ? null : (
        <>
          <NearbyPanel {...lab} />
          <VideoHelp {...lab} />
        </>
      )}
    </div>
  );
}

function TabBody({ tab, ...lab }: LabDockProps & { tab: DockTab }) {
  if (tab === "hardware") return <HardwareTwinPanel {...lab} />;
  return <RealTab {...lab} />;
}

/**
 * Build it for real on every lab page (Hardware when its
 * flag is on). Rendered where the page puts it (the
 * workspace bar) as a "Lab tools" button: on a desk it opens a drawer along
 * the right edge that leaves the figure in view, on a phone a bottom sheet.
 */
export function LabDock<S, A extends { type: string }>(props: LabDockProps<S, A>) {
  const t = useCommonT();
  const { features } = useFeatures();
  const isClient = useIsClient();
  const drawerId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  // Start on the desktop layout so the server HTML matches hydration. The real layout is applied on the next turn.
  const [phone, setPhone] = useState(false);

  const [tab, setTab] = useState<DockTab | null>(null);
  const [isOpen, setOpen] = useState(false);
  const [visited, setVisited] = useState<readonly DockTab[]>([]);
  const shown = DOCK_TABS.filter((id) => tabShown(id, features));
  const selected = tab && shown.includes(tab) ? tab : shown[0];
  // A panel's code is fetched the first time its tab is on screen, then it stays mounted like before.
  if (isOpen && !visited.includes(selected)) setVisited([...visited, selected]);

  function choose(id: DockTab) {
    setTab(id);
  }

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia(PHONE_QUERY);
    const apply = () => setPhone(mq.matches);
    const timer = window.setTimeout(apply, 0);
    mq.addEventListener("change", apply);
    return () => {
      window.clearTimeout(timer);
      mq.removeEventListener("change", apply);
    };
  }, []);

  // On a desk the drawer takes focus when you open it.
  useEffect(() => {
    if (phone || !isOpen) return;
    const frame = requestAnimationFrame(() => {
      const drawer = drawerRef.current;
      if (!drawer || drawer.contains(document.activeElement)) return;
      drawer.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [phone, isOpen]);

  const tabs = shown.map((id) => ({
    id,
    label: t(TAB_LABEL[id]),
    content: visited.includes(id) ? <TabBody {...props} tab={id} /> : null,
  }));

  const tabList = (
    <Tabs
      label={t("dock.label")}
      tabs={tabs}
      value={selected}
      fill={!phone}
      phoneGrid={phone}
      onChange={(id) => {
        if (isDockTab(id) && shown.includes(id)) choose(id);
      }}
    />
  );

  const trigger = (
    <Button
      ref={triggerRef}
      data-testid="lab-dock-trigger"
      variant="secondary"
      size="sm"
      aria-label={t("dock.open")}
      aria-haspopup={phone ? "dialog" : undefined}
      aria-expanded={isOpen}
      aria-controls={phone ? undefined : drawerId}
      aria-pressed={!phone && isOpen ? true : undefined}
      onClick={() => {
        if (isOpen && !phone) return close();
        setOpen(true);
      }}
      className="w-fit shrink-0 whitespace-nowrap max-sm:size-11 max-sm:px-0"
    >
      <Icon name="tools" size={20} />
      <span className="max-sm:sr-only">{t("dock.label")}</span>
    </Button>
  );

  if (phone) {
    return (
      <>
        {trigger}
        <Sheet open={isOpen} onClose={close} title={t("dock.label")} closeLabel={t("dock.close")} side="bottom" height="full">
          <div data-testid="lab-dock" data-ready="true" data-layout="phone">
            {tabList}
          </div>
        </Sheet>
      </>
    );
  }

  const onDrawerKey = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Escape" || event.defaultPrevented) return;
    event.preventDefault();
    close();
  };

  return (
    <>
      {trigger}
      {isClient
        ? createPortal(
            <aside
              ref={drawerRef}
              id={drawerId}
              aria-label={t("dock.label")}
              data-testid="lab-dock"
              data-ready="true"
              data-layout="desk"
              hidden={!isOpen}
              onKeyDown={onDrawerKey}
              className="fixed end-0 top-(--header-h) bottom-0 z-dock flex w-[min(var(--dock-w),calc(100vw-3rem))] flex-col rounded-s-2xl bg-raised shadow-lg animate-slide-in-end"
            >
              <div className="flex min-h-12 shrink-0 items-center gap-2 border-b border-rule ps-4 pe-2">
                <Icon name="tools" size={20} className="text-muted" />
                <h2 className="min-w-0 flex-1 text-lg font-semibold">{t("dock.label")}</h2>
                <IconButton icon="close" size="sm" label={t("dock.close")} onClick={close} />
              </div>
              <div className="min-h-0 flex-1">{tabList}</div>
            </aside>,
            document.body,
          )
        : null}
    </>
  );
}
