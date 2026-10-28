import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { I18nProvider } from "@/i18n/client";
import common from "@/i18n/messages/en/common.json";
import { clearLog, logError, readLog } from "@/lib/telemetry";
import { LocalLog } from "./LocalLog";

const CANARY = "iynk-canary-KEY-0001-do-not-use";
const log = common.client.log;

beforeEach(() => {
  localStorage.clear();
  clearLog();
});

afterEach(() => {
  vi.unstubAllGlobals();
  clearLog();
});

const renderLog = () =>
  render(
    <I18nProvider locale="en" messages={common.client}>
      <LocalLog />
    </I18nProvider>,
  );

test("an empty log says so and cannot be cleared", () => {
  renderLog();
  expect(screen.getByText(log.empty)).toBeTruthy();
  expect((screen.getByRole("button", { name: log.clear }) as HTMLButtonElement).disabled).toBe(true);
});

test("lists entries as they arrive and clears them", () => {
  renderLog();
  act(() => logError("window.error", "boom"));
  expect(screen.getByText("window.error")).toBeTruthy();
  expect(screen.getByText("boom")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: log.clear }));
  expect(readLog()).toHaveLength(0);
  expect(screen.getByText(log.empty)).toBeTruthy();
});

test("the copied bug report text has no key even when an error quotes it", async () => {
  localStorage.setItem("iynk:keys:v1", JSON.stringify({ v: 1, ai: { key: CANARY }, search: null, server: null }));
  const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
  renderLog();
  act(() => logError("ai.call", `rejected ${CANARY}`));
  fireEvent.click(screen.getByRole("button", { name: log.copy }));
  expect(await screen.findByText(log.copied)).toBeTruthy();
  const text = writeText.mock.calls[0]?.[0] ?? "";
  expect(text).toContain("rejected [key]");
  expect(text).not.toContain(CANARY);
});

test("when the clipboard is blocked the text is shown for copying by hand", async () => {
  const writeText = vi.fn<(text: string) => Promise<void>>().mockRejectedValue(new Error("denied"));
  vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
  renderLog();
  act(() => logError("x", "y"));
  fireEvent.click(screen.getByRole("button", { name: log.copy }));
  const box = (await screen.findByLabelText(log.manual)) as HTMLTextAreaElement;
  expect(box.value).toContain("error x y");
});
