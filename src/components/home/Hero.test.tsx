import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import en from "@/i18n/messages/en/home.json";
import { createTranslator } from "@/i18n/translate";
import { Hero } from "./Hero";

vi.mock("./HeroFigure", () => ({ HeroFigure: () => <div data-testid="figure" /> }));
vi.mock("@/components/shell/dashboard/DashboardProgress", () => ({
  HeroActions: ({ start, browse }: { start: { href: string; label: string }; browse: { href: string; label: string } }) => (
    <div>
      <a href={start.href}>{start.label}</a>
      <a href={browse.href}>{browse.label}</a>
    </div>
  ),
}));

const progress = {
  items: [],
  messages: {},
  progressMessages: {},
  labNames: {},
  overallLabel: "Overall",
} as never;

function renderHero() {
  const t = createTranslator("en", en);
  return render(
    <Hero t={t} counts={{ boards: 21, benches: 8, drones: 3 }} startHref="/en/boards/uno-r3" browseHref="/en/boards" progress={progress} />,
  );
}

test("the heading is two lines split with a br, capped at 680 and gradient", () => {
  renderHero();
  const h1 = screen.getByRole("heading", { level: 1 });
  expect(h1.querySelectorAll("br")).toHaveLength(1);
  expect(h1.textContent).toBe(en.hero.title.replace("\n", ""));
  expect(h1.className).toContain("max-w-[680px]");
  expect(h1.className).toContain("hero-title");
});

test("the primary action appears once and points at the start link", () => {
  renderHero();
  const cta = screen.getAllByText(en.hero.cta);
  expect(cta).toHaveLength(1);
  expect(cta[0].closest("a")?.getAttribute("href")).toBe("/en/boards/uno-r3");
});

test("the proof line fills the three counts and nothing is left unfilled or starred", () => {
  const { container } = renderHero();
  expect(screen.getByText("21 boards, 8 robotics benches and 3 drones, each one runnable.")).toBeTruthy();
  expect(container.textContent).not.toMatch(/[*{}]/);
});
