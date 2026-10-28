import { afterEach, describe, expect, it } from "vitest";
import { navigate, parseHash, readRoute, routeHash, subscribeRoute, type StudioRoute } from "./router";

const home: StudioRoute = { kind: "home" };
const project = (id: string, autorun = false): StudioRoute => ({ kind: "project", id, autorun });

const table: Array<[string, StudioRoute, string]> = [
  ["", home, "#/"],
  ["#", home, "#/"],
  ["#/", home, "#/"],
  ["#/prj_a", project("prj_a"), "#/prj_a"],
  ["#/prj_a?run=1", project("prj_a", true), "#/prj_a?run=1"],
  ["#/prj_a?run=0", project("prj_a"), "#/prj_a"],
  ["#/prj_a?run=", project("prj_a"), "#/prj_a"],
  ["#/prj_a?run=2", project("prj_a"), "#/prj_a"],
  ["#/prj_a?other=1", project("prj_a"), "#/prj_a"],
  ["#/prj_a?other=1&run=1", project("prj_a", true), "#/prj_a?run=1"],
  ["#/prj_a?", project("prj_a"), "#/prj_a"],
  ["#/prj_0", project("prj_0"), "#/prj_0"],
  ["#/prj_a-b_c", project("prj_a-b_c"), "#/prj_a-b_c"],
  ["#/prj_abc123", project("prj_abc123"), "#/prj_abc123"],
  [`#/prj_${"a".repeat(64)}`, project(`prj_${"a".repeat(64)}`), `#/prj_${"a".repeat(64)}`],
  [`#/prj_${"a".repeat(69)}`, home, "#/"],
  ["#/prj_", home, "#/"],
  ["#/prj__a", home, "#/"],
  ["#/prj_-a", home, "#/"],
  ["#/Prj_A", home, "#/"],
  ["#/prj_A", home, "#/"],
  ["#/prj_a/", home, "#/"],
  ["#/prj_a%2F", home, "#/"],
  ["#/prj_a b", home, "#/"],
  ["#/cmp_a", home, "#/"],
  ["#/junk", home, "#/"],
  ["#prj_a", home, "#/"],
  ["#room=abc", home, "#/"],
  ["#share=abc", home, "#/"],
  ["prj_a", home, "#/"],
];

describe("parseHash", () => {
  it.each(table)("%j", (hash, route, canonical) => {
    expect(parseHash(hash)).toEqual(route);
    expect(routeHash(parseHash(hash))).toBe(canonical);
  });
});

describe("the browser route", () => {
  afterEach(() => {
    window.location.hash = "";
  });

  it("reads the current hash", () => {
    window.location.hash = "#/prj_a?run=1";
    expect(readRoute()).toEqual(project("prj_a", true));
  });

  it("returns the same object until the hash changes", () => {
    window.location.hash = "#/prj_a";
    expect(readRoute()).toBe(readRoute());
  });

  it("notifies subscribers on hashchange and stops after unsubscribe", async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
    let calls = 0;
    const off = subscribeRoute(() => calls++);
    navigate(project("prj_b"));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(calls).toBe(1);
    expect(readRoute()).toEqual(project("prj_b"));
    off();
    navigate(home);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(calls).toBe(1);
  });

  it("replace changes the route and still notifies", () => {
    let calls = 0;
    const off = subscribeRoute(() => calls++);
    navigate(project("prj_c", true), "replace");
    off();
    expect(calls).toBe(1);
    expect(readRoute()).toEqual(project("prj_c", true));
  });
});
