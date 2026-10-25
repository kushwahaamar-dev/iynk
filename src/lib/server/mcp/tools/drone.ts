import "server-only";
import { z } from "zod";
import { DRONE_IDS, type DroneId } from "@/content/ids";
import type { DesignPick, DroneContent, DroneDesign } from "@/content/schema";
import { checkLevel, verdicts } from "@/lib/drone/calc";
import { evaluateDesign, isDesignPick } from "@/lib/drone/design";
import { loadContent } from "../content";
import { ToolError, defineTool } from "../registry";

export const optionKey = z.string().trim().min(1).max(40);

/** The calculator works in full floating point; answers carry what a person or a model can use. */
const round = (n: number, digits = 2) => Math.round(n * 10 ** digits) / 10 ** digits;

const resultShape = z.object({
  motors: z.number().int(),
  packVolts: z.number(),
  thrustPerMotorG: z.number(),
  allUpWeightG: z.number(),
  thrustToWeight: z.number(),
  hoverThrottle: z.number().describe("Share of full throttle needed to hover (wings: to cruise); above 1 it cannot hover."),
  hoverAmps: z.number(),
  hoverMinutes: z.number(),
  flightMinutes: z.number().describe("Minutes of aggressive flying (VTOL: of cruise)."),
  maxAmps: z.number(),
  costUsd: z.object({ electrical: z.number(), mechanical: z.number(), total: z.number() }),
  cruise: z.object({ speedMs: z.number(), amps: z.number() }).nullable(),
});

export type DronePick = { battery?: string; motor?: string; prop?: string };

/** A drone's design catalogue and a complete pick: the asked options over the craft's defaults. */
export async function droneDesign(drone: DroneId, asked: DronePick): Promise<{ design: DroneDesign; pick: DesignPick }> {
  const content = (await loadContent("drone", drone)) as DroneContent | null;
  if (!content) throw new ToolError("not_found", `The ${drone} design data is not on this deployment yet.`);
  const { design } = content;
  const pick: Partial<DesignPick> = {
    batt: asked.battery ?? design.default.batt,
    motor: asked.motor ?? design.default.motor,
    prop: asked.prop ?? design.default.prop,
  };
  if (isDesignPick(design, pick)) return { design, pick };
  const choices = (record: object) => Object.keys(record).join(", ");
  const unknown = [
    !Object.hasOwn(design.batts, pick.batt ?? "") && `battery "${asked.battery}" (choose from ${choices(design.batts)})`,
    !Object.hasOwn(design.motors, pick.motor ?? "") && `motor "${asked.motor}" (choose from ${choices(design.motors)})`,
    !Object.hasOwn(design.props, pick.prop ?? "") && `prop "${asked.prop}" (choose from ${choices(design.props)})`,
  ].filter(Boolean);
  throw new ToolError("bad_input", `${drone} has no ${unknown.join("; ")}.`);
}

export const droneCalc = defineTool({
  name: "drone_calc",
  title: "Drone design calculator",
  description:
    "Runs iynk's drone design calculator for one craft and one choice of battery, motor and prop: all-up weight, thrust-to-weight, hover throttle and current, hover and flight minutes, full-throttle current, parts cost, and the design problems it finds (over-spinning motors, too little thrust, ESC or battery over-current, prop clash, tail-heavy wings). Leave an option out to keep the craft's default; the answer lists every option key so you can compare builds.",
  input: z.object({
    drone: z.enum(DRONE_IDS).describe("Drone id, e.g. quad5 (5-inch freestyle), whoop, longrange, agrihex, wing, octo."),
    battery: optionKey.optional().describe('Battery option key from get_item or a previous answer, e.g. "6s1100".'),
    motor: optionKey.optional().describe("Motor option key."),
    prop: optionKey.optional().describe("Prop option key."),
  }),
  output: z.object({
    drone: z.string(),
    pick: z.object({ battery: z.string(), motor: z.string(), prop: z.string() }),
    labels: z.object({ battery: z.string(), motor: z.string(), prop: z.string() }),
    result: resultShape,
    verdicts: z.array(z.enum(["over", "weak", "ok"])),
    checks: z.array(
      z.object({ code: z.string(), level: z.enum(["danger", "warn", "info"]), values: z.record(z.string(), z.number()) }),
    ),
    options: z.object({ batteries: z.array(z.string()), motors: z.array(z.string()), props: z.array(z.string()) }),
  }),
  openWorld: false,
  idempotent: true,
  async run({ drone, battery, motor, prop }) {
    const { design, pick } = await droneDesign(drone, { battery, motor, prop });
    const { result: r, checks } = evaluateDesign(design, pick);
    return {
      drone,
      pick: { battery: pick.batt, motor: pick.motor, prop: pick.prop },
      labels: { battery: design.batts[pick.batt].label, motor: design.motors[pick.motor].label, prop: design.props[pick.prop].label },
      result: {
        motors: r.n,
        packVolts: round(r.V),
        thrustPerMotorG: round(r.thrust, 0),
        allUpWeightG: round(r.auw, 0),
        thrustToWeight: round(r.tw),
        hoverThrottle: round(r.hoverThr, 3),
        hoverAmps: round(r.hoverA, 1),
        hoverMinutes: round(r.hoverMin, 1),
        flightMinutes: round(r.flyMin, 1),
        maxAmps: round(r.maxA, 1),
        costUsd: { electrical: round(r.cost.electrical), mechanical: round(r.cost.mechanical), total: round(r.cost.total) },
        cruise: r.cruise ? { speedMs: round(r.cruise.speed, 1), amps: round(r.cruise.amps, 1) } : null,
      },
      verdicts: verdicts(r),
      checks: checks.map(({ code, ...values }) => ({
        code,
        level: checkLevel[code],
        values: Object.fromEntries(Object.entries(values as Record<string, number>).map(([k, v]) => [k, round(v)])),
      })),
      options: { batteries: Object.keys(design.batts), motors: Object.keys(design.motors), props: Object.keys(design.props) },
    };
  },
});
