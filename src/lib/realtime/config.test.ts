// @vitest-environment node
import { describe, expect, test } from "vitest";
import { parseRoomInput, withRoom } from "./config";
import { newRoomId } from "./protocol";

describe("withRoom", () => {
  test("keeps the room on a link between pages of one item, and leaves a link alone outside a room", () => {
    expect(withRoom("/en/drones/quad5/fly", "ab12cd")).toBe("/en/drones/quad5/fly?room=ab12cd");
    expect(withRoom("/en/drones/quad5", null)).toBe("/en/drones/quad5");
    expect(withRoom("/en/drones/quad5", undefined)).toBe("/en/drones/quad5");
  });

  test("the link it makes reads back as the same room", () => {
    const id = newRoomId();
    expect(parseRoomInput(`https://iynk.example${withRoom("/en/drones/quad5/fly", id)}`)).toBe(id);
  });
});
