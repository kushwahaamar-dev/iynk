import { describe, expect, test } from "vitest";
import { NAV, showNavEntry } from "./nav";

const off = { solana: false };
const on = { solana: true };

describe("showNavEntry", () => {
  test("Together stays in the nav, and Passport and Verify stay hidden until Solana is on", () => {
    const together = NAV.find((entry) => entry.id === "together");
    const passport = NAV.find((entry) => entry.id === "passport");
    const verify = NAV.find((entry) => entry.id === "verify");
    expect(together && showNavEntry(together, off, "bar")).toBe(true);
    expect(together && showNavEntry(together, off, "footer")).toBe(true);
    expect(passport && showNavEntry(passport, off, "bar")).toBe(false);
    expect(passport && showNavEntry(passport, off, "sheet")).toBe(false);
    expect(passport && showNavEntry(passport, off, "footer")).toBe(false);
    expect(passport && showNavEntry(passport, on, "bar")).toBe(false);
    expect(passport && showNavEntry(passport, on, "sheet")).toBe(true);
    expect(verify && showNavEntry(verify, off, "footer")).toBe(false);
    expect(verify && showNavEntry(verify, on, "footer")).toBe(true);
  });
});
