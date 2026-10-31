import { describe, expect, it } from "vitest";
import { normalise, rankCommands } from "./command-items";

const item = (label: string) => ({ label });
const labels = (items: { label: string }[]) => items.map((entry) => entry.label);

describe("normalise", () => {
  it("lowers case and folds accents", () => {
    expect(normalise("Español")).toBe("espanol");
    expect(normalise("Robótica")).toBe("robotica");
  });
});

describe("rankCommands", () => {
  it("ranks a prefix above a word start above a substring", () => {
    const items = [item("Hardware drone"), item("Redrone"), item("Drone Lab")];
    expect(labels(rankCommands(items, "dro"))).toEqual(["Drone Lab", "Hardware drone", "Redrone"]);
  });

  it("folds accents on both sides", () => {
    const items = [item("English"), item("Español"), item("Laboratorio de robótica")];
    expect(labels(rankCommands(items, "Espanol"))).toEqual(["Español"]);
    expect(labels(rankCommands(items, "robotica"))).toEqual(["Laboratorio de robótica"]);
  });

  it("keeps the given order among equal ranks", () => {
    const items = [item("Board Lab"), item("Robotics Lab"), item("Drone Lab")];
    expect(labels(rankCommands(items, "lab"))).toEqual(["Board Lab", "Robotics Lab", "Drone Lab"]);
  });

  it("returns every item for an empty or blank query", () => {
    const items = [item("A"), item("B")];
    expect(rankCommands(items, "")).toEqual(items);
    expect(rankCommands(items, "  ")).toEqual(items);
  });

  it("returns nothing when no label matches", () => {
    expect(rankCommands([item("Dark")], "light")).toEqual([]);
  });
});
