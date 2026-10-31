import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import english from "@/i18n/messages/en/home.json";
import { createTranslator } from "@/i18n/translate";
import { Faq } from "./Faq";

const t = createTranslator("en", english, "en/home");

test("all eight questions and answers are in the page, not behind a control", () => {
  const { container } = render(<Faq t={t} />);
  expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(8);
  expect(container.querySelectorAll("p")).toHaveLength(8);
  expect(screen.getByText(english.faq["1"].a)).toBeTruthy();
  expect(container.querySelector("details")).toBeNull();
  expect(screen.queryAllByRole("button")).toHaveLength(0);
});

test("one JSON-LD script carries the same questions", () => {
  const { container } = render(<Faq t={t} />);
  const scripts = container.querySelectorAll('script[type="application/ld+json"]');
  expect(scripts).toHaveLength(1);
  const data = JSON.parse(scripts[0].textContent ?? "");
  expect(data["@type"]).toBe("FAQPage");
  expect(data.mainEntity[3].name).toBe(english.faq["4"].q);
});
