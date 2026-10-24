import type { DesignPick, DesignToCalcInput, DroneDesign } from '@/content/schema';
import { calc, designChecks, type CalcResult, type DesignCheck } from './calc';

/** True when every key of the pick names an option of this craft (use it on URL and stored picks). */
export function isDesignPick(design: DroneDesign, pick: Partial<DesignPick>): pick is DesignPick {
  return (
    typeof pick.batt === 'string' &&
    Object.hasOwn(design.batts, pick.batt) &&
    typeof pick.motor === 'string' &&
    Object.hasOwn(design.motors, pick.motor) &&
    typeof pick.prop === 'string' &&
    Object.hasOwn(design.props, pick.prop)
  );
}

export const designInput: DesignToCalcInput = (design, pick) => {
  if (!isDesignPick(design, pick)) throw new Error(`Unknown design pick ${JSON.stringify(pick)}`);
  return {
    model: design.model,
    fixed: design.fixed,
    battery: design.batts[pick.batt],
    motor: design.motors[pick.motor],
    prop: design.props[pick.prop],
  };
};

/** The calculator result and the design checks for a pick, as the Drone Lab design panel shows them. */
export function evaluateDesign(
  design: DroneDesign,
  pick: DesignPick,
): { result: CalcResult; checks: DesignCheck[] } {
  const input = designInput(design, pick);
  const result = calc(input);
  return { result, checks: designChecks(input, result) };
}
