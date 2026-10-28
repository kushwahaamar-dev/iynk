"use client";

import { useState, type ReactNode } from "react";
import { Button, Chip, Icon, IconButton, TextInput, type ChipTone, type IconName } from "@/components/ui";
import type { Messages } from "@/i18n/namespaces";
import { builtinRegistry } from "@/parts/builtin";
import { lowestTier, modelRows } from "@/studio/fidelity/static-tier";
import type { DocStore, SaveChip } from "@/studio/stores/doc";
import type { RunStore } from "@/studio/stores/run";
import { useStoreSelector } from "@/studio/stores/select";
import { TierChip } from "./ModelsPanel";
import type { SimLink } from "./wiring/simLink";

const MAX_TITLE = 120;

const builtin = builtinRegistry();

const SAVE_LOOK: Record<SaveChip, { tone: ChipTone; icon: IconName; key: "saved" | "saving" | "unsaved" | "failed" | "readOnly" }> = {
  saved: { tone: "good", icon: "check-circle", key: "saved" },
  saving: { tone: "info", icon: "refresh", key: "saving" },
  unsaved: { tone: "warn", icon: "info", key: "unsaved" },
  "autosave-failed": { tone: "bad", icon: "danger", key: "failed" },
  "read-only": { tone: "neutral", icon: "lock", key: "readOnly" },
};

export interface TopBarProps {
  doc: DocStore;
  run: RunStore;
  link: SimLink;
  /** The settings popover, mounted by the workspace. */
  settings: ReactNode;
  messages: Messages["studio"];
  modelMessages: Messages["studioModels"];
}

function ProjectName({ doc, messages }: Pick<TopBarProps, "doc" | "messages">) {
  const title = useStoreSelector(doc, (s) => s.state.meta.title);
  const readOnly = useStoreSelector(doc, (s) => s.readOnly);
  // What the person is typing; null while the field just shows the stored title.
  const [draft, setDraft] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);

  function leave() {
    setDraft(null);
    setInvalid(false);
  }

  function commit() {
    const next = (draft ?? title).trim();
    if (next === "") return setInvalid(true);
    if (next !== title) doc.commit([{ k: "meta.set", set: { title: next } }], { label: "Rename project" });
    leave();
  }

  return (
    <TextInput
      label={messages.topBar.name}
      hideLabel
      className="min-w-32 max-w-64 font-semibold"
      maxLength={MAX_TITLE}
      readOnly={readOnly}
      value={draft ?? title}
      error={invalid ? messages.rename.invalid : undefined}
      onChange={(event) => {
        setDraft(event.target.value);
        setInvalid(false);
      }}
      onBlur={leave}
      onKeyDown={(event) => {
        if (event.key === "Enter") commit();
        else if (event.key === "Escape") leave();
      }}
    />
  );
}

function SaveStatus({ doc, messages }: Pick<TopBarProps, "doc" | "messages">) {
  const chip = useStoreSelector(doc, (s) => s.saveChip);
  const look = SAVE_LOOK[chip];
  return (
    <Chip tone={look.tone} role="status">
      <Icon name={look.icon} size={16} />
      {messages.topBar.save[look.key]}
    </Chip>
  );
}

export function TopBar({ doc, run, link, settings, messages, modelMessages }: TopBarProps) {
  const t = messages.topBar;
  const canUndo = useStoreSelector(doc, (s) => s.canUndo);
  const canRedo = useStoreSelector(doc, (s) => s.canRedo);
  const phase = useStoreSelector(run, (s) => s.phase);
  const tier = useStoreSelector(doc, (s) => lowestTier(modelRows(s.state, builtin)));
  const active = phase === "starting" || phase === "running";

  return (
    <div role="toolbar" aria-label={t.label} className="flex flex-wrap items-center gap-2">
      <ProjectName doc={doc} messages={messages} />
      <SaveStatus doc={doc} messages={messages} />
      <span className="flex-1" />
      <IconButton label={t.undo} icon="undo" size="sm" shortcut="Ctrl+Z" disabled={!canUndo} onClick={() => doc.undo()} />
      <IconButton label={t.redo} icon="undo" size="sm" shortcut="Ctrl+Shift+Z" disabled={!canRedo} className="[&_svg]:-scale-x-100" onClick={() => doc.redo()} />
      <Button variant="primary" size="sm" disabled={phase === "starting"} onClick={() => void link.run()}>
        <Icon name="play" size={16} />
        {t.run}
      </Button>
      <Button variant="secondary" size="sm" disabled={!active} onClick={() => link.stop()}>
        <Icon name="stop" size={16} />
        {t.stop}
      </Button>
      <Button variant="ghost" size="sm" disabled={phase === "idle"} onClick={() => link.reset()}>
        <Icon name="reset" size={16} />
        {t.reset}
      </Button>
      <TierChip tier={tier} messages={modelMessages} />
      {settings}
    </div>
  );
}
