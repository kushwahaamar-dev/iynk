import { describe, expect, it } from "vitest";
import { enrolHash, pairLink, parseHash } from "./links";

const TOKEN = "MDEyMzQ1Njc4OWFiY2RlZg";

describe("parseHash", () => {
  it("reads an enrolment code, typed with hyphens or as a link secret", () => {
    expect(parseHash("#enrol=7QKX-2M9R-4TBV")).toEqual({ kind: "enrol", code: "7QKX-2M9R-4TBV" });
    expect(parseHash(`#enrol=${TOKEN}`)).toEqual({ kind: "enrol", code: TOKEN });
  });

  it("reads a pairing token with or without the leading hash", () => {
    expect(parseHash(`#/pair/${TOKEN}`)).toEqual({ kind: "pair", token: TOKEN });
    expect(parseHash(`/pair/${TOKEN}`)).toEqual({ kind: "pair", token: TOKEN });
  });

  it("returns null for junk", () => {
    for (const hash of ["", "#", "#enrol=", "#enrol=short", "#enrol=%E0%A4%A", "#/pair/short", `#/pair/${TOKEN}x`, "#/other/x"]) {
      expect(parseHash(hash)).toBeNull();
    }
  });
});

describe("builders", () => {
  it("round-trips through parseHash", () => {
    expect(parseHash(enrolHash("7QKX-2M9R-4TBV"))).toEqual({ kind: "enrol", code: "7QKX-2M9R-4TBV" });
    expect(pairLink("https://iynk.example", TOKEN)).toBe(`https://iynk.example/together#/pair/${TOKEN}`);
    expect(parseHash(pairLink("https://iynk.example", TOKEN).slice("https://iynk.example/together".length))).toEqual({
      kind: "pair",
      token: TOKEN,
    });
  });
});
