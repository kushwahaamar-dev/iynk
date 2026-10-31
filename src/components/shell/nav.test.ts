import { describe, expect, test } from "vitest";
import { NAV, showNavEntry } from "./nav";

describe("showNavEntry", () => {
  test("Together stays in the nav", () => {
    const together = NAV.find((entry) => entry.id === "together");
    expect(together && showNavEntry(together, "bar")).toBe(true);
    expect(together && showNavEntry(together, "footer")).toBe(true);
  });
});
