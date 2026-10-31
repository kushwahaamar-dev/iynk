import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import messages from "@/i18n/messages/en/studio.json";
import { StatusPanel } from "./StatusPanel";

afterEach(cleanup);

const show = (view: Parameters<typeof StatusPanel>[0]["view"]) => render(<StatusPanel view={view} messages={messages} lang="en" />);

describe("StatusPanel", () => {
  it("says it is not available without analog results", () => {
    show({ kind: "unknown", supplyMa: null });
    expect(screen.getByText(messages.lesson.status.unknown)).toBeTruthy();
  });

  it("shows the supply current", () => {
    show({ kind: "ok", supplyMa: 41.3 });
    expect(screen.getByText("Supply current 41.3 mA")).toBeTruthy();
    expect(screen.getByText(messages.lesson.status.ok)).toBeTruthy();
  });

  it("says the board resets on a brown-out", () => {
    show({ kind: "brownout", supplyMa: 120 });
    expect(screen.getByText(messages.lesson.status.brownout)).toBeTruthy();
  });
});
