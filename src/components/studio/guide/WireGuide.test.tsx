import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import messages from "@/i18n/messages/en/studio.json";
import type { WireRow } from "@/studio/guide/wire";
import { WireGuide } from "./WireGuide";

afterEach(cleanup);

const row: WireRow = {
  part: "led",
  supplyVolts: 5,
  note: "Through a resistor",
  caution: "Mind the polarity",
  connections: [{ from: "anode", to: "D13", color: "green" }],
  forLesson: true,
};

describe("WireGuide", () => {
  it("lists a row with the colour named in text", () => {
    const { container } = render(<WireGuide rows={[row]} messages={messages} />);
    const item = container.querySelector("li[data-part='led']") as HTMLElement;
    expect(item.querySelector("details > summary")).toBeTruthy();
    expect(within(item).getByText("5 V supply")).toBeTruthy();
    expect(within(item).getByText("green")).toBeTruthy();
    expect(within(item).getByText("Mind the polarity")).toBeTruthy();
    expect(within(item).getAllByRole("columnheader")).toHaveLength(2);
  });

  it("says when there is nothing to wire", () => {
    render(<WireGuide rows={[]} messages={messages} />);
    expect(screen.getByText("Nothing to wire for this lesson.")).toBeTruthy();
  });
});
