export interface GearParams {
  /** Motor shaft turns per output turn. */
  ratio: number;
  efficiency: number;
  backdrivable: boolean;
  jOutKgM2: number;
}

/**
 * Torque at the output for a given shaft torque. While the motor drives the output the
 * gearbox loses power on the way out; while the output drives the motor, the load has to
 * supply the losses as well.
 */
export function outputTorque(g: GearParams, torqueShaftNm: number, wOutRadS: number): number {
  const backDriven = torqueShaftNm * wOutRadS < 0;
  return backDriven ? (g.ratio * torqueShaftNm) / g.efficiency : g.ratio * g.efficiency * torqueShaftNm;
}

export function reflectedInertia(jRotorKgM2: number, g: GearParams): number {
  return jRotorKgM2 * g.ratio * g.ratio;
}
