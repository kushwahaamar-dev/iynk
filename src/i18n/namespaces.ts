// UI string namespaces (D5). Each lives in src/i18n/messages/<lang>/<ns>.json,
// and the English file defines the keys every other language must have.

export const NAMESPACES = ["common", "shell", "boardlab", "robotics", "dronelab", "flight", "ai", "search", "together", "hw", "studio"] as const;

export type Namespace = (typeof NAMESPACES)[number];

export type Messages = {
  common: typeof import("./messages/en/common.json");
  shell: typeof import("./messages/en/shell.json");
  boardlab: typeof import("./messages/en/boardlab.json");
  robotics: typeof import("./messages/en/robotics.json");
  dronelab: typeof import("./messages/en/dronelab.json");
  flight: typeof import("./messages/en/flight.json");
  ai: typeof import("./messages/en/ai.json");
  search: typeof import("./messages/en/search.json");
  together: typeof import("./messages/en/together.json");
  hw: typeof import("./messages/en/hw.json");
  studio: typeof import("./messages/en/studio.json");
};

/** The common strings the shell's client components render (FigureFrame and friends). */
export type CommonClientMessages = Messages["common"]["client"];

/** Content prose lives per lab: src/i18n/content/<lang>/<lab>/<id>.json. */
export const CONTENT_LABS = ["boards", "robotics", "drones"] as const;

export type ContentLab = (typeof CONTENT_LABS)[number];
