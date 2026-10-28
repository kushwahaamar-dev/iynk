import { act, render } from "@testing-library/react";
import { EditorView } from "@codemirror/view";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CodeEditor } from "./CodeEditor";

const viewOf = () => EditorView.findFromDOM(document.querySelector<HTMLElement>(".cm-editor")!)!;

beforeEach(() => {
  window.matchMedia = vi.fn().mockReturnValue({ matches: false, addEventListener() {}, removeEventListener() {} });
});

describe("CodeEditor as the labs use it", () => {
  it("reports typing through onChange and marks the error line", () => {
    const onChange = vi.fn();
    render(<CodeEditor code={"a\nb\n"} language="arduino-cpp" label="code" errorLine={2} onChange={onChange} onRun={() => {}} />);
    expect(document.querySelectorAll(".cm-error-line")).toHaveLength(1);
    expect(document.querySelector(".cm-problems")).toBeNull();
    act(() => viewOf().dispatch({ changes: { from: 0, insert: "x" } }));
    expect(onChange).toHaveBeenCalledWith("xa\nb\n");
  });

  it("takes new text from the host and leaves typed text alone when only markers change", () => {
    const props = { language: "python" as const, label: "code", onRun: () => {} };
    const view = render(<CodeEditor {...props} code="one" errorLine={null} />);
    act(() => viewOf().dispatch({ changes: { from: 3, insert: "!" } }));
    view.rerender(<CodeEditor {...props} code="one" errorLine={1} />);
    expect(viewOf().state.doc.toString()).toBe("one!");
    view.rerender(<CodeEditor {...props} code="two" errorLine={1} />);
    expect(viewOf().state.doc.toString()).toBe("two");
  });

  it("calls onEdit from the last change to the first and with offsets in the old text", () => {
    const onEdit = vi.fn();
    render(<CodeEditor code="abcdef" language={null} label="code" onEdit={onEdit} onRun={() => {}} />);
    act(() =>
      viewOf().dispatch({
        changes: [
          { from: 1, to: 2, insert: "XY" },
          { from: 4, insert: "!" },
        ],
      }),
    );
    expect(onEdit.mock.calls).toEqual([[{ pos: 4, del: 0, ins: "!" }], [{ pos: 1, del: 1, ins: "XY" }]]);
  });

  it("refuses typing in a read-only editor", () => {
    render(<CodeEditor code="abc" language={null} label="code" readOnly onRun={() => {}} />);
    expect(viewOf().state.readOnly).toBe(true);
  });
});
