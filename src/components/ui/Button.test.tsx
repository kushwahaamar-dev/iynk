import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button, ButtonLink, buttonClass, type ButtonSize } from "./Button";

const classes = (element: HTMLElement) => element.className.split(/\s+/);

describe("Button", () => {
  it("gives each variant its fill and text colour", () => {
    const expected = {
      primary: ["bg-accent", "text-on-accent"],
      secondary: ["bg-sunken", "text-ink"],
      ghost: ["bg-transparent", "text-ink"],
      danger: ["bg-bad-bg", "text-bad"],
      solid: ["bg-ink", "text-paper"],
    } as const;
    for (const [variant, set] of Object.entries(expected)) {
      const { unmount } = render(<Button variant={variant as keyof typeof expected}>Go</Button>);
      for (const name of set) expect(classes(screen.getByRole("button"))).toContain(name);
      unmount();
    }
  });

  it("sets the text size and padding by size", () => {
    const { rerender } = render(<Button size="sm">Go</Button>);
    expect(classes(screen.getByRole("button"))).toEqual(expect.arrayContaining(["text-sm", "py-2", "px-3", "font-semibold", "rounded-lg"]));
    rerender(<Button size="md">Go</Button>);
    expect(classes(screen.getByRole("button"))).toEqual(expect.arrayContaining(["text-base", "py-2", "px-3"]));
  });

  it("is busy and disabled with its label kept", () => {
    render(<Button busy>Saving</Button>);
    const button = screen.getByRole("button", { name: "Saving" });
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(button.hasAttribute("disabled")).toBe(true);
    expect(classes(button)).toContain("aria-busy:animate-pulse");
  });

  it("is not busy by default", () => {
    render(<Button>Go</Button>);
    expect(screen.getByRole("button").hasAttribute("aria-busy")).toBe(false);
  });

  it("draws a rule only for an outlined secondary or ghost button", () => {
    expect(buttonClass("secondary", "md", undefined, { outline: true })).toContain("border-rule");
    expect(buttonClass("ghost", "md", undefined, { outline: true })).toContain("border-rule");
    expect(buttonClass("primary", "md", undefined, { outline: true })).not.toContain("border-rule");
    expect(buttonClass("secondary")).not.toContain("border-rule");
  });

  it("renders a link with the same classes as a button", () => {
    render(<ButtonLink href="/en" variant="primary">Home</ButtonLink>);
    expect(screen.getByRole("link", { name: "Home" }).className).toBe(buttonClass("primary"));
  });

  it("has only the sm and md sizes", () => {
    const sizes: ButtonSize[] = ["sm", "md"];
    // @ts-expect-error lg was dropped
    const dropped: ButtonSize = "lg";
    expect(sizes).toHaveLength(2);
    expect(dropped).toBe("lg");
  });
});
