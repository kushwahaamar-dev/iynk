"use client";

import { useEffect, useState } from "react";
import { PartnerPanel, useBuildLog } from "@/components/ai";
import type { LabDockProps } from "@/components/dock/types";
import { HardwareTwinPanel } from "@/components/hw/HardwareTwinPanel";
import { TogetherPanel } from "@/components/realtime";
import { NearbyPanel, RealBuildPanel, VideoHelp } from "@/components/search";
import { PassportPanel } from "@/components/solana/PassportPanel";
import { Button, Sheet, Tabs } from "@/components/ui";
import { useCommonT } from "@/i18n/client";
import { DOCK_TAB_EVENT } from "@/lib/ai/run-tools";
import { DOCK_TABS, type DockTab } from "@/lib/ai/tools";
import { useFeatures, type Features } from "@/lib/features";
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

function TabBody({ tab, ...lab }: LabDockProps & { tab: DockTab }) {
  if (tab === "partner") return <PartnerPanel {...lab} />;
  if (tab === "together") return <TogetherPanel {...lab} />;
  if (tab === "passport") return <PassportPanel {...lab} />;
  if (tab === "hardware") return <HardwareTwinPanel {...lab} />;
  return (
    <div className="flex flex-col gap-6">
      <RealBuildPanel {...lab} />
      <NearbyPanel {...lab} />
      <VideoHelp {...lab} />
    </div>
  );
}

/**
 * Partner, Together and Real on every lab page. Passport and Hardware are
 * the same tabs, shown only when their feature flags are on. Phones get a
 * bottom sheet; wider screens get the panel in the page.
 */
export function LabDock<S, A extends { type: string }>(props: LabDockProps<S, A>) {
  const t = useCommonT();
  const { features } = useFeatures();
  // Start on the desktop layout with no room so the server HTML matches hydration.
  // The real layout and ?room= are applied on the next turn.
  const [phone, setPhone] = useState(false);
  const [inRoom, setInRoom] = useState(false);
  const register = useRegisterLabStore();
  const { lab, itemId, store } = props;
  useBuildLog({ lab, itemId, store });

  const [tab, setTab] = useState<DockTab>("partner");
  const [picked, setPicked] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [dismissedRoom, setDismissedRoom] = useState(false);
  const shown = DOCK_TABS.filter((id) => tabShown(id, features));
  const fromRoom = !picked && inRoom && shown.includes("together");
  const selected = fromRoom ? "together" : shown.includes(tab) ? tab : shown[0];
  const sheetOpen = sheet || (inRoom && !dismissedRoom);

  function choose(id: DockTab) {
    setPicked(true);
    setTab(id);
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

  useEffect(() => {
    const read = () => setInRoom(roomInAddress());
    const timer = window.setTimeout(read, 0);
    window.addEventListener("popstate", read);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("popstate", read);
    };
  }, []);

  useEffect(() => {
    const onDockTab = (event: Event) => {
      const next = tabFromEvent(event);
      if (!next || !tabShown(next, features)) return;
      choose(next);
      setDismissedRoom(false);
      setSheet(true);
    };
    window.addEventListener(DOCK_TAB_EVENT, onDockTab);
    return () => window.removeEventListener(DOCK_TAB_EVENT, onDockTab);
  }, [features]);

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
      onChange={(id) => {
        if (isDockTab(id) && shown.includes(id)) choose(id);
      }}
    />
  );

  if (phone) {
    return (
      <div
        data-testid="lab-dock"
        data-ready="true"
        data-layout="phone"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <Button
          variant="primary"
          className="pointer-events-auto"
          aria-haspopup="dialog"
          aria-expanded={sheetOpen}
          onClick={() => {
            setDismissedRoom(false);
            setSheet(true);
          }}
        >
          {t("dock.open")}
        </Button>
        <Sheet
          open={sheetOpen}
          onClose={() => {
            setSheet(false);
            setDismissedRoom(true);
          }}
          title={t("dock.label")}
          closeLabel={t("dock.close")}
          side="bottom"
        >
          {tabList}
        </Sheet>
      </div>
    );
  }

  return (
    <section data-testid="lab-dock" data-ready="true" data-layout="desk" aria-label={t("dock.label")} className="ink-card min-w-0 p-3 sm:p-4">
      <p className="text-sm text-muted">{t("dock.hint")}</p>
      <div className="mt-3">{tabList}</div>
    </section>
  );
}
