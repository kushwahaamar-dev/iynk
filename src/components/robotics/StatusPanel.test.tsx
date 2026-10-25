import { render, screen, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import type { FigureState } from "@/content/schema";
import robotics from "@/i18n/messages/en/robotics.json";
import { createTranslator } from "@/i18n/translate";
import { fixtureBench as bench } from "@/lib/robotics/__fixtures__/bench";
import { currentDraw } from "@/lib/robotics/current";
import type { BenchMessages, BenchT } from "./messages";
import { textLookup } from "./messages";
import { LiveStrip, StatusPanel } from "./StatusPanel";

const messages = robotics as unknown as BenchMessages;
const t: BenchT = createTranslator("en", messages, "en/robotics");
const tx = textLookup({
  "status.state": "Status",
  "status.led": "LED",
  "status.rail": "5 V rail",
  "status.draw": "Current",
  "modes.r220": "220 Ω",
  "modes.r1k": "1 kΩ",
  "current.usbc": "USB-C charger, 5 V: 500 mA",
});

function show(figure: FigureState) {
  const draw = currentDraw(bench.current, figure, []);
  render(
    <>
      <LiveStrip bench={bench} figure={figure} draw={draw} t={t} tx={tx} />
      <StatusPanel bench={bench} figure={figure} draw={draw} t={t} tx={tx} headingId="status" />
    </>,
  );
  return {
    strip: document.querySelector("[data-live-strip]") as HTMLElement,
    panel: screen.getByRole("heading", { name: "Live status" }).closest("section") as HTMLElement,
  };
}

describe("StatusPanel", () => {
  test("names the bench's state with the strip's word", () => {
    const { strip, panel } = show({ status: "off" });
    expect(within(strip).getByText("Off")).toBeTruthy();
    expect(within(panel).getByText("Off")).toBeTruthy();
    expect(within(panel).queryByText("Stopped")).toBeNull();
  });

  test("a board held in reset says so, as the figure does", () => {
    const { strip, panel } = show({ status: "reset" });
    expect(within(strip).getByText("In reset")).toBeTruthy();
    expect(within(panel).getByText("In reset")).toBeTruthy();
  });

  test("shows the running program by its title and every rail the figure reports", () => {
    const { panel } = show({ status: "running", mode: "r220", rails: { "5V": 5, VIN: 0 } });
    const program = within(panel).getByText(robotics.modes.pick).parentElement as HTMLElement;
    expect(within(program).getByText("220 Ω")).toBeTruthy();
    const rails = within(panel).getByText(robotics.status.rails).closest("details") as HTMLElement;
    expect(within(rails).getByText("VIN")).toBeTruthy();
    expect(within(rails).getByText("0 V")).toBeTruthy();
    expect(within(rails).getByText("5 V")).toBeTruthy();
  });

  test("names the supply's limit before the headroom", () => {
    const { panel } = show({ status: "running", mode: "r220" });
    expect(within(panel).getByText(/Limit 500 mA ·/)).toBeTruthy();
  });
});
