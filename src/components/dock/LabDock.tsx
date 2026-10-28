"use client";

import dynamic from "next/dynamic";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import type { LabDockProps, LabKind } from "@/components/dock/types";
import { setPointing, usePointing } from "@/components/realtime/pointing";
import { PanelSkeleton, useSearchAvailability } from "@/components/search/shared";
import { Button, Icon, IconButton, Sheet, Tabs, useIsClient } from "@/components/ui";
import { useCommonT } from "@/i18n/client";
import { DOCK_TAB_EVENT } from "@/lib/ai/run-tools";
import { DOCK_TABS, type DockTab } from "@/lib/ai/tools";
import { useFeatures, type Features } from "@/lib/features";
import { useTogether } from "@/lib/realtime";
import { ROOM_PARAM } from "@/lib/realtime/config";
import { isRoomId, normalizeRoomId } from "@/lib/realtime/protocol";
import { useRegisterLabStore } from "./LabRoom";

// Phones, including 390×844. Matches the header's md breakpoint.
const PHONE_QUERY = "(max-width: 767px)";

const TAB_FLAG: Record<DockTab, "hw" | null> = {
  partner: null,
  together: null,
  real: null,
  hardware: "hw",
};

const TAB_LABEL = {
  partner: "dock.tabs.partner",
  together: "dock.tabs.together",
  real: "dock.tabs.real",
  hardware: "dock.tabs.hardware",
} as const;

function tabShown(tab: DockTab, features: Features): boolean {
  const flag = TAB_FLAG[tab];
  return flag === null || features[flag] === true;
}

/** The first tab that does something on this deployment: the partner when AI is on, else rooms, or prices on a drone. */
function firstWorkingTab(lab: LabKind, features: Features): DockTab {
  if (features.ai) return "partner";
  return lab === "drone" ? "real" : "together";
}

function isDockTab(value: string): value is DockTab {
  return (DOCK_TABS as readonly string[]).includes(value);
}

function tabFromEvent(event: Event): DockTab | null {
  if (!(event instanceof CustomEvent)) return null;
  const tab = (event.detail as { tab?: unknown } | null)?.tab;
  return typeof tab === "string" && isDockTab(tab) ? tab : null;
}

function roomInAddress() {
  const raw = new URLSearchParams(window.location.search).get(ROOM_PARAM);
  return isRoomId(raw ? normalizeRoomId(raw) : "");
}

const loading = () => <PanelSkeleton />;
const PartnerPanel = dynamic(() => import("@/components/ai/PartnerPanel").then((m) => m.PartnerPanel), { loading });
const TogetherPanel = dynamic(() => import("@/components/realtime/TogetherPanel").then((m) => m.TogetherPanel), { loading });
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
  if (tab === "partner") return <PartnerPanel {...lab} />;
  if (tab === "together") return <TogetherPanel {...lab} />;
  if (tab === "hardware") return <HardwareTwinPanel {...lab} />;
  return <RealTab {...lab} />;
}

/**
 * Partner, Together and Build it for real on every lab page (Hardware
 * when its flag is on). Rendered where the page puts it (the
 * workspace bar) as a "Lab tools" button: on a desk it opens a drawer along
 * the right edge that leaves the figure in view, on a phone a bottom sheet.
 */
export function LabDock<S, A extends { type: string }>(props: LabDockProps<S, A>) {
  const t = useCommonT();
  const { features } = useFeatures();
  const together = useTogether();
  const isClient = useIsClient();
  const drawerId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  // Start on the desktop layout with no room so the server HTML matches hydration.
  // The real layout and ?room= are applied on the next turn.
  const [phone, setPhone] = useState(false);
  const [addressRoom, setAddressRoom] = useState(false);
  const register = useRegisterLabStore();
  const { lab, store } = props;

  const [tab, setTab] = useState<DockTab | null>(null);
  const [open, setOpen] = useState(false);
  const [dismissedRoom, setDismissedRoom] = useState(false);
  const [visited, setVisited] = useState<readonly DockTab[]>([]);
  const inRoom = together ? together.roomId !== null : addressRoom;
  const shown = DOCK_TABS.filter((id) => tabShown(id, features));
  const preferred = firstWorkingTab(lab, features);
  const fromRoom = tab === null && inRoom && shown.includes("together");
  const selected = fromRoom ? "together" : tab && shown.includes(tab) ? tab : shown.includes(preferred) ? preferred : shown[0];
  const roomOpened = inRoom && !dismissedRoom;
  // On a phone the sheet covers the figure, so it steps aside while you point and comes back after.
  const pointing = usePointing();
  const isOpen = (open || roomOpened) && !(phone && pointing);
  // A panel's code is fetched the first time its tab is on screen, then it stays mounted like before.
  if (isOpen && !visited.includes(selected)) setVisited([...visited, selected]);

  function choose(id: DockTab) {
    setTab(id);
  }

  function close() {
    setOpen(false);
    setDismissedRoom(true);
    triggerRef.current?.focus();
  }

  useEffect(() => {
    if (!register) return;
    return register(store);
  }, [register, store]);

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

  // Outside a RoomProvider (tests, a page without rooms) the address is the only source.
  useEffect(() => {
    if (together) return;
    const read = () => setAddressRoom(roomInAddress());
    const timer = window.setTimeout(read, 0);
    window.addEventListener("popstate", read);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("popstate", read);
    };
  }, [together]);

  useEffect(() => {
    const onDockTab = (event: Event) => {
      const next = tabFromEvent(event);
      if (!next || !tabShown(next, features)) return;
      choose(next);
      setDismissedRoom(false);
      setOpen(true);
    };
    window.addEventListener(DOCK_TAB_EVENT, onDockTab);
    return () => window.removeEventListener(DOCK_TAB_EVENT, onDockTab);
  }, [features]);

  // On a desk the drawer takes focus when you open it, or when a room link needs your name; a room link that
  // opens it for someone already named leaves focus where it is.
  const wantsName = roomOpened && together?.identity === null;
  const takesFocus = open || wantsName;
  useEffect(() => {
    if (phone || !isOpen || !takesFocus) return;
    // The Together strings load on demand, so the name field can take a few frames to appear.
    let frame = 0;
    let tries = 0;
    const place = () => {
      const drawer = drawerRef.current;
      if (!drawer || drawer.contains(document.activeElement)) return;
      const name = wantsName ? drawer.querySelector<HTMLInputElement>('input[autocomplete="nickname"]') : null;
      if (wantsName && !name && tries++ < 120) {
        frame = requestAnimationFrame(place);
        return;
      }
      (name ?? drawer.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]'))?.focus();
    };
    frame = requestAnimationFrame(place);
    return () => cancelAnimationFrame(frame);
  }, [phone, isOpen, takesFocus, wantsName]);

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
        setPointing(false);
        setDismissedRoom(false);
        setOpen(true);
      }}
      className="relative w-fit shrink-0 whitespace-nowrap max-sm:size-11 max-sm:px-0"
    >
      <Icon name="tools" size={20} />
      <span className="max-sm:sr-only">{t("dock.label")}</span>
      {inRoom ? <span aria-hidden="true" className="absolute -end-0.5 -top-0.5 size-2 rounded-full bg-good" /> : null}
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
