"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { PartnerPanel, useBuildLog } from "@/components/ai";
import type { LabDockProps, LabKind } from "@/components/dock/types";
import { HardwareTwinPanel } from "@/components/hw/HardwareTwinPanel";
import { TogetherPanel, setPointing, usePointing } from "@/components/realtime";
import { NearbyPanel, RealBuildPanel, VideoHelp } from "@/components/search";
import { useSearchAvailability } from "@/components/search/shared";
import { PassportPanel } from "@/components/solana/PassportPanel";
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

const TAB_FLAG: Record<DockTab, "solana" | "hw" | null> = {
  partner: null,
  together: null,
  real: null,
  passport: "solana",
  hardware: "hw",
};

const TAB_LABEL = {
  partner: "dock.tabs.partner",
  together: "dock.tabs.together",
  real: "dock.tabs.real",
  passport: "dock.tabs.passport",
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

function RealTab(lab: LabDockProps) {
  const search = useSearchAvailability();
  return (
    <div className="flex flex-col gap-6 [&>*+*]:border-t-[1.5px] [&>*+*]:border-rule [&>*+*]:pt-6">
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
  if (tab === "passport") return <PassportPanel {...lab} />;
  if (tab === "hardware") return <HardwareTwinPanel {...lab} />;
  return <RealTab {...lab} />;
}

/**
 * Partner, Together and Build it for real on every lab page (Passport and
 * Hardware when their flags are on). Rendered where the page puts it (the
 * workspace bar) as a "Lab tools" button: on a desk it opens a drawer along
 * the right edge that leaves the figure in view, on a phone a bottom sheet.
 */
// Where the screen has room, the open drawer pushes the page over instead of covering the rail, so in a room you can
// work the steps or the code and still see the keyboard and the chat. Narrower desks keep the overlay. The figure gives
// up its room first, down to about 34rem, and then the rail, down to 22rem (its width on a 1024 px screen), so a lesson's
// code stays readable beside the drawer on a wide screen (64rem: the drawer, the figure's 34rem, the gap and padding).
const PUSH_PAGE = `@media (width >= 80rem) {
  body:has(> [data-testid="lab-dock"][data-layout="desk"]:not([hidden])) > :is(main, footer) { padding-inline-end: 26rem; }
  body:has(> [data-testid="lab-dock"][data-layout="desk"]:not([hidden])) .ws { grid-template-columns: minmax(0, 1fr) min(var(--rail-w), max(22rem, 100vw - 64rem)); }
}`;

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
  const { lab, itemId, store } = props;
  useBuildLog({ lab, itemId, store });

  const [tab, setTab] = useState<DockTab | null>(null);
  const [open, setOpen] = useState(false);
  const [dismissedRoom, setDismissedRoom] = useState(false);
  const inRoom = together ? together.roomId !== null : addressRoom;
  const shown = DOCK_TABS.filter((id) => tabShown(id, features));
  const preferred = firstWorkingTab(lab, features);
  const fromRoom = tab === null && inRoom && shown.includes("together");
  const selected = fromRoom ? "together" : tab && shown.includes(tab) ? tab : shown.includes(preferred) ? preferred : shown[0];
  const roomOpened = inRoom && !dismissedRoom;
  // On a phone the sheet covers the figure, so it steps aside while you point and comes back after.
  const pointing = usePointing();
  const isOpen = (open || roomOpened) && !(phone && pointing);

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
    content: <TabBody {...props} tab={id} />,
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
      <Icon name="tools" size={18} />
      <span className="max-sm:sr-only">{t("dock.label")}</span>
      {inRoom ? <span aria-hidden="true" className="absolute -end-0.5 -top-0.5 size-3 rounded-full border-[1.5px] border-line bg-mint" /> : null}
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
            <>
              <aside
                ref={drawerRef}
                id={drawerId}
                aria-label={t("dock.label")}
                data-testid="lab-dock"
                data-ready="true"
                data-layout="desk"
                hidden={!isOpen}
                onKeyDown={onDrawerKey}
                className="fixed end-0 top-(--header-h) bottom-0 z-30 flex w-[min(26rem,calc(100vw-3rem))] flex-col border-s-2 border-line bg-surface shadow-[-4px_0_0_var(--shadow-c)] animate-ink-from-end"
              >
                <div className="flex min-h-14 shrink-0 items-center gap-2 border-b-[1.5px] border-rule ps-4 pe-2">
                  <Icon name="tools" size={18} className="text-muted" />
                  <h2 className="min-w-0 flex-1 font-head text-lg">{t("dock.label")}</h2>
                  <IconButton icon="close" size="sm" label={t("dock.close")} onClick={close} />
                </div>
                <div className="min-h-0 flex-1">{tabList}</div>
              </aside>
              <style>{PUSH_PAGE}</style>
            </>,
            document.body,
          )
        : null}
    </>
  );
}
