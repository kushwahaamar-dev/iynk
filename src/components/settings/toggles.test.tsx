import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { I18nProvider } from "@/i18n/client";
import common from "@/i18n/messages/en/common.json";
import { getSettings } from "@/lib/settings/settings";
import { FakeAudioContext } from "@/lib/sound/__fixtures__/fake-audio";
import { SoundToggle } from "./SoundToggle";
import { UsageToggle } from "./UsageToggle";

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("AudioContext", FakeAudioContext);
});

afterEach(() => vi.unstubAllGlobals());

const inEnglish = (ui: React.ReactNode) => render(<I18nProvider locale="en" messages={common.client}>{ui}</I18nProvider>);

test("sound starts off; pressing it turns sound on and plays the cue, pressing again turns it off", () => {
  inEnglish(<SoundToggle />);
  const button = screen.getByRole("button", { name: common.client.sound.label });
  expect(button.getAttribute("aria-pressed")).toBe("false");
  expect(button.title).toBe(common.client.sound.turnOn);

  const made = FakeAudioContext.made.length;
  fireEvent.click(button);
  expect(getSettings().sound).toBe(true);
  expect(button.getAttribute("aria-pressed")).toBe("true");
  expect(FakeAudioContext.made.length).toBe(made + 1);
  const ctx = FakeAudioContext.made.at(-1)!;
  expect(ctx.state).toBe("running");
  expect(ctx.started.length).toBeGreaterThan(0);

  fireEvent.click(button);
  expect(getSettings().sound).toBe(false);
  expect(button.getAttribute("aria-pressed")).toBe("false");
});

test("usage counts are disclosed and on until the learner opts out", () => {
  inEnglish(<UsageToggle />);
  expect(screen.getByText(common.client.usage.body)).toBeTruthy();
  const box = screen.getByRole<HTMLInputElement>("checkbox", { name: common.client.usage.toggle });
  expect(box.checked).toBe(true);
  fireEvent.click(box);
  expect(getSettings().telemetry).toBe(false);
  expect(box.checked).toBe(false);
});
