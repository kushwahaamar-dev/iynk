import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import en from "@/i18n/messages/en/droneparts.json";
import { createTranslator } from "@/i18n/translate";
import { createPartLibrary } from "@/parts/browser/library";
import type { PartLibrary } from "@/parts/browser/library";
import { createMemoryPartsRepository } from "@/local/parts-store";
import { createRegistry } from "@/parts/registry";
import { rotorOf, SEA_LEVEL_AIR, solveRotor } from "@/sim/flight/propulsion";
import { isOutOfRange } from "@/sim/flight/guards";
import { PartEntryForm } from "./PartEntryForm";

const library = vi.hoisted(() => ({ current: null as Promise<PartLibrary> | null }));

vi.mock("@/parts/browser/library", async (original) => ({
  ...(await original<typeof import("@/parts/browser/library")>()),
  getPartLibrary: () => library.current!,
}));

const t = createTranslator("en", en);

const motor = { kv_rpm_per_v: 2300, ke_vs_per_rad: 60 / (2 * Math.PI * 2300), r_ohm: 0.045, i0_a: 1.2, mass_g: 30 };
const prop = { d_m: 0.127, pitch_m: 0.1, blades: 3, ct0: 0.11, cp0: 0.055, mass_g: 5, hasAdvanceTables: false };
const rotor = rotorOf(motor, prop, SEA_LEVEL_AIR);
if (isOutOfRange(rotor)) throw new Error(rotor.field);
const TABLE = [11.1, 14.8]
  .flatMap((v) =>
    [0.25, 0.4, 0.55, 0.7, 0.85, 1].map((throttle) => {
      const p = solveRotor(rotor, throttle * v * 0.95);
      return [v, throttle, (p.thrust_n / 9.80665e-3).toFixed(1), (throttle * p.current_a).toFixed(2)].join(",");
    }),
  )
  .join("\n");

const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const saveButton = () => screen.getByRole("button", { name: "Save part" }) as HTMLButtonElement;

beforeEach(() => {
  library.current = Promise.resolve(createPartLibrary(createMemoryPartsRepository(), { persistent: false, registry: createRegistry() }));
});

afterEach(cleanup);

describe("PartEntryForm", () => {
  it("keeps Save disabled until the entry is valid", async () => {
    render(<PartEntryForm onSaved={() => {}} t={t} />);
    expect(saveButton().disabled).toBe(true);
    type("Name", "Test 2306");
    type("kv (rpm per volt)", "2300");
    type("Resistance (ohm)", "0.045");
    type("Current with no load (A)", "1.2");
    type("Mass (g)", "30");
    expect(saveButton().disabled).toBe(true);
    type("Source title", "Maker datasheet");
    await waitFor(() => expect(saveButton().disabled).toBe(false));
  });

  it("shows the fit and the band for pasted rows, then saves both parts", async () => {
    const onSaved = vi.fn();
    render(<PartEntryForm onSaved={onSaved} t={t} />);
    type("Name", "Test 2306");
    type("kv (rpm per volt)", "2300");
    type("Resistance (ohm)", "0.045");
    type("Current with no load (A)", "1.2");
    fireEvent.click(screen.getByRole("switch", { name: "Fit a propeller to this motor" }));
    type("Source title", "Maker datasheet");
    const masses = screen.getAllByLabelText("Mass (g)");
    fireEvent.change(masses[0]!, { target: { value: "30" } });
    const names = screen.getAllByLabelText("Name");
    fireEvent.change(names[1]!, { target: { value: "Test 5in" } });
    type("Diameter (in)", "5");
    type("Pitch (in)", "4");
    fireEvent.change(screen.getAllByLabelText("Mass (g)")[1]!, { target: { value: "5" } });
    expect(saveButton().disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Datasheet rows"), { target: { value: TABLE } });

    await waitFor(() => expect(screen.getByText(/Band ±/)).toBeTruthy());
    expect(screen.getByText("12 rows read")).toBeTruthy();
    await waitFor(() => expect(saveButton().disabled).toBe(false));

    fireEvent.click(saveButton());
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(["local.test-2306", "local.test-5in"]));
    const lib = await library.current!;
    expect(lib.get("local.test-5in", "1.0.0")).toBeDefined();
    expect(screen.getByText(/Saved Test 2306, Test 5in/)).toBeTruthy();
  });

  it("names a pasted line that is not a number", async () => {
    render(<PartEntryForm onSaved={() => {}} t={t} />);
    fireEvent.click(screen.getByRole("switch", { name: "Fit a propeller to this motor" }));
    fireEvent.change(screen.getByLabelText("Datasheet rows"), { target: { value: "11.1,0.5,420,6.5\n11.1,half,420,6.5" } });
    await waitFor(() => expect(screen.getByText("Line 2 has a value that is not a number.")).toBeTruthy());
  });

  it("refuses a second save of the same id with other numbers", async () => {
    render(<PartEntryForm onSaved={() => {}} t={t} />);
    fireEvent.click(screen.getByRole("radio", { name: "ESC" }));
    const fill = (current: string) => {
      type("Name", "My ESC");
      type("Continuous current (A)", current);
      type("Mass (g)", "12");
      type("Source title", "Maker datasheet");
    };
    fill("40");
    await waitFor(() => expect(saveButton().disabled).toBe(false));
    fireEvent.click(saveButton());
    await waitFor(() => expect(screen.getByText(/Saved My ESC/)).toBeTruthy());
    fill("45");
    await waitFor(() => expect(saveButton().disabled).toBe(false));
    fireEvent.click(saveButton());
    await waitFor(() => expect(screen.getByText(/already saved with other numbers/)).toBeTruthy());
  });
});
