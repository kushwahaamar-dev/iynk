import { act, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createSession } from "../../project/session.ts";
import { seededRandom, steppingClock } from "../../project/session.testing.ts";
import { miniProject } from "../engine/testing/mini-scene.ts";
import { createDocStore } from "./doc.ts";
import type { DocStore } from "./doc.ts";
import { useStoreSelector } from "./select.ts";

const OPS = 200;

/** The mini project's parts are resistors the blank project does not depend on, so they borrow the board's definition. */
function project() {
  const state = miniProject(4, 0);
  for (const c of state.components) c.definition = state.boards[0]!.definition;
  return state;
}

function Panel({ doc, id, onRender }: { doc: DocStore; id: string; onRender: () => void }) {
  const component = useStoreSelector(doc, (view) => view.state.components.find((c) => c.id === id));
  onRender();
  return <p>{component?.label ?? "none"}</p>;
}

describe("selector stability", () => {
  it("re-renders a panel only when the entity it selects changes", () => {
    const doc = createDocStore(createSession({ state: project(), clock: steppingClock(), rnd: seededRandom() }));
    let a = 0;
    let b = 0;
    const view = render(
      <>
        <Panel doc={doc} id="cmp_1" onRender={() => void a++} />
        <Panel doc={doc} id="cmp_2" onRender={() => void b++} />
      </>,
    );
    expect(a).toBe(1);
    const ledBefore = doc.getState().state.components.find((c) => c.id === "cmp_1");
    for (let i = 0; i < OPS; i++) {
      act(() => {
        expect(doc.commit([{ k: "component.set", id: "cmp_2", set: { label: `R${i}` } }], { label: "Rename" })).toEqual({ ok: true, revision: i + 1 });
      });
    }
    expect(doc.getState().revision).toBe(OPS);
    expect(doc.getState().state.components.find((c) => c.id === "cmp_1")).toBe(ledBefore);
    expect(a).toBe(1);
    expect(b).toBe(OPS + 1);
    expect(view.container.textContent).toContain(`R${OPS - 1}`);
  });
});
