import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { I18nProvider } from "@/i18n/client";
import common from "@/i18n/messages/en/common.json";
import ErrorPage from "./error";

const renderPage = (error: Error & { digest?: string }, reset = vi.fn()) => {
  render(
    <I18nProvider locale="en" messages={common.client}>
      <ErrorPage error={error} reset={reset} />
    </I18nProvider>,
  );
  return reset;
};

test("retry calls reset and the other way out goes to the language's start", () => {
  const reset = renderPage(new Error("boom"));
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(reset).toHaveBeenCalledOnce();
  expect(screen.getByRole("link", { name: "Back to the start" }).getAttribute("href")).toBe("/en");
});

test("shows the digest as a reference only when there is one", () => {
  renderPage(Object.assign(new Error("boom"), { digest: "abc123" }));
  expect(screen.getByText("Reference: abc123")).toBeTruthy();
});

test("has no reference line without a digest", () => {
  renderPage(new Error("boom"));
  expect(screen.queryByText(/Reference/)).toBeNull();
});
