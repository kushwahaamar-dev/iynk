// @vitest-environment node
// The Convert* types in types.ts copy the fields the converter reads from src/content/schema.ts, because
// src/project cannot import src/content. This file is not portable code: it assigns the content types to the copies,
// so renaming or retyping a field the converter reads fails `npm run typecheck`.
import { describe, expect, it } from "vitest";
import type {
  BenchMode,
  BoardContent,
  BuildStep,
  Check,
  CodeTemplate,
  CurrentModel,
  DroneContent,
  FailureMode,
  Lesson,
  ParamChip,
  PracticeTask,
  Quiz,
  RoboticsContent,
  SerialSpec,
  StatusField,
  WorldModel,
} from "@/content/schema";
import type {
  ConvertBenchMode,
  ConvertBoardContent,
  ConvertBuildStep,
  ConvertCheck,
  ConvertCodeTemplate,
  ConvertCurrentModel,
  ConvertDroneContent,
  ConvertFailureMode,
  ConvertLesson,
  ConvertParamChip,
  ConvertPracticeTask,
  ConvertQuiz,
  ConvertRoboticsContent,
  ConvertSerialSpec,
  ConvertStatusField,
  ConvertWorldModel,
} from "./types.ts";

const _buildStep: ConvertBuildStep = {} as BuildStep;
const _check: ConvertCheck = {} as Check;
const _world: ConvertWorldModel = {} as WorldModel;
const _chip: ConvertParamChip = {} as ParamChip;
const _code: ConvertCodeTemplate = {} as CodeTemplate;
const _serial: ConvertSerialSpec = {} as SerialSpec;
const _quiz: ConvertQuiz = {} as Quiz;
const _lesson: ConvertLesson = {} as Lesson;
const _board: ConvertBoardContent = {} as BoardContent;
const _mode: ConvertBenchMode = {} as BenchMode;
const _failure: ConvertFailureMode = {} as FailureMode;
const _status: ConvertStatusField = {} as StatusField;
const _current: ConvertCurrentModel = {} as CurrentModel;
const _task: ConvertPracticeTask = {} as PracticeTask;
const _robotics: ConvertRoboticsContent = {} as RoboticsContent;
const _drone: ConvertDroneContent = {} as DroneContent;

// @ts-expect-error an empty object is not a lesson, so the Convert types are not `any`
const _notALesson: ConvertLesson = {};

describe("Convert* input types", () => {
  it("accept the content types (checked by tsc)", () => {
    expect([
      _buildStep, _check, _world, _chip, _code, _serial, _quiz, _lesson, _board, _mode, _failure, _status, _current,
      _task, _robotics, _drone, _notALesson,
    ]).toHaveLength(17);
  });
});
