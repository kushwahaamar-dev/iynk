"use client";

import { useMemo, useState } from "react";
import { Chip, EmptyState, Icon, type ChipTone, type IconName } from "@/components/ui";
import type { Messages } from "@/i18n/namespaces";
import { builtinRegistry } from "@/parts/builtin";
import { engineLine, modelRows, UNKNOWN_PART } from "@/studio/fidelity/static-tier";
import type { ModelRow, ModelStatus, PartLookup, Tier } from "@/studio/fidelity/static-tier";
import type { Project as ProjectState } from "@/project/generated/types";

type ModelsMessages = Messages["studioModels"];

const COLLAPSED_ITEMS = 5;
const STATUS_ORDER: readonly ModelStatus[] = ["modelled", "partly-modelled", "not-modelled-yet"];
const STATUS_LOOK: Record<ModelStatus, { tone: ChipTone; icon: IconName }> = {
  modelled: { tone: "good", icon: "check-circle" },
  "partly-modelled": { tone: "warn", icon: "info" },
  "not-modelled-yet": { tone: "neutral", icon: "empty" },
};

const builtin = builtinRegistry();

/** The tier's code and name; the code is the glyph, so the chip never relies on colour. */
export function TierChip({ tier, messages }: { tier: Tier; messages: ModelsMessages }) {
  const name = messages.tiers[tier].name;
  return (
    <Chip tone={tier === "none" ? "neutral" : "ink"} title={messages.tiers[tier].meaning} aria-label={`${messages.chip}: ${name}`}>
      {tier === "none" ? <Icon name="empty" size={16} aria-hidden="true" /> : <span className="font-ui tabular">{tier}</span>}
      {name}
    </Chip>
  );
}

function Lines({ heading, items, messages }: { heading: string; items: string[]; messages: ModelsMessages }) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;
  const shown = open ? items : items.slice(0, COLLAPSED_ITEMS);
  return (
    <div className="mt-2">
      <h4 className="text-xs font-semibold text-muted">{heading}</h4>
      <ul className="mt-1 list-disc pl-4 text-sm text-pretty">
        {shown.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      {items.length > COLLAPSED_ITEMS ? (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="mt-1 rounded-md px-1 text-sm font-semibold text-accent underline underline-offset-2 hover:text-accent-hover"
        >
          {open ? messages.showLess : messages.showAll}
        </button>
      ) : null}
    </div>
  );
}

function Row({ row, messages }: { row: ModelRow; messages: ModelsMessages }) {
  const look = STATUS_LOOK[row.status];
  return (
    <li className="border-b border-rule py-3 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1 text-base font-semibold">{row.name === UNKNOWN_PART ? messages.unknownPart : row.name}</span>
        <TierChip tier={row.tier} messages={messages} />
        <Chip tone={look.tone}>
          <Icon name={look.icon} size={16} aria-hidden="true" />
          {messages.status[row.status]}
        </Chip>
      </div>
      <Lines heading={messages.models} items={row.models} messages={messages} />
      <Lines heading={messages.notModelled} items={row.notModelled} messages={messages} />
    </li>
  );
}

export function ModelsPanel({ state, messages, registry = builtin }: { state: ProjectState; messages: ModelsMessages; registry?: PartLookup }) {
  const rows = useMemo(() => modelRows(state, registry), [state, registry]);
  const engine = useMemo(() => engineLine(state), [state]);

  return (
    <section aria-label={messages.title} className="flex flex-col gap-4">
      <div>
        <h3 className="text-xs font-semibold text-muted">{messages.engine.label}</h3>
        <p className="text-sm text-pretty">{messages.engine.value}</p>
        {engine.boardNotes.length > 0 ? (
          <>
            <h4 className="mt-2 text-xs font-semibold text-muted">{messages.boardNotes}</h4>
            <ul className="mt-1 list-disc pl-4 text-sm text-pretty">
              {engine.boardNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
      <p className="text-sm text-pretty text-muted">{messages.notModelledHelp}</p>
      {rows.length === 0 ? (
        <EmptyState title={messages.empty} />
      ) : (
        STATUS_ORDER.map((status) => {
          const group = rows.filter((row) => row.status === status);
          if (group.length === 0) return null;
          return (
            <div key={status}>
              <h3 className="text-sm font-semibold">{messages.status[status]}</h3>
              <ul>
                {group.map((row) => (
                  <Row key={row.c} row={row} messages={messages} />
                ))}
              </ul>
            </div>
          );
        })
      )}
    </section>
  );
}
