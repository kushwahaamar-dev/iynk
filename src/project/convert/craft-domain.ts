import type { IynkDroneDomainData } from "../generated/types.ts";
import type { ConvertDroneContent } from "./types.ts";

/** The neutral air of the `drone-quad` example: still, sea level, no sensor failures. */
const neutralEnvironment = (): IynkDroneDomainData["environment"] => ({
  temperature_degC: 15,
  altitude_msl_m: 0,
  pressure_pa: 101325,
  wind: { mean_mps: [0, 0, 0], gust: { kind: "none", sigma_mps: 0, tau_s: 1 } },
  sensorFailures: [],
});

/** A pointer to the craft in `src/content/drones`: the catalogue, wiring, tests and courses stay there. */
export function craftDomain(c: ConvertDroneContent): { schemaVersion: "1.0"; data: IynkDroneDomainData } {
  const course = c.courses[0];
  if (course === undefined) throw new Error(`drone/${c.id} has no course`);
  return {
    schemaVersion: "1.0",
    data: {
      kind: "legacy-craft",
      legacy: { contentId: c.id, calcModelId: "legacy-calc@1", flightModelId: "flight-game@1" },
      thrustSource: "legacy-calc",
      flight: { model: "flight-game@1" },
      environment: neutralEnvironment(),
      course: { builtin: course.id },
      bench: { propsOff: true },
    },
  };
}
