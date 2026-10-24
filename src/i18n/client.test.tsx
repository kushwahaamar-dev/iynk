import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { I18nProvider, useCommonT, useLocale, useT } from "./client";
import hi from "./messages/hi/common.json";

const strings = { lesson: { count: "{done}/{total}" }, plural: { one: "{count} पाठ", other: "{count} पाठ" } };

function Probe() {
  const locale = useLocale();
  const common = useCommonT();
  const t = useT(strings);
  return (
    <p data-testid="probe">
      {locale} | {common("figure.loading")} | {t("lesson.count", { done: 3, total: 16 })} | {t("plural", { count: 2 })}
    </p>
  );
}

test("the provider gives client components the page language and its common strings", () => {
  render(
    <I18nProvider locale="hi" messages={hi.client}>
      <Probe />
    </I18nProvider>,
  );
  expect(screen.getByTestId("probe").textContent).toBe(`hi | ${hi.client.figure.loading} | 3/16 | 2 पाठ`);
});

test("using the hooks outside the layout is a clear error", () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  expect(() => render(<Probe />)).toThrow(/I18nProvider/);
});
