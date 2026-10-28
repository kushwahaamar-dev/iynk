import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { I18nProvider } from "@/i18n/client";
import common from "@/i18n/messages/en/common.json";
import { removeAllKeys, setKey } from "@/lib/keys";
import { UsageMeter } from "./UsageMeter";

const AI = "iynk-canary-KEY-0001-do-not-use";
const meter = common.client.meter;

const ai = (today: number, month: number, cap: number) => ({
  kind: "ai",
  today: { tokens: today, requests: 1 },
  monthTotal: { tokens: month, requests: 1 },
  cap,
});

const renderMeter = (kind: "ai" | "search") =>
  render(
    <I18nProvider locale="en" messages={common.client}>
      <UsageMeter kind={kind} />
    </I18nProvider>,
  );

beforeEach(() => localStorage.clear());
afterEach(() => {
  removeAllKeys();
  localStorage.clear();
  vi.unstubAllGlobals();
});

test("shows today against the cap and the month, with grouped numbers", async () => {
  setKey("ai", AI);
  vi.stubGlobal("fetch", vi.fn(async () => Response.json(ai(12400, 80000, 200000))));
  renderMeter("ai");
  expect(await screen.findByText("12,400 of 200,000")).toBeTruthy();
  expect(screen.getByRole("meter").getAttribute("aria-valuenow")).toBe("12400");
  expect(screen.getByText("This month: 80,000 tokens.")).toBeTruthy();
});

test("a search key shows the month against its cap", async () => {
  setKey("search", AI);
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ kind: "search", today: 3, monthTotal: 41, cap: 200 })));
  renderMeter("search");
  expect(await screen.findByText("41 of 200")).toBeTruthy();
  expect(screen.getByText("Today: 3.")).toBeTruthy();
});

test("the zero state is a full line, not an error", async () => {
  setKey("ai", AI);
  vi.stubGlobal("fetch", vi.fn(async () => Response.json(ai(0, 0, 200000))));
  renderMeter("ai");
  expect(await screen.findByText("0 of 200,000")).toBeTruthy();
  expect(screen.getByText("This month: 0 tokens.")).toBeTruthy();
});

test("a cap of 0 says the server has it switched off", async () => {
  setKey("ai", AI);
  vi.stubGlobal("fetch", vi.fn(async () => Response.json(ai(0, 0, 0))));
  renderMeter("ai");
  expect(await screen.findByText(meter.aiOff)).toBeTruthy();
  expect(screen.queryByRole("meter")).toBeNull();
});

test("no key reads as not available and makes no request", async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  renderMeter("ai");
  expect(await screen.findByText(`${meter.unavailable}. ${meter.noKey}`)).toBeTruthy();
  expect(fetchMock).not.toHaveBeenCalled();
});

test("a module that is off reads as not available", async () => {
  setKey("search", AI);
  vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 501 })));
  renderMeter("search");
  expect(await screen.findByText(`${meter.unavailable}. ${meter.off}`)).toBeTruthy();
});

test("a failure offers Retry, which reads again", async () => {
  setKey("ai", AI);
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(new Response(null, { status: 500 }))
    .mockResolvedValueOnce(Response.json(ai(5, 9, 100)));
  vi.stubGlobal("fetch", fetchMock);
  renderMeter("ai");
  expect(await screen.findByText(meter.failed)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: meter.retry }));
  expect(await screen.findByText("5 of 100")).toBeTruthy();
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

test("saving a key reads the usage again", async () => {
  const fetchMock = vi.fn(async () => Response.json(ai(7, 7, 100)));
  vi.stubGlobal("fetch", fetchMock);
  renderMeter("ai");
  await screen.findByText(meter.noKey, { exact: false });
  act(() => {
    setKey("ai", AI);
  });
  await waitFor(() => expect(screen.getByText("7 of 100")).toBeTruthy());
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test("a slow read shows skeleton lines in a busy status, not a bare pulsing block", async () => {
  setKey("ai", AI);
  vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => {})));
  const { container } = renderMeter("ai");
  const status = await screen.findByRole("status");
  expect(status.getAttribute("aria-busy")).toBe("true");
  expect(status.textContent).toBe(common.client.state.loading);
  expect(container.querySelectorAll(".animate-pulse")).toHaveLength(2);
  expect(container.querySelector(".h-8")).toBeNull();
});
