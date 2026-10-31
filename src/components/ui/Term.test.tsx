import { act, render, screen } from "@testing-library/react";
import { beforeEach, expect, test } from "vitest";
import { I18nProvider } from "@/i18n/client";
import type { Locale } from "@/i18n/config";
import en from "@/i18n/messages/en/common.json";
import hi from "@/i18n/messages/hi/common.json";
import { setSetting } from "@/lib/settings/settings";
import { Term } from "./Term";

function show(locale: Locale, id: Parameters<typeof Term>[0]["id"]) {
  render(
    <I18nProvider locale={locale} messages={(locale === "hi" ? hi : en).client}>
      <p data-testid="p">
        <Term id={id} />
      </p>
    </I18nProvider>,
  );
  return screen.getByTestId("p");
}

beforeEach(() => localStorage.clear());

test("Hindi with the setting on shows both words", () => {
  expect(show("hi", "resistor").textContent).toBe("प्रतिरोधक / resistor");
});

test("turning the setting off leaves the translated word alone", () => {
  const p = show("hi", "resistor");
  act(() => setSetting("englishTerms", false));
  expect(p.textContent).toBe("प्रतिरोधक");
});

test("English renders the plain word", () => {
  expect(show("en", "resistor").textContent).toBe("resistor");
});

test("a word that is the same in both languages shows once", () => {
  expect(show("hi", "mosfet").textContent).toBe("MOSFET");
});
