import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "@/i18n/client";
import common from "@/i18n/messages/en/common.json";
import { PageSkeleton, Skeleton, SkeletonGroup } from "./Skeleton";

describe("SkeletonGroup", () => {
  it("is a busy status region that holds the label as text and hides its blocks", () => {
    const { container } = render(
      <SkeletonGroup label="Loading">
        <Skeleton className="h-4" />
        <Skeleton className="h-4" />
      </SkeletonGroup>,
    );
    const group = screen.getByRole("status");
    expect(group.getAttribute("aria-busy")).toBe("true");
    expect(group.textContent).toContain("Loading");
    const blocks = container.querySelectorAll("[aria-hidden='true']");
    expect(blocks).toHaveLength(2);
    expect(blocks[0].className).toContain("motion-reduce:animate-none");
  });
});

describe("PageSkeleton", () => {
  it.each(["list", "workspace", "article"] as const)("announces Loading once for the %s shape", (kind) => {
    render(
      <I18nProvider locale="en" messages={common.client}>
        <PageSkeleton kind={kind} />
      </I18nProvider>,
    );
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.getByRole("status").textContent).toContain("Loading");
  });
});
