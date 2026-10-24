// Progress keys (D7). Safe to import from Server Components.

export const progressKey = {
  boardLesson: (board: string, lesson: string) => `board:${board}:lesson:${lesson}`,
  boardAssembly: (board: string) => `board:${board}:assembly`,
  roboticsStep: (bench: string, step: string) => `robotics:${bench}:step:${step}`,
  roboticsTask: (bench: string, task: string) => `robotics:${bench}:task:${task}`,
  roboticsQuiz: (bench: string, quiz: string) => `robotics:${bench}:quiz:${quiz}`,
  droneBuild: (drone: string) => `drone:${drone}:build`,
  droneTest: (drone: string, test: string) => `drone:${drone}:test:${test}`,
  droneQuiz: (drone: string, quiz: string) => `drone:${drone}:quiz:${quiz}`,
  droneCourse: (drone: string, course: string) => `drone:${drone}:course:${course}`,
} as const;

export type ProgressLab = "board" | "robotics" | "drone";

/** Prefixes for count(): everything in a lab, an item, or one kind of entry in an item. */
export const progressPrefix = {
  lab: (lab: ProgressLab) => `${lab}:`,
  item: (lab: ProgressLab, id: string) => `${lab}:${id}:`,
  boardLessons: (board: string) => `board:${board}:lesson:`,
  roboticsSteps: (bench: string) => `robotics:${bench}:step:`,
  roboticsTasks: (bench: string) => `robotics:${bench}:task:`,
  droneTests: (drone: string) => `drone:${drone}:test:`,
  droneCourses: (drone: string) => `drone:${drone}:course:`,
} as const;
