import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { StudioMessages } from "@/i18n/namespaces";
import studio from "@/i18n/messages/en/studio.json";
import { StudioLoader } from "./StudioLoader";

vi.mock("next/dynamic", () => ({
  default: (_load: unknown, options: { loading: () => React.ReactNode }) => options.loading,
}));

describe("StudioLoader", () => {
  it("shows a named status while the editor loads", () => {
    render(<StudioLoader messages={{ studio } as StudioMessages} lang="en" />);
    const status = screen.getByRole("status");
    expect(status.textContent).toBe(studio.route.loading);
    expect(status.getAttribute("aria-busy")).toBe("true");
  });
});
