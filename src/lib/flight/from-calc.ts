import type { CalcBattery, CalcResult } from "../drone/calc";
import type { CalcOutputs } from "./types";

/** Maps the drone calculator's result for a design onto what the range needs. */
export function fromCalc(r: CalcResult, battery: CalcBattery, overKv = r.over): CalcOutputs {
  return {
    auw: r.auw,
    thrustPerMotor: r.thrust,
    motors: r.n,
    cells: battery.cells,
    mah: battery.mah, // pack capacity (parallel groups already counted in the catalogue)
    hoverThrottle: r.hoverThr,
    hoverAmps: r.hoverA,
    maxAmps: r.maxA,
    chemistry: battery.liion ? "liion" : "lipo",
    overKv,
  };
}
