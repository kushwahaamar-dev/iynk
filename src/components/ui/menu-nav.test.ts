import { describe, expect, it } from "vitest";
import { nextIndex, typeahead } from "./menu-nav";

const items = [{ label: "Copy link" }, { label: "Export", disabled: true }, { label: "Reset" }, { label: "Rename" }];

describe("nextIndex", () => {
  it("moves down and wraps to the first item", () => {
    expect(nextIndex(items, 0, "ArrowDown")).toBe(2);
    expect(nextIndex(items, 3, "ArrowDown")).toBe(0);
  });

  it("moves up and wraps to the last item", () => {
    expect(nextIndex(items, 2, "ArrowUp")).toBe(0);
    expect(nextIndex(items, 0, "ArrowUp")).toBe(3);
  });

  it("starts at the ends when nothing has focus", () => {
    expect(nextIndex(items, -1, "ArrowDown")).toBe(0);
    expect(nextIndex(items, -1, "ArrowUp")).toBe(3);
  });

  it("jumps to the first and last enabled items", () => {
    expect(nextIndex([{ label: "A", disabled: true }, { label: "B" }, { label: "C" }, { label: "D", disabled: true }], 1, "Home")).toBe(1);
    expect(nextIndex([{ label: "A", disabled: true }, { label: "B" }, { label: "C" }, { label: "D", disabled: true }], 1, "End")).toBe(2);
  });

  it("finds nothing in an empty list or one with every item disabled", () => {
    expect(nextIndex([], -1, "ArrowDown")).toBe(-1);
    expect(nextIndex([{ label: "A", disabled: true }], -1, "Home")).toBe(-1);
  });
});

describe("typeahead", () => {
  it("jumps to the next item that starts with the letter", () => {
    expect(typeahead(items, 0, "r")).toBe(2);
    expect(typeahead(items, 2, "r")).toBe(3);
    expect(typeahead(items, 3, "r")).toBe(2);
  });

  it("skips disabled items", () => {
    expect(typeahead(items, 0, "e")).toBe(-1);
  });

  it("matches a longer string from the current item", () => {
    expect(typeahead(items, 0, "ren")).toBe(3);
    expect(typeahead(items, 0, "RES")).toBe(2);
  });

  it("finds nothing for no input, no match or no items", () => {
    expect(typeahead(items, 0, "")).toBe(-1);
    expect(typeahead(items, 0, "z")).toBe(-1);
    expect(typeahead([], -1, "a")).toBe(-1);
  });
});
