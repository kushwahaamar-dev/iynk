import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { I18nProvider } from "@/i18n/client";
import en from "@/i18n/messages/en/common.json";
import flight from "@/i18n/messages/en/flight.json";
import { quad5Course, quad5Craft, type CalcOutputs, type FlightEvent, type FlightSession } from "@/lib/flight";
import { FlightRange } from "./FlightRange";

const calc: CalcOutputs = { auw: 513.6, thrustPerMotor: 1600, motors: 4, cells: 6, mah: 1100, hoverThrottle: Math.sqrt(513.6 / 6400), hoverAmps: 4.29, maxAmps: 144 };

function Providers({ children }: { children: ReactNode }) {
  return (
    <I18nProvider locale="en" messages={en.client}>
      {children}
    </I18nProvider>
  );
}

beforeEach(() => {
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 16) as unknown as number);
  vi.stubGlobal("cancelAnimationFrame", (h: number) => clearTimeout(h));
  vi.stubGlobal("matchMedia", (q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} }));
});
afterEach(() => vi.unstubAllGlobals());

function setup() {
  const events: FlightEvent[] = [];
  let session: FlightSession | null = null;
  render(
    <Providers>
      <FlightRange craft={quad5Craft} course={quad5Course} calc={calc} t={flight} onEvent={(e) => events.push(e)} onSession={(s) => (session = s)} />
    </Providers>,
  );
  return { events, session: () => session as unknown as FlightSession };
}

test("Space arms and disarms, with the message in a live region", () => {
  const { events } = setup();
  const select = screen.getByLabelText(flight.mode);
  fireEvent.keyDown(select.closest("div")!.parentElement!, { code: "Space" });
  expect(events.some((e) => e.type === "armed")).toBe(true);
  expect(screen.getByRole("button", { name: flight.buttons.disarm })).toBeTruthy();
  expect(screen.getByText(`Armed. ${flight.msg.hintAlt}`).getAttribute("aria-live")).toBe("polite");
  fireEvent.click(screen.getByRole("button", { name: flight.buttons.disarm }));
  expect(screen.getByRole("button", { name: flight.buttons.arm })).toBeTruthy();
});

test("arming in a manual mode with the throttle up is refused", () => {
  const { session } = setup();
  fireEvent.change(screen.getByLabelText(flight.mode), { target: { value: "angle" } });
  expect(session().getState().mode).toBe("angle");
  act(() => session().dispatch({ type: "sticks", sticks: { throttle: 0.5, yaw: 0, pitch: 0, roll: 0 } }));
  fireEvent.click(screen.getByRole("button", { name: flight.buttons.arm }));
  expect(screen.getByText(flight.msg.armBlockedThrottle).getAttribute("aria-live")).toBe("polite");
});

test("the keys fly the craft: W climbs in altitude hold", async () => {
  const { session } = setup();
  const wrapper = screen.getByLabelText(flight.mode).closest("div")!.parentElement!;
  fireEvent.keyDown(wrapper, { code: "Space" });
  fireEvent.keyDown(wrapper, { code: "KeyW" });
  await act(() => new Promise((r) => setTimeout(r, 600)));
  fireEvent.keyUp(wrapper, { code: "KeyW" });
  expect(session().sim.p[2]).toBeGreaterThan(0.2);
});

test("FPV and wind are toggle buttons with a fixed name and a pressed state", () => {
  setup();
  const fpv = screen.getByRole("button", { name: flight.buttons.fpv });
  expect(fpv.getAttribute("aria-pressed")).toBe("false");
  fireEvent.click(fpv);
  expect(fpv.getAttribute("aria-pressed")).toBe("true");
  expect(screen.getByText(flight.msg.fpvOn).getAttribute("aria-live")).toBe("polite");
  const wind = screen.getByRole("button", { name: flight.buttons.wind });
  expect(wind.getAttribute("aria-pressed")).toBe("false");
  fireEvent.click(wind);
  expect(wind.getAttribute("aria-pressed")).toBe("true");
});

test("the legend and the gamepad panel open", () => {
  setup();
  fireEvent.click(screen.getByRole("button", { name: flight.buttons.legend }));
  expect(screen.getByRole("heading", { name: flight.legend.title })).toBeTruthy();
  expect(screen.getByText(flight.legend.throttleAlt)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: flight.buttons.gamepad }));
  expect(screen.getByText(flight.gamepad.none)).toBeTruthy();
});

test("a design change while flying waits for the reset", () => {
  const { session } = setup();
  act(() => session().dispatch({ type: "arm" }));
  act(() => session().dispatch({ type: "design", calc: { ...calc, auw: 600 } }));
  expect(screen.getByText(flight.pendingDesign)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: flight.buttons.reset }));
  expect(session().sim.calc.auw).toBe(600);
});
