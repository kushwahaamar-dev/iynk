"use client";

import { useState, useSyncExternalStore } from "react";
import { IconButton, Popover, SegmentedControl, TextInput, Toggle } from "@/components/ui";
import type { Messages } from "@/i18n/namespaces";
import { useSettings } from "@/lib/settings";
import { shallowEqual, useStoreSelector } from "@/studio/stores/select";
import type { UiStore } from "@/studio/stores/ui";

const SNAP_MIN_MM = 0.1;
const SNAP_MAX_MM = 25.4;
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(listener: () => void): () => void {
  if (typeof window.matchMedia !== "function") return () => {};
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}

const osWantsReducedMotion = () => typeof window.matchMedia === "function" && window.matchMedia(REDUCED_MOTION_QUERY).matches;

/** True when the saved setting or the operating system asks for less motion; either one is enough. */
export function useReducedMotion(): boolean {
  const { reduceMotion } = useSettings();
  const os = useSyncExternalStore(subscribeReducedMotion, osWantsReducedMotion, () => false);
  return reduceMotion || os;
}

type StudioSettingsProps = {
  ui: UiStore;
  messages: Messages["studioHome"];
};

/** Art mode, grid, snap and single key shortcuts. Language, theme and sound stay in the site header. */
export function StudioSettings({ ui, messages }: StudioSettingsProps) {
  const t = messages.settings;
  const view = useStoreSelector(ui, ({ artMode, gridOn, snapMm, singleKeyShortcuts }) => ({ artMode, gridOn, snapMm, singleKeyShortcuts }), shallowEqual);
  // What the person is typing; null while the field just shows the stored value.
  const [draft, setDraft] = useState<string | null>(null);

  function commitSnap() {
    const typed = Number(draft);
    if (draft !== null && draft.trim() !== "" && Number.isFinite(typed)) {
      ui.set("snapMm", Math.min(SNAP_MAX_MM, Math.max(SNAP_MIN_MM, typed)));
    }
    setDraft(null);
  }

  return (
    <Popover label={t.open} trigger={<IconButton label={t.open} icon="sliders" />}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <span className="field-label">{t.art.label}</span>
          <SegmentedControl
            label={t.art.label}
            stretch
            value={view.artMode}
            onChange={(value) => ui.set("artMode", value)}
            options={[
              { value: "illustrated", label: t.art.illustrated },
              { value: "simple", label: t.art.simple },
            ]}
          />
        </div>
        <Toggle label={t.grid.label} description={t.grid.hint} checked={view.gridOn} onChange={(on) => ui.set("gridOn", on)} />
        <TextInput
          label={t.snap.label}
          hint={t.snap.hint.replace("{min}", String(SNAP_MIN_MM)).replace("{max}", String(SNAP_MAX_MM))}
          type="number"
          inputMode="decimal"
          min={SNAP_MIN_MM}
          max={SNAP_MAX_MM}
          step="any"
          className="tabular-nums"
          value={draft ?? String(view.snapMm)}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commitSnap}
          onKeyDown={(event) => {
            if (event.key === "Enter") commitSnap();
          }}
        />
        <Toggle
          label={t.shortcuts.label}
          description={t.shortcuts.hint}
          checked={view.singleKeyShortcuts}
          onChange={(on) => ui.set("singleKeyShortcuts", on)}
        />
      </div>
    </Popover>
  );
}
