import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import faults from "@/i18n/messages/en/faults.json";
import parteditor from "@/i18n/messages/en/parteditor.json";
import partinfo from "@/i18n/messages/en/partinfo.json";
import fidelity from "@/i18n/messages/en/fidelity.json";
import instruments from "@/i18n/messages/en/instruments.json";
import studio from "@/i18n/messages/en/studio.json";
import studioCode from "@/i18n/messages/en/studioCode.json";
import studioEdit from "@/i18n/messages/en/studioEdit.json";
import studioHome from "@/i18n/messages/en/studioHome.json";
import studioInspect from "@/i18n/messages/en/studioInspect.json";
import studioModels from "@/i18n/messages/en/studioModels.json";
import studioRun from "@/i18n/messages/en/studioRun.json";
import studioWire from "@/i18n/messages/en/studioWire.json";
import { createAnnouncer } from "@/studio/tools/keyboard";
import { LiveRegion } from "./LiveRegion";

const messages = { studio, studioHome, studioEdit, studioInspect, studioWire, studioCode, studioRun, studioModels, fidelity, instruments, faults, parteditor, partinfo };

function rig() {
  const announcer = createAnnouncer();
  render(<LiveRegion announcer={announcer} messages={messages} lang="en" />);
  return announcer;
}

describe("LiveRegion", () => {
  it("starts with two empty regions", () => {
    rig();
    expect(screen.getByRole("status").textContent).toBe("");
    expect(screen.getByRole("alert").textContent).toBe("");
  });

  it("writes a polite announcement, translated, into the polite region", () => {
    const announcer = rig();
    act(() => announcer.say("studioWire.announce.wireMade", { from: "R1.1", to: "D1.A" }));
    expect(screen.getByRole("status").textContent).toBe("Wire made between R1.1 and D1.A.");
    expect(screen.getByRole("status").getAttribute("aria-live")).toBe("polite");
    expect(screen.getByRole("alert").textContent).toBe("");
  });

  it("writes an assertive announcement into the assertive region", () => {
    const announcer = rig();
    act(() => announcer.say("studioWire.announce.rejected", { message: "No room." }, "assertive"));
    expect(screen.getByRole("alert").textContent).toBe("The change was not made. No room.");
    expect(screen.getByRole("alert").getAttribute("aria-live")).toBe("assertive");
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("keeps the lines in the order they were said", () => {
    const announcer = rig();
    act(() => {
      announcer.say("studioWire.announce.wireMade", { from: "A", to: "B" });
      announcer.say("studioWire.announce.wireMade", { from: "C", to: "D" });
    });
    expect(screen.getByRole("status").textContent).toBe("Wire made between A and B.Wire made between C and D.");
  });
});
