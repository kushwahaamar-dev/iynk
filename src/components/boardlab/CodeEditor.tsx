"use client";

import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { cpp } from "@codemirror/lang-cpp";
import { python } from "@codemirror/lang-python";
import { HighlightStyle, StreamLanguage, bracketMatching, indentOnInput, syntaxHighlighting } from "@codemirror/language";
import { verilog } from "@codemirror/legacy-modes/mode/verilog";
import { Annotation, EditorState, RangeSetBuilder, StateEffect, StateField, type Extension } from "@codemirror/state";
import { Decoration, EditorView, drawSelection, highlightActiveLine, keymap, lineNumbers, type DecorationSet } from "@codemirror/view";
import { tags } from "@lezer/highlight";
import { useEffect, useRef } from "react";
import type { Language } from "@/content/schema";
import type { ChipRange } from "@/lib/boardlab/template";

/** Marks a transaction the host made (chips, reset), so it is not echoed back as a learner edit. */
const external = Annotation.define<boolean>();

type Marks = { chips: ChipRange[]; errorLine: number | null; selected: string[] };
const setMarks = StateEffect.define<Marks>();

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
  items.sort((a, z) => a.from - z.from || (a.deco.spec.class === "cm-error-line" ? -1 : 1));
  for (const it of items) b.add(it.from, it.to, it.deco);
  return b.finish();
}

const ink = HighlightStyle.define([
  { tag: [tags.keyword, tags.controlKeyword, tags.definitionKeyword, tags.modifier, tags.typeName, tags.bool, tags.null, tags.atom, tags.self], color: "var(--code-kw)" },
  { tag: [tags.number, tags.integer, tags.float], color: "var(--code-num)" },
  { tag: [tags.function(tags.variableName), tags.function(tags.propertyName), tags.macroName], color: "var(--code-fn)" },
  { tag: [tags.string, tags.special(tags.string), tags.character], color: "var(--code-str)" },
  { tag: [tags.comment, tags.lineComment, tags.blockComment], color: "var(--code-cm)", fontStyle: "italic" },
  { tag: [tags.processingInstruction, tags.meta], color: "var(--code-kw)" },
  { tag: tags.invalid, color: "var(--bad)" },
]);

function languageExtension(language: Language): Extension {
  if (language === "arduino-cpp") return cpp();
  if (language === "verilog") return StreamLanguage.define(verilog);
  return python();
}

const theme = EditorView.theme({
  "&": { fontSize: "14px", backgroundColor: "var(--code-bg)", color: "var(--code-fg)" },
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
});

type Props = {
  code: string;
  language: Language;
  chips: ChipRange[];
  errorLine: number | null;
  selectedChips: string[];
  label: string;
  chipTitle: (id: string) => string;
  onChange: (code: string) => void;
  onChip: (id: string) => void;
  /** Ctrl/Cmd+Enter runs the code from inside the editor. */
  onRun: () => void;
};

/** The lesson editor: CodeMirror 6 with the Colorfigures ink palette and clickable parameter chips. */
export function CodeEditor({ code, language, chips, errorLine, selectedChips, label, chipTitle, onChange, onChip, onRun }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const handlers = useRef({ onChange, onChip, onRun, chipTitle });
  useEffect(() => {
    handlers.current = { onChange, onChip, onRun, chipTitle };
  });

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
    const v = new EditorView({
      parent: el,
      state: EditorState.create({
        doc: code,
        extensions: [
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
          EditorView.lineWrapping,
          EditorView.contentAttributes.of({ "aria-label": label, "aria-multiline": "true" }),
          keymap.of([
            { key: "Mod-Enter", run: () => (handlers.current.onRun(), true) },
            { key: "Escape", run: (ev) => (ev.contentDOM.blur(), true) },
            ...defaultKeymap,
            ...historyKeymap,
          ]),
          EditorView.updateListener.of((u) => {
            if (!u.docChanged || u.transactions.some((tr) => tr.annotation(external))) return;
            handlers.current.onChange(u.state.doc.toString());
          }),
          EditorView.domEventHandlers({
            mousedown(ev) {
              const chip = (ev.target as HTMLElement).closest?.("[data-chip]");
              if (!chip) return false;
              handlers.current.onChip(chip.getAttribute("data-chip")!);
              return false;
            },
          }),
        ],
      }),
    });
    view.current = v;
    return () => {
      v.destroy();
      view.current = null;
    };
    // The editor is created once per language; content updates arrive through the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, label]);

  useEffect(() => {
    const v = view.current;
    if (!v) return;
    const current = v.state.doc.toString();
    const changes = current === code ? undefined : { from: 0, to: current.length, insert: code };
    v.dispatch({ changes, effects: setMarks.of({ chips, errorLine, selected: selectedChips }), annotations: external.of(true) });
  }, [code, chips, errorLine, selectedChips]);

  return (
    <div ref={host} className="boardlab-code min-h-48" data-testid="code-editor">
      <noscript>
        <pre className="font-mono text-sm whitespace-pre-wrap">{code}</pre>
      </noscript>
    </div>
  );
}
