import { describe, expect, it } from "vitest";
import { BOARD_IDS, DRONE_IDS, ROBOTICS_IDS } from "@/content/ids";
import { cityOf, EVENT_TOPICS, videoQuery } from "./topics";

describe("topics", () => {
  it("has a video query for every item", () => {
    for (const id of DRONE_IDS) expect(videoQuery("drone", id)).toMatch(/\w{3}/);
    for (const id of ROBOTICS_IDS) expect(videoQuery("robotics", id)).toMatch(/\w{3}/);
    for (const id of BOARD_IDS) expect(videoQuery("board", id)).toMatch(/tutorial$/);
    expect(videoQuery("drone", "uno-r3")).toBeNull();
    expect(EVENT_TOPICS.drone).toContain("drone");
  });

  it("reads the city from an address", () => {
    expect(cityOf("667 Grand St Unit B, Jersey City, NJ 07304")).toBe("Jersey City, NJ");
    expect(cityOf("9701 Dessau Rd Suite 304, Austin, TX 78754-3963")).toBe("Austin, TX");
    expect(cityOf("Karl-Marx-Allee 1, 10178 Berlin, Germany")).toBe("10178 Berlin, Germany");
    expect(cityOf("Austin")).toBeNull();
  });
});
