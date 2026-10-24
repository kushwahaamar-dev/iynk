// The serializable data a Board Lab page hands its client components. Built on
// the server from src/content (one source of truth) and the prose JSON.

import type {
  BoardVariant,
  BuildStep,
  Connector,
  FailureMode,
  FigurePart,
  Language,
  Lesson,
  OnboardControl,
  Wireable,
} from "@/content/schema";

export type BoardModel = {
  id: string;
  /** The board's title in this language (also the upload message's board name). */
  name: string;
  fig: number;
  logicV: number;
  languages: Language[];
  figurePage: string;
  variants: Pick<BoardVariant, "id" | "name" | "figureVariant">[];
  /** Interpreter pin number -> net name, from the pinout. */
  nets: Record<number, string>;
  resetControls: string[];
  /** On-board LEDs by figure part id, for the text readout of the figure. */
  leds: { id: string; label: string }[];
  controls: OnboardControl[];
  parts: FigurePart[];
  failures: FailureMode[];
  wireables: Wireable[];
  assembly: BuildStep[];
  power: { id: string; connector: Connector; volts: number }[];
};

export type LessonLink = { id: string; n: number; level: Lesson["level"]; title: string };

export type LessonModel = {
  board: BoardModel;
  lesson: Lesson;
  /** The lesson code with {{t:}} comments translated and {{p:}} chip slots kept. */
  template: string;
  lessons: LessonLink[];
  prev: LessonLink | null;
  next: LessonLink | null;
};
