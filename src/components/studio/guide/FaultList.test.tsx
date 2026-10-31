import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import messages from "@/i18n/messages/en/studio.json";
import type { FaultOffer, FaultOffers } from "@/studio/guide/lesson-faults";
import { FaultList } from "./FaultList";

afterEach(cleanup);

const offer = (failureId: string, title: string): FaultOffer => ({ failureId, faultId: `flt_${failureId}`, causeId: "led-reversed", symptomId: "led-dark", title });
const offers: FaultOffers = {
  own: [offer("led-backwards", "LED backwards")],
  more: [offer("cold-d13", "Cold joint on D13")],
  unmapped: [{ failureId: "no-crystal", title: "No crystal" }],
};

const list = (active: string[] = []) => {
  const onSet = vi.fn();
  render(<FaultList offers={offers} active={active} onSet={onSet} messages={messages} lang="en" />);
  return onSet;
};

describe("FaultList", () => {
  it("breaks a fault that is off", () => {
    const onSet = list();
    fireEvent.click(screen.getAllByRole("button", { name: "Break" })[0]);
    expect(onSet).toHaveBeenCalledWith("flt_led-backwards", true);
  });

  it("repairs a fault that is on", () => {
    const onSet = list(["flt_led-backwards"]);
    expect(screen.getByText("Fault on")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Repair" }));
    expect(onSet).toHaveBeenCalledWith("flt_led-backwards", false);
  });

  it("names an unmapped failure without a button", () => {
    list();
    const row = screen.getByText("Not modelled in Studio yet: No crystal").closest("li")!;
    expect(row.querySelector("button")).toBeNull();
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });
});
