"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { KeysDialog, OPEN_KEYS_EVENT } from "@/components/settings/KeysDialog";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/icons";
import { Popover } from "@/components/ui/Popover";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Locale } from "@/i18n/config";
import type { ThemeLabels } from "./ThemeControl";

export type SettingsLabels = { settings: string; language: string; theme: ThemeLabels };

const loadPanel = () => import("./SettingsPanel").then((m) => m.SettingsPanel);

/** Sized like the panel, so the popover does not jump when the settings arrive. */
function SettingsPanelSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-4">
      <Skeleton className="h-16" />
      <Skeleton className="h-10" />
      <Skeleton className="h-36" />
      <Skeleton className="h-9" />
    </div>
  );
}

export const SettingsPanel = dynamic(loadPanel, { loading: SettingsPanelSkeleton });

/**
 * The header's Settings button and its popover. The button is quiet: a gear and the page's language code,
 * since the language picker is the first thing most people come here for. The settings load when the
 * button is first pointed at, focused or pressed.
 */
export function SettingsMenu({ lang, labels }: { lang: Locale; labels: SettingsLabels }) {
  const [keysOpen, setKeysOpen] = useState(false);
  const [wanted, setWanted] = useState(false);
  useEffect(() => {
    const open = () => setKeysOpen(true);
    window.addEventListener(OPEN_KEYS_EVENT, open);
    return () => window.removeEventListener(OPEN_KEYS_EVENT, open);
  }, []);
  const want = () => {
    void loadPanel();
    setWanted(true);
  };
  const trigger = (
    <Button variant="ghost" size="sm" onPointerEnter={want} onFocus={want} onClick={want}>
      <span className="sr-only">{labels.settings}</span>
      <Icon name="settings" size={20} aria-hidden="true" />
      <span aria-hidden="true" className="text-sm font-semibold uppercase">
        {lang}
      </span>
    </Button>
  );
  return (
    <>
      <Popover label={labels.settings} trigger={trigger} className="w-[min(21rem,calc(100vw-2rem))] p-4">
        {wanted ? <SettingsPanel lang={lang} labels={labels} /> : <SettingsPanelSkeleton />}
      </Popover>
      <KeysDialog open={keysOpen} onClose={() => setKeysOpen(false)} />
    </>
  );
}
