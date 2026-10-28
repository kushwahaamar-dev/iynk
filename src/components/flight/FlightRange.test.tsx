import { act, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { I18nProvider } from "@/i18n/client";
import en from "@/i18n/messages/en/common.json";
import flight from "@/i18n/messages/en/flight.json";
import quad5 from "@/content/drones/quad5";
import { flightOf, type CalcOutputs, type Course, type FlightEvent, type FlightSession } from "@/lib/flight";
import { FlightRange } from "./FlightRange";

const { craft: quad5Craft, courses } = flightOf(quad5)!;
const bando = courses.find((c) => c.id === "bando")!;
const race = courses.find((c) => c.id === "race")!;

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

function setup(course: Course = bando, extra: Partial<Parameters<typeof FlightRange>[0]> = {}) {
  const events: FlightEvent[] = [];
  let session: FlightSession | null = null;
  render(
    <Providers>
      <FlightRange craft={quad5Craft} course={course} calc={calc} t={flight} onEvent={(e) => events.push(e)} onSession={(s) => (session = s)} {...extra} />
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
  // the bando course scores its checkpoints in every mode, so arming says what to fly
  expect(screen.getByText(`Armed. ${flight.msg.hintRange}`).getAttribute("aria-live")).toBe("polite");
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

test("the craft's own mode names and hints show, and the demo explains itself", () => {
  setup(race, { initialMode: "race", courseText: { modes: { race: "Five-gate race" }, hints: { race: "Manual throttle: the clock runs from gate 1" } } });
  const select = screen.getByLabelText(flight.mode) as HTMLSelectElement;
  expect(select.value).toBe("race");
  expect(screen.getByRole("option", { name: "Five-gate race" })).toBeTruthy();
  expect(screen.getByText("Manual throttle: the clock runs from gate 1")).toBeTruthy();
  fireEvent.change(select, { target: { value: "demo" } });
  expect(screen.getByText(flight.demoHint)).toBeTruthy();
  expect(screen.queryByText(flight.stats.par)).toBeNull();
});

test("a finished lap names its medal, and the demo's lap never counts", () => {
  // the medal times themselves are on the page's course rows; the range names the medal a lap earned
  const { session } = setup(race, { initialMode: "race", par: { gold: 10, silver: 14, bronze: 20 } });
  act(() => session().sim.events.push({ t: 1, type: "lap", time: 12.5, best: true, splits: [] }));
  act(() => session().dispatch({ type: "sticks", sticks: { throttle: 0, yaw: 0, pitch: 0, roll: 0 } }));
  fireEvent.click(screen.getByRole("button", { name: flight.buttons.reset }));
  expect(screen.getByText("Lap 12.50 s, a new best. Silver medal.")).toBeTruthy();
  act(() => session().sim.events.push({ t: 2, type: "lap", time: 9, best: false, splits: [], demo: true }));
  fireEvent.click(screen.getByRole("button", { name: flight.buttons.reset }));
  expect(screen.getByText("Demo done in 9.0 s: the autopilot's time does not count")).toBeTruthy();
});

test("a crash replays in slow motion, says why and fixes the build in one click", async () => {
  const onFix = vi.fn();
  const { session } = setup(bando, { initialMode: "angle", faults: { fcReversed: true }, onFix });
  fireEvent.click(screen.getByRole("button", { name: flight.buttons.arm }));
  // after the loop's first frame, which sends the (idle) keyboard's sticks
  await act(() => new Promise((r) => setTimeout(r, 50)));
  act(() => session().dispatch({ type: "sticks", sticks: { throttle: 0.7, yaw: 0, pitch: 0, roll: 0 } }));
  const why = await screen.findByTestId("crash-why", undefined, { timeout: 4000 });
  expect(why.dataset.cause).toBe("flipFc");
  expect(screen.getByText(/mounted backwards/)).toBeTruthy();
  expect(screen.getByTestId("crash-replay").dataset.playing).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: flight.why.fix.fcReversed }));
  expect(onFix).toHaveBeenCalledWith("fcReversed");
  expect(screen.queryByTestId("crash-why")).toBeNull();
  expect(screen.getByText(`Fixed: ${flight.why.fix.fcReversed}. Arm and fly again`)).toBeTruthy();
});

test("the ghosts: the autopilot's line is on, your best waits for a lap", async () => {
  setup(race, { initialMode: "race" });
  const pace = within(await screen.findByTestId("ghost-pace", undefined, { timeout: 3000 })).getByRole("switch");
  expect(pace.getAttribute("aria-checked")).toBe("true");
  const best = within(screen.getByTestId("ghost-best")).getByRole("switch", { name: flight.ghosts.bestNone });
  expect((best as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(pace);
  expect(pace.getAttribute("aria-checked")).toBe("false");
});
