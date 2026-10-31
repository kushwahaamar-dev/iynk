"use client";

import { defaultKeymap, history, historyKeymap, indentLess, indentMore } from "@codemirror/commands";
import { cpp } from "@codemirror/lang-cpp";
import { python } from "@codemirror/lang-python";
import { HighlightStyle, StreamLanguage, bracketMatching, indentOnInput, syntaxHighlighting } from "@codemirror/language";
import { verilog } from "@codemirror/legacy-modes/mode/verilog";
import { Annotation, Compartment, EditorState, RangeSet, RangeSetBuilder, StateEffect, StateField, type Extension } from "@codemirror/state";
import { Decoration, EditorView, GutterMarker, drawSelection, gutter, highlightActiveLine, keymap, lineNumbers, type DecorationSet } from "@codemirror/view";
import { tags } from "@lezer/highlight";
import { useEffect, useRef } from "react";
import type { Language } from "@/content/schema";
import type { ChipRange } from "@/lib/boardlab/template";
import { utf8Length } from "@/core/canonical";

/** Marks a transaction the host made (chips, reset), so it is not echoed back as a learner edit. */
const external = Annotation.define<boolean>();

export type EditorDiagnostic = { line: number; col: number; message: string; severity: "error" | "warning" };

/** One text change in UTF-16 code units, positions in the document as it was before this change. */
export type EditorEdit = { pos: number; del: number; ins: string };

export type DebugKey = "continue" | "step" | "over" | "out";

/** Breakpoint lines, the ones the engine could not bind, and the line the run is stopped on. */
export type DebugMarks = { lines: readonly number[]; unbound: readonly number[]; paused: number | null };

type Marks = { chips: ChipRange[]; errorLine: number | null; selected: string[]; diagnostics: readonly EditorDiagnostic[] };
const setMarks = StateEffect.define<Marks>();
const setDebug = StateEffect.define<DebugMarks>();

const NO_DEBUG: DebugMarks = { lines: [], unbound: [], paused: null };

const NO_CHIPS: ChipRange[] = [];
const NO_SELECTED: string[] = [];
const NO_DIAGNOSTICS: readonly EditorDiagnostic[] = [];
const noop = () => {};

const access = new Compartment();
const accessFor = (readOnly: boolean): Extension => EditorState.readOnly.of(readOnly);

// Code wraps only on a phone; from 640 px a long line scrolls sideways so the line numbers stay true.
const PHONE = "(max-width: 639px)";
const wrapFor = (phone: boolean): Extension => (phone ? EditorView.lineWrapping : []);

type LineProblem = { severity: "error" | "warning"; message: string };

/** The diagnostics that fall inside the document, one entry per line, worst severity first. */
function problemsByLine(state: EditorState, diagnostics: readonly EditorDiagnostic[]): Map<number, LineProblem> {
  const lines = new Map<number, LineProblem>();
  for (const d of diagnostics) {
    if (d.line < 1 || d.line > state.doc.lines) continue;
    const found = lines.get(d.line);
    if (!found) lines.set(d.line, { severity: d.severity, message: d.message });
    else lines.set(d.line, { severity: found.severity === "error" ? "error" : d.severity, message: `${found.message}\n${d.message}` });
  }
  return lines;
}

class ProblemMarker extends GutterMarker {
  constructor(
    readonly severity: LineProblem["severity"],
    readonly message: string,
  ) {
    super();
  }

  eq(other: GutterMarker) {
    return other instanceof ProblemMarker && other.severity === this.severity && other.message === this.message;
  }

  toDOM() {
    const el = document.createElement("span");
    el.className = `cm-problem cm-problem-${this.severity}`;
    el.textContent = this.severity === "error" ? "\u00d7" : "!";
    el.title = this.message;
    el.setAttribute("aria-label", this.message.replaceAll("\n", " "));
    return el;
  }
}

function problemGutter(state: EditorState, diagnostics: readonly EditorDiagnostic[]): RangeSet<GutterMarker> {
  const b = new RangeSetBuilder<GutterMarker>();
  const lines = [...problemsByLine(state, diagnostics)].sort(([a], [z]) => a - z);
  for (const [number, problem] of lines) {
    const at = state.doc.line(number).from;
    b.add(at, at, new ProblemMarker(problem.severity, problem.message));
  }
  return b.finish();
}

class BreakpointMarker extends GutterMarker {
  constructor(
    readonly bound: boolean,
    readonly label: string,
  ) {
    super();
  }

  eq(other: GutterMarker) {
    return other instanceof BreakpointMarker && other.bound === this.bound && other.label === this.label;
  }

  toDOM() {
    const el = document.createElement("span");
    el.className = this.bound ? "cm-breakpoint" : "cm-breakpoint cm-breakpoint-unbound";
    el.title = this.label;
    el.setAttribute("aria-label", this.label);
    return el;
  }
}

function breakpointGutter(state: EditorState, m: DebugMarks, label: (line: number, bound: boolean) => string): RangeSet<GutterMarker> {
  const b = new RangeSetBuilder<GutterMarker>();
  for (const number of [...new Set(m.lines)].sort((a, z) => a - z)) {
    if (number < 1 || number > state.doc.lines) continue;
    const bound = !m.unbound.includes(number);
    const at = state.doc.line(number).from;
    b.add(at, at, new BreakpointMarker(bound, label(number, bound)));
  }
  return b.finish();
}

function pausedLine(state: EditorState, line: number | null): DecorationSet {
  if (line === null || line < 1 || line > state.doc.lines) return Decoration.none;
  const at = state.doc.line(line).from;
  return Decoration.set([Decoration.line({ class: "cm-paused-line" }).range(at)]);
}

function buildMarks(state: EditorState, m: Marks, chipTitle: (id: string) => string): DecorationSet {
  const b = new RangeSetBuilder<Decoration>();
  const items: { from: number; to: number; deco: Decoration }[] = [];
  const len = state.doc.length;
  for (const c of m.chips) {
    if (c.from < 0 || c.to > len || c.from >= c.to) continue;
    const cls = m.selected.includes(c.id) ? "cm-chip cm-chip-marked" : "cm-chip";
    items.push({ from: c.from, to: c.to, deco: Decoration.mark({ class: cls, attributes: { "data-chip": c.id, title: chipTitle(c.id) } }) });
  }
  if (m.errorLine && m.errorLine <= state.doc.lines) {
    const line = state.doc.line(m.errorLine);
    items.push({ from: line.from, to: line.from, deco: Decoration.line({ class: "cm-error-line" }) });
  }
  for (const [number, problem] of problemsByLine(state, m.diagnostics)) {
    const at = state.doc.line(number).from;
    const cls = problem.severity === "error" ? "cm-error-line" : "cm-warning-line";
    items.push({ from: at, to: at, deco: Decoration.line({ class: cls, attributes: { title: problem.message } }) });
  }
  items.sort((a, z) => a.from - z.from || a.deco.startSide - z.deco.startSide);
  for (const it of items) b.add(it.from, it.to, it.deco);
  return b.finish();
}

const ink = HighlightStyle.define([
  { tag: [tags.keyword, tags.controlKeyword, tags.definitionKeyword, tags.modifier, tags.typeName, tags.bool, tags.null, tags.atom, tags.self], color: "var(--code-kw)" },
  { tag: [tags.number, tags.integer, tags.float], color: "var(--code-num)" },
  { tag: [tags.function(tags.variableName), tags.function(tags.propertyName), tags.macroName], color: "var(--code-fn)" },
  { tag: [tags.string, tags.special(tags.string), tags.character], color: "var(--code-str)" },
  { tag: [tags.comment, tags.lineComment, tags.blockComment], color: "var(--code-cm)" },
  { tag: [tags.processingInstruction, tags.meta], color: "var(--code-kw)" },
  { tag: tags.invalid, color: "var(--bad)" },
]);

function languageExtension(language: Language | null): Extension {
  if (language === null) return [];
  if (language === "arduino-cpp") return cpp();
  if (language === "verilog") return StreamLanguage.define(verilog);
  return python();
}

const theme = EditorView.theme({
  "&": { fontSize: "var(--text-sm)", backgroundColor: "var(--code-bg)", color: "var(--code-fg)" },
  ".cm-content": { fontFamily: "var(--font-mono), ui-monospace, monospace", padding: "10px 0", caretColor: "var(--code-fg)" },
  ".cm-gutters": { backgroundColor: "transparent", border: "none", color: "var(--code-cm)" },
  ".cm-lineNumbers .cm-gutterElement": { padding: "0 10px 0 8px", minWidth: "2.2em" },
  ".cm-activeLine": { backgroundColor: "var(--code-line)" },
  ".cm-activeLineGutter": { backgroundColor: "transparent", color: "var(--code-fg)" },
  "&.cm-focused": { outline: "none" },
  ".cm-chip": {
    color: "var(--code-str)",
    backgroundColor: "color-mix(in srgb, var(--code-str) 14%, transparent)",
    borderBottom: "1.5px solid var(--code-str)",
    borderRadius: "3px",
    padding: "0 2px",
    cursor: "pointer",
  },
  ".cm-chip-marked": { outline: "2px solid var(--code-str)", outlineOffset: "1px" },
  ".cm-error-line": { backgroundColor: "var(--bad-bg)", boxShadow: "inset 3px 0 0 var(--bad)" },
  ".cm-warning-line": { backgroundColor: "var(--warn-bg)", boxShadow: "inset 3px 0 0 var(--warn)" },
  ".cm-breakpoints": { minWidth: "1.25em", cursor: "pointer" },
  ".cm-breakpoint": { display: "inline-block", width: "0.7em", height: "0.7em", borderRadius: "50%", backgroundColor: "var(--bad)", border: "1.5px solid var(--bad)", verticalAlign: "middle" },
  ".cm-breakpoint-unbound": { backgroundColor: "transparent" },
  ".cm-paused-line": { backgroundColor: "var(--info-bg)", boxShadow: "inset 3px 0 0 var(--info)" },
  ".cm-problems": { minWidth: "1.25em" },
  ".cm-problem": { display: "inline-block", minWidth: "1em", fontWeight: "600", textAlign: "center" },
  ".cm-problem-error": { color: "var(--bad)" },
  ".cm-problem-warning": { color: "var(--warn)" },
});

type Props = {
  code: string;
  /** Null shows plain text with no highlighting. */
  language: Language | null;
  label: string;
  /** Ctrl/Cmd+Enter runs the code from inside the editor. */
  onRun: () => void;
  chips?: ChipRange[];
  errorLine?: number | null;
  selectedChips?: string[];
  chipTitle?: (id: string) => string;
  onChange?: (code: string) => void;
  onChip?: (id: string) => void;
  /** Line markers: a tinted line and a gutter mark carrying the message as text. */
  diagnostics?: readonly EditorDiagnostic[];
  /** Called once per change of a learner edit, from the last change of a transaction to the first so offsets stay valid. */
  onEdit?: (edit: EditorEdit) => void;
  onCursor?: (at: { line: number; col: number }) => void;
  readOnly?: boolean;
  /** Refuses an edit that would make the text longer than this many UTF-8 bytes, and says so through `onTooBig`. */
  maxBytes?: number;
  onTooBig?: () => void;
  /** Escape then Tab hands focus on instead of indenting; without it Escape just leaves the editor. */
  escapeToNext?: () => void;
  /** Gives the editor a breakpoint gutter and the debug keys. Fixed for the life of the editor, like `diagnostics`. */
  onBreakpoint?: (line: number) => void;
  debug?: DebugMarks;
  breakpointLabel?: (line: number, bound: boolean) => string;
  onDebugKey?: (key: DebugKey) => void;
};

/** The lesson editor: CodeMirror 6 with the Colorfigures ink palette and clickable parameter chips. */
export function CodeEditor({
  code,
  language,
  label,
  onRun,
  chips = NO_CHIPS,
  errorLine = null,
  selectedChips = NO_SELECTED,
  chipTitle = () => "",
  onChange = noop,
  onChip = noop,
  diagnostics,
  onEdit,
  onCursor,
  readOnly = false,
  maxBytes,
  onTooBig,
  escapeToNext,
  onBreakpoint,
  debug = NO_DEBUG,
  breakpointLabel = () => "",
  onDebugKey,
}: Props) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const applied = useRef(code);
  const handlers = useRef({ onChange, onChip, onRun, chipTitle, onEdit, onCursor, maxBytes, onTooBig, escapeToNext, onBreakpoint, breakpointLabel, onDebugKey });
  useEffect(() => {
    handlers.current = { onChange, onChip, onRun, chipTitle, onEdit, onCursor, maxBytes, onTooBig, escapeToNext, onBreakpoint, breakpointLabel, onDebugKey };
  });
  const shown = diagnostics ?? NO_DIAGNOSTICS;

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const marks = StateField.define<DecorationSet>({
      create: () => Decoration.none,
      update(deco, tr) {
        let next = deco.map(tr.changes);
        for (const e of tr.effects) if (e.is(setMarks)) next = buildMarks(tr.state, e.value, (id) => handlers.current.chipTitle(id));
        return next;
      },
      provide: (f) => EditorView.decorations.from(f),
    });
    const problems = StateField.define<RangeSet<GutterMarker>>({
      create: () => RangeSet.empty,
      update(set, tr) {
        let next = set.map(tr.changes);
        for (const e of tr.effects) if (e.is(setMarks)) next = problemGutter(tr.state, e.value.diagnostics);
        return next;
      },
    });
    const breakpoints = StateField.define<RangeSet<GutterMarker>>({
      create: () => RangeSet.empty,
      update(set, tr) {
        let next = set.map(tr.changes);
        for (const e of tr.effects) if (e.is(setDebug)) next = breakpointGutter(tr.state, e.value, (n, bound) => handlers.current.breakpointLabel(n, bound));
        return next;
      },
    });
    const stopped = StateField.define<DecorationSet>({
      create: () => Decoration.none,
      update(deco, tr) {
        let next = deco.map(tr.changes);
        for (const e of tr.effects) if (e.is(setDebug)) next = pausedLine(tr.state, e.value.paused);
        return next;
      },
      provide: (f) => EditorView.decorations.from(f),
    });
    const debugKey = (key: DebugKey) => () => {
      const send = handlers.current.onDebugKey;
      if (!send) return false;
      send(key);
      return true;
    };
    const wrap = new Compartment();
    const phone = window.matchMedia(PHONE);
    let escaped = false;
    const v = new EditorView({
      parent: el,
      state: EditorState.create({
        doc: code,
        extensions: [
          diagnostics ? [problems, gutter({ class: "cm-problems", markers: (view) => view.state.field(problems) })] : [],
          onBreakpoint
            ? [
                breakpoints,
                stopped,
                gutter({
                  class: "cm-breakpoints",
                  markers: (view) => view.state.field(breakpoints),
                  initialSpacer: () => new BreakpointMarker(true, ""),
                  domEventHandlers: {
                    mousedown(view, block) {
                      handlers.current.onBreakpoint?.(view.state.doc.lineAt(block.from).number);
                      return true;
                    },
                  },
                }),
              ]
            : [],
          lineNumbers(),
          history(),
          drawSelection(),
          indentOnInput(),
          bracketMatching(),
          highlightActiveLine(),
          languageExtension(language),
          syntaxHighlighting(ink),
          theme,
          marks,
          access.of(accessFor(readOnly)),
          wrap.of(wrapFor(phone.matches)),
          EditorState.transactionFilter.of((tr) => {
            const { maxBytes: limit, onTooBig: refuse } = handlers.current;
            if (limit === undefined || !tr.docChanged || tr.annotation(external)) return tr;
            // Three bytes per code unit is the most UTF-8 can take, so only a long text needs counting.
            if (tr.newDoc.length * 3 <= limit || utf8Length(tr.newDoc.toString()) <= limit) return tr;
            refuse?.();
            return [];
          }),
          // A contenteditable is in the tab order already; the explicit tabindex tells axe the scrolling editor holds a focus stop.
          EditorView.contentAttributes.of({ "aria-label": label, "aria-multiline": "true", tabindex: "0" }),
          keymap.of([
            { key: "Mod-Enter", run: () => (handlers.current.onRun(), true) },
            {
              key: "F9",
              run: (ev) => {
                const toggle = handlers.current.onBreakpoint;
                if (!toggle) return false;
                toggle(ev.state.doc.lineAt(ev.state.selection.main.head).number);
                return true;
              },
            },
            { key: "F5", run: debugKey("continue"), preventDefault: true },
            { key: "F10", run: debugKey("over"), preventDefault: true },
            { key: "F11", run: debugKey("step"), preventDefault: true },
            { key: "Shift-F11", run: debugKey("out"), preventDefault: true },
            {
              key: "Escape",
              run: (ev) => {
                if (handlers.current.escapeToNext) escaped = true;
                else ev.contentDOM.blur();
                return true;
              },
            },
            {
              key: "Tab",
              run: (ev) => {
                const next = handlers.current.escapeToNext;
                if (!next) return false;
                if (!escaped) return indentMore(ev);
                escaped = false;
                next();
                return true;
              },
            },
            { key: "Shift-Tab", run: (ev) => (handlers.current.escapeToNext ? indentLess(ev) : false) },
            ...defaultKeymap,
            ...historyKeymap,
          ]),
          EditorView.updateListener.of((u) => {
            if (u.docChanged || u.selectionSet) escaped = false;
            if (u.selectionSet || u.docChanged) {
              const head = u.state.selection.main.head;
              const line = u.state.doc.lineAt(head);
              handlers.current.onCursor?.({ line: line.number, col: head - line.from + 1 });
            }
            if (!u.docChanged || u.transactions.some((tr) => tr.annotation(external))) return;
            const edit = handlers.current.onEdit;
            if (edit) {
              for (const tr of u.transactions) {
                const edits: EditorEdit[] = [];
                tr.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => edits.push({ pos: fromA, del: toA - fromA, ins: inserted.toString() }));
                for (const e of edits.reverse()) edit(e);
              }
            }
            handlers.current.onChange(u.state.doc.toString());
          }),
          EditorView.domEventHandlers({
            mousedown(ev) {
              const chip = (ev.target as HTMLElement).closest?.("[data-chip]");
              if (!chip) return false;
              handlers.current.onChip(chip.getAttribute("data-chip")!);
              return false;
            },
            blur() {
              escaped = false;
            },
          }),
        ],
      }),
    });
    view.current = v;
    applied.current = code;
    const onWidth = () => v.dispatch({ effects: wrap.reconfigure(wrapFor(phone.matches)) });
    phone.addEventListener("change", onWidth);
    return () => {
      phone.removeEventListener("change", onWidth);
      v.destroy();
      view.current = null;
    };
    // The editor is created once per language; content updates arrive through the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, label]);

  useEffect(() => {
    view.current?.dispatch({ effects: access.reconfigure(accessFor(readOnly)) });
  }, [readOnly]);

  useEffect(() => {
    const v = view.current;
    if (!v) return;
    // The text is replaced only when the host hands over a new one; a marker change must not undo what was typed since.
    const current = v.state.doc.toString();
    const replace = code !== applied.current && current !== code;
    applied.current = code;
    const changes = replace ? { from: 0, to: current.length, insert: code } : undefined;
    v.dispatch({ changes, effects: setMarks.of({ chips, errorLine, selected: selectedChips, diagnostics: shown }), annotations: external.of(true) });
  }, [code, chips, errorLine, selectedChips, shown]);

  useEffect(() => {
    view.current?.dispatch({ effects: setDebug.of(debug), annotations: external.of(true) });
  }, [debug, code, language, label]);

  return (
    <div ref={host} className="boardlab-code min-h-48" data-testid="code-editor">
      <noscript>
        <pre className="font-mono text-sm whitespace-pre-wrap">{code}</pre>
      </noscript>
    </div>
  );
}
