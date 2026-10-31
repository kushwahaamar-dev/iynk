import type { Guide, Parameter, Project } from "../generated/types.ts";
import { buildAssembly, buildLegacyFigure, buildQuizzes } from "./guide.ts";
import type { Translate } from "./text.ts";
import type { ConvertDroneContent, ConvertDroneDesign, ConvertDronePick } from "./types.ts";

export const CRAFT_EXT = "x-iynk-craft";

const PICKS = [
  { name: "batt", table: "batts" },
  { name: "motor", table: "motors" },
  { name: "prop", table: "props" },
] as const satisfies readonly { name: keyof ConvertDronePick; table: keyof ConvertDroneDesign }[];

/** The three design picks as choice parameters. Option labels are the catalogue's literal dropdown text, not translated. */
export function craftParameters(design: ConvertDroneDesign): Parameter[] {
  return PICKS.map(({ name, table }) => {
    const options = Object.entries(design[table]).map(([value, { label }]) => ({ value, label }));
    const value = design.default[name];
    if (!options.some((option) => option.value === value)) {
      throw new Error(`the default ${name} "${value}" is not one of the ${options.length} options`);
    }
    return { id: `par_${name}`, name, kind: "choice", value, options };
  });
}

export function craftGuide(c: ConvertDroneContent, t: Translate): { guide: Guide; ext: NonNullable<Project["ext"]> } {
  const guide: Guide = {
    kind: "craft",
    title: t(c.title),
    sub: t(c.sub),
    hint: t(c.hint),
    overview: t(c.overview),
    assembly: buildAssembly(c.build, t),
    quizzes: buildQuizzes(c.quizzes, t),
    references: c.sources.map(({ title, url }) => ({ title, url })),
    legacyFigure: buildLegacyFigure(c.figure, null),
  };
  return { guide, ext: { [CRAFT_EXT]: { noun: t(c.noun), practice: t(c.practice) } } };
}

export type ThirdPartyItem = NonNullable<Project["provenance"]["thirdParty"]>[number];

/** One entry of the fixture sidecar (`sources.json`); it already uses the schema's `review` words. */
export interface FixtureSource {
  id: string;
  note: string;
  source: ThirdPartyItem["source"];
  review: ThirdPartyItem["review"];
}

export const craftThirdParty = (sources: readonly FixtureSource[]): ThirdPartyItem[] =>
  sources.map(({ id, note, source, review }) => ({ id, kind: "calculator-fixture", what: note, source, review }));
