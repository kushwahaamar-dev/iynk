import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CodeBlock } from "./CodeBlock";

afterEach(() => vi.unstubAllGlobals());

describe("CodeBlock", () => {
  it("copies the code and says so", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    render(<CodeBlock code="let x = 1;" label="Code" copyLabel="Copy" copiedLabel="Copied" />);
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    expect(writeText).toHaveBeenCalledWith("let x = 1;");
    expect(await screen.findByRole("button", { name: "Copied" })).toBeTruthy();
  });
});
