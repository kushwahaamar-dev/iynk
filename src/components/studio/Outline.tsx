"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, UIEvent } from "react";
import { EmptyState, Icon, cx } from "@/components/ui";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/namespaces";
import { createTranslator } from "@/i18n/translate";
import type { Project as ProjectState, WireEnd } from "@/project/generated/types";
import { endLabel } from "@/studio/rules/connect";
import type { DocStore } from "@/studio/stores/doc";
import { useStoreSelector } from "@/studio/stores/select";
import type { Selectable, SessionStore } from "@/studio/stores/session";
import { byPartName, pinEntries } from "@/studio/tools/keyboard";
import type { PinEntry } from "@/studio/tools/keyboard";

export interface OutlineProps {
  doc: DocStore;
  session: SessionStore;
  messages: Messages["studioWire"];
  lang: Locale;
}

type NodeKind = "group" | "part" | "pin" | "wire";

type OutlineNode = {
  key: string;
  kind: NodeKind;
  level: 1 | 2 | 3;
  label: string;
  detail?: string;
  expandable: boolean;
  expanded: boolean;
  parent: string | null;
  item: Selectable | null;
  pin?: { c: string; p: string };
  setSize: number;
  position: number;
};

const ROW_PX = 32;
const OVERSCAN = 8;
const FALLBACK_HEIGHT_PX = 400;
const TYPE_AHEAD_MS = 500;
const INDENT = { 1: "ps-2", 2: "ps-6", 3: "ps-10" } as const;
const GROUPS = ["boards", "parts", "wires"] as const;

const now = () => Date.now();
const groupKey = (name: (typeof GROUPS)[number]) => `group:${name}`;
const selectionKey = (s: Selectable) => `${s.kind}:${s.id}`;

type Draft = Omit<OutlineNode, "setSize" | "position">;

/** The visible rows of the tree, top to bottom, with the size and place of each among its siblings. */
function buildNodes(state: ProjectState, viewId: string, open: ReadonlySet<string>, pins: ReadonlyMap<string, PinEntry[]>, t: (key: string, params?: Record<string, string | number>) => string): OutlineNode[] {
  const view = state.views.find((v) => v.id === viewId);
  if (!view) return [];
  const boards = new Set(state.boards.map((b) => b.id));
  const holders = new Map([...state.boards, ...state.components].map((x) => [x.id, x]));
  const placed = view.placements.filter((p) => p.c !== view.surface && holders.has(p.c));
  const wireEnd = (end: WireEnd) => (end.kind === "junction" ? t("outline.junction") : endLabel(state, end));

  const drafts: Draft[] = [];
  const add = (name: (typeof GROUPS)[number], count: number, children: (parent: string) => Draft[]) => {
    if (count === 0) return;
    const key = groupKey(name);
    const expanded = open.has(key);
    drafts.push({ key, kind: "group", level: 1, label: `${t(`outline.group.${name}`)} (${count})`, expandable: true, expanded, parent: null, item: null });
    if (expanded) drafts.push(...children(key));
  };

  const partRows = (ids: string[]) => (parent: string) =>
    ids.flatMap((id): Draft[] => {
      const item = holders.get(id)!;
      const key = `part:${id}`;
      const kids = pins.get(id) ?? [];
      const expanded = open.has(key);
      const row: Draft = {
        key,
        kind: "part",
        level: 2,
        label: item.refdes,
        detail: item.label ?? item.definition.ref.split(".").pop(),
        expandable: true,
        expanded,
        parent,
        item: { kind: "part", view: viewId, id },
      };
      if (!expanded) return [row];
      return [
        row,
        ...kids.map(
          (e): Draft => ({
            key: `pin:${e.end.c}/${e.end.p}`,
            kind: "pin",
            level: 3,
            label: e.polarity ? t(`pin.polarity.${e.polarity}`) : e.pin,
            detail: e.net === null ? t("pin.unconnected") : t("pin.connected", { others: e.others.join(", ") || e.net.id }),
            expandable: false,
            expanded: false,
            parent: key,
            item: null,
            pin: { c: e.end.c, p: e.end.p },
          }),
        ),
      ];
    });

  const byName = byPartName(state);
  const boardIds = placed.filter((p) => boards.has(p.c)).map((p) => p.c).sort(byName);
  const partIds = placed.filter((p) => !boards.has(p.c)).map((p) => p.c).sort(byName);
  add("boards", boardIds.length, partRows(boardIds));
  add("parts", partIds.length, partRows(partIds));
  add(
    "wires",
    view.wires.length,
    (parent) =>
      view.wires.map(
        (w): Draft => ({
          key: `wire:${w.id}`,
          kind: "wire",
          level: 2,
          label: t("outline.wire", { from: wireEnd(w.from), to: wireEnd(w.to) }),
          expandable: false,
          expanded: false,
          parent,
          item: { kind: "wire", view: viewId, id: w.id },
        }),
      ),
  );

  const sizes = new Map<string | null, number>();
  for (const d of drafts) sizes.set(d.parent, (sizes.get(d.parent) ?? 0) + 1);
  const seen = new Map<string | null, number>();
  return drafts.map((d) => {
    const position = (seen.get(d.parent) ?? 0) + 1;
    seen.set(d.parent, position);
    return { ...d, setSize: sizes.get(d.parent)!, position };
  });
}

/** R-058: the list twin of the canvas. Boards, parts with their pins, and wires, reachable with the arrow keys. */
export function Outline({ doc, session, messages, lang }: OutlineProps) {
  const t = useMemo(() => createTranslator(lang, messages, `${lang}/studioWire`) as (key: string, params?: Record<string, string | number>) => string, [lang, messages]);
  const state = useStoreSelector(doc, (s) => s.state);
  const viewId = useStoreSelector(session, (s) => s.viewId);
  const selection = useStoreSelector(session, (s) => s.selection);
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set(GROUPS.map(groupKey)));
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [height, setHeight] = useState(0);
  const [seen, setSeen] = useState(selection);
  const treeRef = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const wantFocus = useRef(false);
  const typed = useRef({ text: "", at: 0 });

  const pins = useMemo(() => {
    const byPart = new Map<string, PinEntry[]>();
    if (![...open].some((k) => k.startsWith("part:"))) return byPart;
    for (const e of pinEntries(state, viewId)) byPart.set(e.end.c, [...(byPart.get(e.end.c) ?? []), e]);
    return byPart;
  }, [state, viewId, open]);
  const nodes = useMemo(() => buildNodes(state, viewId, open, pins, t), [state, viewId, open, pins, t]);
  const selected = useMemo(() => new Set(selection.filter((s) => s.view === viewId).map(selectionKey)), [selection, viewId]);

  if (seen !== selection) {
    setSeen(selection);
    const first = selection.find((s) => s.view === viewId);
    const owner = first && nodes.find((n) => n.key === selectionKey(first));
    if (owner) setActiveKey(owner.key);
  }

  const found = nodes.findIndex((n) => n.key === activeKey);
  const active = found === -1 ? 0 : found;
  const empty = nodes.length === 0;

  useEffect(() => {
    const el = treeRef.current;
    if (!el) return;
    const measure = () => setHeight(el.clientHeight);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const watch = new ResizeObserver(measure);
    watch.observe(el);
    return () => watch.disconnect();
  }, [empty]);

  /** Where the list has to scroll for row `index` to be in view, or null when it already is. */
  function scrollFor(index: number): number | null {
    const el = treeRef.current;
    if (!el) return null;
    const top = index * ROW_PX;
    const bottom = top + ROW_PX - (el.clientHeight || FALLBACK_HEIGHT_PX);
    return top < el.scrollTop ? top : bottom > el.scrollTop ? bottom : null;
  }

  useEffect(() => {
    const next = scrollFor(active);
    if (next !== null && treeRef.current) treeRef.current.scrollTop = next;
  }, [activeKey, nodes.length]);

  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
    },
    [],
  );

  useEffect(() => {
    if (!wantFocus.current) return;
    wantFocus.current = false;
    treeRef.current?.querySelector<HTMLElement>(`[data-key="${CSS.escape(nodes[active]?.key ?? "")}"]`)?.focus();
  });

  function go(index: number) {
    const node = nodes[Math.max(0, Math.min(nodes.length - 1, index))];
    if (!node) return;
    setActiveKey(node.key);
    const next = scrollFor(nodes.indexOf(node));
    if (next !== null) {
      treeRef.current!.scrollTop = next;
      setScrollTop(next);
    }
    wantFocus.current = true;
    if (node.item) session.setSelection([node.item]);
  }

  function toggle(node: OutlineNode, expand: boolean) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (expand) next.add(node.key);
      else next.delete(node.key);
      return next;
    });
  }

  function typeAhead(char: string, from: number) {
    const at = now();
    const text = (at - typed.current.at > TYPE_AHEAD_MS ? "" : typed.current.text) + char.toLowerCase();
    typed.current = { text, at };
    const start = from + (text.length > 1 ? 0 : 1);
    const order = [...nodes.slice(start), ...nodes.slice(0, start)];
    const hit = order.find((n) => n.label.toLowerCase().startsWith(text));
    if (hit) go(nodes.indexOf(hit));
  }

  function onKeyDown(ev: KeyboardEvent<HTMLDivElement>) {
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    const here = nodes.findIndex((n) => n.key === (ev.target as HTMLElement).closest<HTMLElement>("[data-key]")?.dataset.key);
    const at = here === -1 ? active : here;
    const node = nodes[at];
    if (!node) return;
    switch (ev.key) {
      case "ArrowDown":
        go(at + 1);
        break;
      case "ArrowUp":
        go(at - 1);
        break;
      case "Home":
        go(0);
        break;
      case "End":
        go(nodes.length - 1);
        break;
      case "ArrowRight":
        if (node.expandable && !node.expanded) toggle(node, true);
        else if (node.expanded) go(at + 1);
        break;
      case "ArrowLeft":
        if (node.expanded) toggle(node, false);
        else if (node.parent !== null) go(nodes.findIndex((n) => n.key === node.parent));
        break;
      case "Enter":
      case " ":
        if (node.kind === "group") toggle(node, !node.expanded);
        else if (node.item) go(at);
        break;
      default:
        if (ev.key.length !== 1 || ev.key.toLowerCase() === "w") return;
        typeAhead(ev.key, at);
    }
    ev.preventDefault();
  }

  function onScroll(ev: UIEvent<HTMLDivElement>) {
    if (frame.current) return;
    const el = ev.currentTarget;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      setScrollTop(el.scrollTop);
    });
  }

  if (empty) {
    return (
      <section aria-label={t("outline.title")} className="flex min-h-0 flex-col gap-2">
        <h3 className="text-sm font-semibold">{t("outline.title")}</h3>
        <EmptyState icon="empty" title={t("outline.empty")} className="py-8">
          {t("outline.emptyHint")}
        </EmptyState>
      </section>
    );
  }

  const shown = height || FALLBACK_HEIGHT_PX;
  const first = Math.max(0, Math.floor(scrollTop / ROW_PX) - OVERSCAN);
  const last = Math.min(nodes.length, Math.ceil((scrollTop + shown) / ROW_PX) + OVERSCAN);
  const rows = nodes.slice(first, last);

  return (
    <section aria-label={t("outline.title")} className="flex min-h-0 flex-col gap-2">
      <h3 className="text-sm font-semibold">{t("outline.title")}</h3>
      <div
        ref={treeRef}
        role="tree"
        aria-label={t("outline.title")}
        onKeyDown={onKeyDown}
        onScroll={onScroll}
        className="min-h-0 flex-1 overflow-y-auto"
      >
        <div style={{ paddingTop: first * ROW_PX, paddingBottom: (nodes.length - last) * ROW_PX }}>
          {rows.map((node, i) => {
            const index = first + i;
            return (
              <div
                key={node.key}
                role="treeitem"
                data-key={node.key}
                data-kind={node.kind}
                data-pin-c={node.pin?.c}
                data-pin-p={node.pin?.p}
                aria-level={node.level}
                aria-setsize={node.setSize}
                aria-posinset={node.position}
                aria-expanded={node.expandable ? node.expanded : undefined}
                aria-selected={selected.has(node.key)}
                tabIndex={index === active ? 0 : -1}
                onFocus={() => setActiveKey(node.key)}
                onClick={() => {
                  setActiveKey(node.key);
                  if (node.kind === "group") toggle(node, !node.expanded);
                  else go(index);
                }}
                className={cx(
                  "flex h-8 cursor-pointer items-center gap-2 rounded-lg pe-2 text-sm outline-none motion-fade hover:bg-hover focus-visible:ring-2 focus-visible:ring-focus aria-selected:bg-sunken",
                  INDENT[node.level],
                  node.kind === "group" && "font-semibold",
                )}
              >
                {node.expandable ? <Icon name={node.expanded ? "chevron-down" : "chevron-right"} size={16} aria-hidden="true" className="shrink-0" /> : <span aria-hidden="true" className="size-4 shrink-0" />}
                <span className="truncate">{node.label}</span>
                {node.detail ? <span className="truncate text-xs text-muted">{node.detail}</span> : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
