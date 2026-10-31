/** Scene sizes the engine is held to. HYPOTHESIS: RA-07 measures where stability ends. */
export const ROBOT_LIMITS = { dynamicBodies: 64, colliders: 128, joints: 32, sensors: 64, statics: 256 } as const;

/** Distance in metres a body at `vMaxMps` covers in one step; it tunnels when this is over half the thinner side. */
export function tunnelBound(vMaxMps: number, stepHz: number): number {
  return vMaxMps / stepHz;
}
