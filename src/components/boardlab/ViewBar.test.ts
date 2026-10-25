import { expect, test } from "vitest";
import uno from "@/content/boards/uno-r3";
import { boardHidden } from "./ViewBar";

test("the board page hides the figure's buttons the Assembly tab presses, at every width, and keeps the rest", () => {
  const hidden = boardHidden(uno.assembly);
  // The page draws power, the views, Break it and See-through itself; Do it presses strip, pick & place, place, solder, upload.
  expect([...hidden].sort()).toEqual(["break", "place", "pnp", "power", "solder", "strip", "upload", "view", "xr"]);
  // Press RESET and Remove a part are on no tab.
  expect(hidden).not.toContain("ctl-reset");
  expect(hidden).not.toContain("remove");
});

test("a control the Assembly tab presses keeps its own button", () => {
  const hidden = boardHidden([
    { id: "boot", kind: "build", action: { type: "press", id: "ctl-sw0" }, done: {}, major: false, title: "t", body: "b" },
    { id: "plug", kind: "build", action: { type: "set", state: { power: "usb" } }, done: {}, major: false, title: "t", body: "b" },
  ]);
  expect(hidden).not.toContain("ctl-sw0");
});
