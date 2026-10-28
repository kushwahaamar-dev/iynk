import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyState } from "./EmptyState";
import { InlineStatus } from "./InlineStatus";

describe("EmptyState", () => {
  it("shows the icon, title, body and action without announcing itself", () => {
    const { container } = render(
      <EmptyState title="Nothing here yet" action={<button type="button">Start</button>}>
        Add a part to begin.
      </EmptyState>,
    );
    expect(container.querySelector("svg")).not.toBeNull();
    expect(screen.getByText("Nothing here yet")).not.toBeNull();
    expect(screen.getByText("Add a part to begin.")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Start" })).not.toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("draws a dashed box only when asked", () => {
    const { container, rerender } = render(<EmptyState title="Empty" />);
    expect(container.firstElementChild?.className).not.toContain("border-dashed");
    rerender(<EmptyState title="Empty" bordered />);
    expect(container.firstElementChild?.className).toContain("border-dashed");
  });
});

describe("InlineStatus", () => {
  it("has no role unless live", () => {
    render(<InlineStatus tone="good">Saved to blink.iynk</InlineStatus>);
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("uses status when live and alert only for a live bad tone", () => {
    const { rerender } = render(
      <InlineStatus tone="warn" live>
        Slow connection
      </InlineStatus>,
    );
    expect(screen.getByRole("status").textContent).toContain("Slow connection");
    rerender(
      <InlineStatus tone="bad" live>
        Upload failed. The file is over 20 MB.
      </InlineStatus>,
    );
    expect(screen.getByRole("alert").textContent).toContain("Upload failed");
    rerender(<InlineStatus tone="bad">Upload failed.</InlineStatus>);
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
